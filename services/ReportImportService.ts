import Papa from 'papaparse';
import { CSVParseResult, NormalizedCSVRow } from '@/types/reports';
import prisma from '@/db/prisma';
import { safeDivide } from '@/lib/utils';

export class ReportImportService {
  /**
   * Column mappings supporting English and Portuguese Amazon Ads report exports
   */
  private columnAliases: Record<string, string[]> = {
    date: ['date', 'data', 'day', 'dia', 'start date', 'data de início'],
    campaignName: ['campaign name', 'nome da campanha', 'campaign', 'campanha'],
    campaignId: ['campaign id', 'id da campanha', 'campaignid'],
    impressions: ['impressions', 'impressões', 'impressoes'],
    clicks: ['clicks', 'cliques'],
    spend: ['spend', 'gasto', 'gastos', 'custo', 'cost', 'total spend', 'gasto total'],
    sales: [
      'sales',
      'vendas',
      '7 day total sales',
      '14 day total sales',
      'vendas totais em 7 dias',
      'vendas totais em 14 dias',
      'attributed sales',
    ],
    orders: [
      'orders',
      'pedidos',
      '7 day total orders',
      '14 day total orders',
      'pedidos totais em 7 dias',
      'pedidos totais em 14 dias',
      'units',
      'unidades',
    ],
    asin: ['asin', 'advertised asin', 'asin anunciado', 'purchased asin'],
    sku: ['sku', 'advertised sku', 'sku anunciado'],
  };

  /**
   * Helper to clean currency and number strings (e.g. "R$ 1.250,50", "$1,250.50", "15.4%")
   */
  public parseNumeric(value: any): number {
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    if (!value || typeof value !== 'string') return 0;

    let clean = value.trim().replace(/[R$\s%]/g, '');

    // Check last occurrence of comma vs dot
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');

    if (lastComma > -1 && lastDot > -1) {
      if (lastComma > lastDot) {
        // Brazilian format: 1.250,50 -> remove dots, replace comma with dot
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else {
        // US format: 1,250.50 -> remove commas
        clean = clean.replace(/,/g, '');
      }
    } else if (lastComma > -1) {
      // Single comma: 1250,50 -> 1250.50
      clean = clean.replace(',', '.');
    }

    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Helper to parse varied date formats safely across timezones
   */
  public parseDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) return value;

    const str = String(value).trim();
    if (!str) return null;

    // Format YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      const d = new Date(year, month, day, 12, 0, 0);
      return isNaN(d.getTime()) ? null : d;
    }

    // Format DD/MM/YYYY or DD-MM-YYYY
    const brMatch = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (brMatch) {
      const day = parseInt(brMatch[1], 10);
      const month = parseInt(brMatch[2], 10) - 1;
      const year = parseInt(brMatch[3], 10);
      const d = new Date(year, month, day, 12, 0, 0);
      return isNaN(d.getTime()) ? null : d;
    }

    // Fallback native Date parse
    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  /**
   * Identifies column headers from raw CSV headers
   */
  public identifyColumns(headers: string[]): Record<string, string> {
    const detected: Record<string, string> = {};
    const normalizedHeaders = headers.map((h) => ({
      original: h,
      clean: h.toLowerCase().trim(),
    }));

    for (const [field, aliases] of Object.entries(this.columnAliases)) {
      for (const alias of aliases) {
        const found = normalizedHeaders.find((h) => h.clean === alias || h.clean.includes(alias));
        if (found && !detected[field]) {
          detected[field] = found.original;
          break;
        }
      }
    }

    return detected;
  }

  /**
   * Parses CSV string and normalizes rows
   */
  public parseCSV(csvContent: string, fileName: string = 'relatorio.csv'): CSVParseResult {
    const parseResult = Papa.parse<Record<string, any>>(csvContent, {
      header: true,
      skipEmptyLines: 'greedy',
    });

    if (parseResult.errors.length > 0 && (!parseResult.data || parseResult.data.length === 0)) {
      return {
        success: false,
        fileName,
        totalRows: 0,
        validRows: [],
        invalidRowsCount: 0,
        errors: parseResult.errors.map((e) => `Linha ${e.row}: ${e.message}`),
        detectedColumns: {},
      };
    }

    const headers = parseResult.meta.fields || [];
    const detectedColumns = this.identifyColumns(headers);

    if (!detectedColumns.campaignName && !detectedColumns.asin) {
      return {
        success: false,
        fileName,
        totalRows: parseResult.data.length,
        validRows: [],
        invalidRowsCount: parseResult.data.length,
        errors: [
          'Formato de arquivo não reconhecido. Certifique-se de importar um relatório oficial do Amazon Ads contendo a coluna "Campaign Name" / "Nome da campanha".',
        ],
        detectedColumns,
      };
    }

    const validRows: NormalizedCSVRow[] = [];
    const errors: string[] = [];
    let minDate: Date | undefined;
    let maxDate: Date | undefined;

    parseResult.data.forEach((row, index) => {
      try {
        const campaignName = detectedColumns.campaignName
          ? String(row[detectedColumns.campaignName] || '').trim()
          : '';
        const campaignId = detectedColumns.campaignId
          ? String(row[detectedColumns.campaignId] || '').trim()
          : undefined;

        if (!campaignName) {
          // Row might be a summary row or empty line
          return;
        }

        const rawDate = detectedColumns.date ? row[detectedColumns.date] : null;
        const parsedDate = this.parseDate(rawDate) || new Date();

        if (!minDate || parsedDate < minDate) minDate = parsedDate;
        if (!maxDate || parsedDate > maxDate) maxDate = parsedDate;

        const impressions = Math.round(
          this.parseNumeric(detectedColumns.impressions ? row[detectedColumns.impressions] : 0)
        );
        const clicks = Math.round(
          this.parseNumeric(detectedColumns.clicks ? row[detectedColumns.clicks] : 0)
        );
        const spend = this.parseNumeric(detectedColumns.spend ? row[detectedColumns.spend] : 0);
        const sales = this.parseNumeric(detectedColumns.sales ? row[detectedColumns.sales] : 0);
        const orders = Math.round(
          this.parseNumeric(detectedColumns.orders ? row[detectedColumns.orders] : 0)
        );

        const asin = detectedColumns.asin ? String(row[detectedColumns.asin] || '').trim() : undefined;
        const sku = detectedColumns.sku ? String(row[detectedColumns.sku] || '').trim() : undefined;

        validRows.push({
          date: parsedDate,
          campaignName,
          campaignId,
          impressions,
          clicks,
          spend,
          sales,
          orders,
          asin,
          sku,
        });
      } catch (err: any) {
        errors.push(`Erro na linha ${index + 2}: ${err.message}`);
      }
    });

    return {
      success: validRows.length > 0,
      fileName,
      totalRows: parseResult.data.length,
      validRows,
      invalidRowsCount: parseResult.data.length - validRows.length,
      errors: errors.slice(0, 10), // Limit error array to 10
      detectedColumns,
      startDate: minDate,
      endDate: maxDate,
    };
  }

  /**
   * Persists normalized CSV data into PostgreSQL linked to user and Amazon account
   */
  public async saveReportToDatabase(
    userId: string,
    accountId: string,
    parsed: CSVParseResult
  ): Promise<string> {
    // 1. Create the ImportedReport record
    const report = await prisma.importedReport.create({
      data: {
        userId,
        accountId,
        fileName: parsed.fileName,
        reportType: 'CAMPAIGN',
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        rowCount: parsed.validRows.length,
        status: 'COMPLETED',
      },
    });

    // 2. Group rows by campaign and date to avoid duplicates in the same CSV
    const rowsMap = new Map<string, NormalizedCSVRow>();
    for (const row of parsed.validRows) {
      const dateKey = row.date.toISOString().split('T')[0];
      const key = `${row.campaignName.toLowerCase()}___${dateKey}`;
      if (rowsMap.has(key)) {
        // Aggregate if multiple lines exist for the same campaign on the same date
        const existing = rowsMap.get(key)!;
        existing.impressions += row.impressions;
        existing.clicks += row.clicks;
        existing.spend += row.spend;
        existing.sales += row.sales;
        existing.orders += row.orders;
      } else {
        rowsMap.set(key, { ...row });
      }
    }

    // 3. Upsert Campaigns and CampaignMetrics
    for (const row of Array.from(rowsMap.values())) {
      // Find or create campaign
      let campaign = await prisma.campaign.findFirst({
        where: {
          accountId,
          name: row.campaignName,
        },
      });

      if (!campaign) {
        campaign = await prisma.campaign.create({
          data: {
            accountId,
            name: row.campaignName,
            amazonCampaignId: row.campaignId || null,
            campaignType: 'SPONSORED_PRODUCTS',
            status: 'ENABLED',
            isDemo: false,
          },
        });
      }

      const cpc = safeDivide(row.spend, row.clicks);
      const acos = safeDivide(row.spend, row.sales) * 100;
      const roas = safeDivide(row.sales, row.spend);
      const ctr = safeDivide(row.clicks, row.impressions) * 100;
      const conversionRate = safeDivide(row.orders, row.clicks) * 100;

      // Upsert metric per date and campaign
      await prisma.campaignMetric.upsert({
        where: {
          campaignId_date: {
            campaignId: campaign.id,
            date: row.date,
          },
        },
        create: {
          campaignId: campaign.id,
          reportId: report.id,
          date: row.date,
          impressions: row.impressions,
          clicks: row.clicks,
          spend: row.spend,
          sales: row.sales,
          orders: row.orders,
          cpc,
          acos,
          roas,
          ctr,
          conversionRate,
        },
        update: {
          impressions: row.impressions,
          clicks: row.clicks,
          spend: row.spend,
          sales: row.sales,
          orders: row.orders,
          cpc,
          acos,
          roas,
          ctr,
          conversionRate,
          reportId: report.id,
        },
      });

      // If product ASIN is provided, also upsert Product & ProductMetric
      if (row.asin) {
        let product = await prisma.product.findUnique({
          where: {
            accountId_asin: {
              accountId,
              asin: row.asin,
            },
          },
        });

        if (!product) {
          product = await prisma.product.create({
            data: {
              accountId,
              asin: row.asin,
              sku: row.sku || null,
              title: `Produto ${row.asin}`,
            },
          });
        }

        await prisma.productMetric.upsert({
          where: {
            productId_date: {
              productId: product.id,
              date: row.date,
            },
          },
          create: {
            productId: product.id,
            date: row.date,
            impressions: row.impressions,
            clicks: row.clicks,
            spend: row.spend,
            sales: row.sales,
            orders: row.orders,
            cpc,
            acos,
            roas,
            reportId: report.id,
          },
          update: {
            impressions: row.impressions,
            clicks: row.clicks,
            spend: row.spend,
            sales: row.sales,
            orders: row.orders,
            cpc,
            acos,
            roas,
            reportId: report.id,
          },
        });
      }
    }

    return report.id;
  }
}

export const reportImportService = new ReportImportService();
export default reportImportService;
