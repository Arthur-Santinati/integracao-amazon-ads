import prisma from '@/db/prisma';
import reportImportService from './ReportImportService';
import {
  CampaignRow,
  DailyChartPoint,
  DashboardMetrics,
  MetricComparison,
  ProductRow,
  WasteAnalysisItem,
} from '@/types/analytics';
import { safeDivide } from '@/lib/utils';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

export class AnalyticsService {
  /**
   * Helper to compute aggregate metrics from a list of metric rows
   */
  public computeMetrics(
    rows: Array<{
      spend: number;
      sales: number;
      impressions: number;
      clicks: number;
      orders: number;
      units?: number;
    }>
  ): DashboardMetrics {
    const totalSpend = rows.reduce((acc, r) => acc + (r.spend || 0), 0);
    const totalSales = rows.reduce((acc, r) => acc + (r.sales || 0), 0);
    const totalImpressions = rows.reduce((acc, r) => acc + (r.impressions || 0), 0);
    const totalClicks = rows.reduce((acc, r) => acc + (r.clicks || 0), 0);
    const totalOrders = rows.reduce((acc, r) => acc + (r.orders || 0), 0);
    const totalUnits = rows.reduce((acc, r) => acc + (r.units || r.orders || 0), 0);

    const cpc = safeDivide(totalSpend, totalClicks);
    const acos = safeDivide(totalSpend, totalSales) * 100;
    const roas = safeDivide(totalSales, totalSpend);
    const ctr = safeDivide(totalClicks, totalImpressions) * 100;
    const conversionRate = safeDivide(totalOrders, totalClicks) * 100;

    return {
      spend: Number(totalSpend.toFixed(2)),
      sales: Number(totalSales.toFixed(2)),
      acos: Number(acos.toFixed(2)),
      roas: Number(roas.toFixed(2)),
      impressions: totalImpressions,
      clicks: totalClicks,
      orders: totalOrders,
      units: totalUnits,
      cpc: Number(cpc.toFixed(2)),
      ctr: Number(ctr.toFixed(2)),
      conversionRate: Number(conversionRate.toFixed(2)),
    };
  }

  /**
   * Calculates metrics for a specific date range
   */
  public async getDashboardMetrics(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<DashboardMetrics> {
    const whereClause: any = {
      campaign: { accountId },
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = startOfDay(startDate);
      if (endDate) whereClause.date.lte = endOfDay(endDate);
    }

    try {
      const rows = await prisma.campaignMetric.findMany({
        where: whereClause,
        select: {
          spend: true,
          sales: true,
          impressions: true,
          clicks: true,
          orders: true,
          units: true,
        },
      });

      if (rows.length > 0) {
        return this.computeMetrics(rows);
      }
    } catch (err: any) {
      console.warn('[AnalyticsService] Banco indisponível:', err.message);
    }

    const inMem = reportImportService.getInMemoryRows(accountId);
    if (inMem.length > 0) {
      let filtered = inMem;
      if (startDate) filtered = filtered.filter((r) => r.date >= startOfDay(startDate));
      if (endDate) filtered = filtered.filter((r) => r.date <= endOfDay(endDate));
      if (filtered.length === 0) filtered = inMem;
      return this.computeMetrics(filtered);
    }

    return this.computeMetrics([]);
  }

  /**
   * Computes comparison between current period and previous period
   * (e.g., last 7 days vs previous 7 days)
   */
  public async getMetricComparison(
    accountId: string,
    days: number = 7
  ): Promise<MetricComparison> {
    const now = new Date();
    const currentStart = startOfDay(subDays(now, days - 1));
    const currentEnd = endOfDay(now);

    const prevStart = startOfDay(subDays(currentStart, days));
    const prevEnd = endOfDay(subDays(currentStart, 1));

    const [current, previous] = await Promise.all([
      this.getDashboardMetrics(accountId, currentStart, currentEnd),
      this.getDashboardMetrics(accountId, prevStart, prevEnd),
    ]);

    const calcDelta = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Number((((curr - prev) / prev) * 100).toFixed(1));
    };

    return {
      current,
      previous,
      percentageChanges: {
        spend: calcDelta(current.spend, previous.spend),
        sales: calcDelta(current.sales, previous.sales),
        acos: calcDelta(current.acos, previous.acos),
        roas: calcDelta(current.roas, previous.roas),
        impressions: calcDelta(current.impressions, previous.impressions),
        clicks: calcDelta(current.clicks, previous.clicks),
        orders: calcDelta(current.orders, previous.orders),
        cpc: calcDelta(current.cpc, previous.cpc),
      },
    };
  }

  /**
   * Returns daily data points for charts (Spend, Sales, ACOS, ROAS)
   */
  public async getDailyChartPoints(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<DailyChartPoint[]> {
    const whereClause: any = {
      campaign: { accountId },
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = startOfDay(startDate);
      if (endDate) whereClause.date.lte = endOfDay(endDate);
    }

    try {
      const rows = await prisma.campaignMetric.findMany({
        where: whereClause,
        orderBy: { date: 'asc' },
        select: {
          date: true,
          spend: true,
          sales: true,
          orders: true,
          clicks: true,
          impressions: true,
        },
      });

      if (rows.length > 0) {
        const map = new Map<string, { spend: number; sales: number; orders: number; clicks: number; impressions: number }>();

        for (const r of rows) {
          const key = format(r.date, 'yyyy-MM-dd');
          const cur = map.get(key) || { spend: 0, sales: 0, orders: 0, clicks: 0, impressions: 0 };
          cur.spend += r.spend;
          cur.sales += r.sales;
          cur.orders += r.orders;
          cur.clicks += r.clicks;
          cur.impressions += r.impressions;
          map.set(key, cur);
        }

        const result: DailyChartPoint[] = [];
        for (const [dateStr, vals] of Array.from(map.entries()).sort()) {
          const acos = safeDivide(vals.spend, vals.sales) * 100;
          const roas = safeDivide(vals.sales, vals.spend);

          result.push({
            date: dateStr,
            spend: Number(vals.spend.toFixed(2)),
            sales: Number(vals.sales.toFixed(2)),
            acos: Number(acos.toFixed(2)),
            roas: Number(roas.toFixed(2)),
            orders: vals.orders,
            clicks: vals.clicks,
            impressions: vals.impressions,
          });
        }

        return result;
      }
    } catch {
      // fallback to in-memory below
    }

    const inMem = reportImportService.getInMemoryRows(accountId);
    if (inMem.length > 0) {
      const map = new Map<string, { spend: number; sales: number; orders: number; clicks: number; impressions: number }>();
      for (const r of inMem) {
        const key = format(r.date, 'yyyy-MM-dd');
        const cur = map.get(key) || { spend: 0, sales: 0, orders: 0, clicks: 0, impressions: 0 };
        cur.spend += r.spend;
        cur.sales += r.sales;
        cur.orders += r.orders;
        cur.clicks += r.clicks;
        cur.impressions += r.impressions;
        map.set(key, cur);
      }

      const result: DailyChartPoint[] = [];
      for (const [dateStr, vals] of Array.from(map.entries()).sort()) {
        const acos = safeDivide(vals.spend, vals.sales) * 100;
        const roas = safeDivide(vals.sales, vals.spend);

        result.push({
          date: dateStr,
          spend: Number(vals.spend.toFixed(2)),
          sales: Number(vals.sales.toFixed(2)),
          acos: Number(acos.toFixed(2)),
          roas: Number(roas.toFixed(2)),
          orders: vals.orders,
          clicks: vals.clicks,
          impressions: vals.impressions,
        });
      }

      return result;
    }

    return [];
  }

  /**
   * Returns campaign table data with aggregated metrics
   */
  public async getCampaignRows(
    accountId: string,
    filters?: { search?: string; status?: string; startDate?: Date; endDate?: Date }
  ): Promise<CampaignRow[]> {
    try {
      const whereCampaign: any = { accountId };
      if (filters?.search) {
        whereCampaign.name = { contains: filters.search, mode: 'insensitive' };
      }
      if (filters?.status && filters.status !== 'ALL') {
        whereCampaign.status = filters.status;
      }

      const campaigns = await prisma.campaign.findMany({
        where: whereCampaign,
        include: {
          metrics: {
            where:
              filters?.startDate || filters?.endDate
                ? {
                    date: {
                      ...(filters.startDate ? { gte: startOfDay(filters.startDate) } : {}),
                      ...(filters.endDate ? { lte: endOfDay(filters.endDate) } : {}),
                    },
                  }
                : undefined,
          },
        },
        orderBy: { name: 'asc' },
      });

      if (campaigns.length > 0) {
        return campaigns.map((c) => {
          const metrics = this.computeMetrics(c.metrics);
          return {
            id: c.id,
            amazonCampaignId: c.amazonCampaignId,
            name: c.name,
            status: c.status,
            campaignType: c.campaignType,
            spend: metrics.spend,
            sales: metrics.sales,
            acos: metrics.acos,
            roas: metrics.roas,
            impressions: metrics.impressions,
            clicks: metrics.clicks,
            orders: metrics.orders,
            cpc: metrics.cpc,
            ctr: metrics.ctr,
            dailyBudget: c.dailyBudget,
            isDemo: c.isDemo,
          };
        });
      }
    } catch {
      // fallback to in-memory below
    }

    const inMem = reportImportService.getInMemoryRows(accountId);
    if (inMem.length > 0) {
      const campMap = new Map<string, any[]>();
      for (const r of inMem) {
        const list = campMap.get(r.campaignName) || [];
        list.push(r);
        campMap.set(r.campaignName, list);
      }

      const rows: CampaignRow[] = [];
      for (const [name, rowsForCamp] of Array.from(campMap.entries())) {
        if (filters?.search && !name.toLowerCase().includes(filters.search.toLowerCase())) {
          continue;
        }
        const m = this.computeMetrics(rowsForCamp);
        rows.push({
          id: rowsForCamp[0].campaignId || 'camp-' + name,
          amazonCampaignId: rowsForCamp[0].campaignId,
          name,
          status: 'ENABLED',
          campaignType: 'SPONSORED_PRODUCTS',
          spend: m.spend,
          sales: m.sales,
          acos: m.acos,
          roas: m.roas,
          impressions: m.impressions,
          clicks: m.clicks,
          orders: m.orders,
          cpc: m.cpc,
          ctr: m.ctr,
          dailyBudget: undefined,
          isDemo: false,
        });
      }
      return rows;
    }

    return [];
  }

  /**
   * Returns product rows with aggregated metrics
   */
  public async getProductRows(
    accountId: string,
    filters?: { search?: string; startDate?: Date; endDate?: Date }
  ): Promise<ProductRow[]> {
    try {
      const whereProduct: any = { accountId };
      if (filters?.search) {
        whereProduct.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { asin: { contains: filters.search, mode: 'insensitive' } },
          { sku: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const products = await prisma.product.findMany({
        where: whereProduct,
        include: {
          metrics: {
            where:
              filters?.startDate || filters?.endDate
                ? {
                    date: {
                      ...(filters.startDate ? { gte: startOfDay(filters.startDate) } : {}),
                      ...(filters.endDate ? { lte: endOfDay(filters.endDate) } : {}),
                    },
                  }
                : undefined,
          },
        },
      });

      return products.map((p) => {
        const totalSpend = p.metrics.reduce((acc, m) => acc + m.spend, 0);
        const totalSales = p.metrics.reduce((acc, m) => acc + m.sales, 0);
        const totalClicks = p.metrics.reduce((acc, m) => acc + m.clicks, 0);
        const totalImpressions = p.metrics.reduce((acc, m) => acc + m.impressions, 0);
        const totalOrders = p.metrics.reduce((acc, m) => acc + m.orders, 0);

        const acos = safeDivide(totalSpend, totalSales) * 100;
        const roas = safeDivide(totalSales, totalSpend);
        const cpc = safeDivide(totalSpend, totalClicks);

        return {
          id: p.id,
          asin: p.asin,
          sku: p.sku,
          title: p.title,
          imageUrl: p.imageUrl,
          price: p.price,
          spend: Number(totalSpend.toFixed(2)),
          sales: Number(totalSales.toFixed(2)),
          acos: Number(acos.toFixed(2)),
          roas: Number(roas.toFixed(2)),
          orders: totalOrders,
          clicks: totalClicks,
          impressions: totalImpressions,
          cpc: Number(cpc.toFixed(2)),
          isDemo: p.isDemo,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Analyzes spend waste (campaigns spending without sales or with very high ACOS)
   */
  public async getWasteAnalysis(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<WasteAnalysisItem[]> {
    const campaigns = await this.getCampaignRows(accountId, { startDate, endDate });
    const wasteItems: WasteAnalysisItem[] = [];

    for (const c of campaigns) {
      if (c.spend > 25 && c.sales === 0) {
        wasteItems.push({
          campaignId: c.id,
          campaignName: c.name,
          spend: c.spend,
          clicks: c.clicks,
          sales: 0,
          reason: `Gastou ${c.spend} com ${c.clicks} cliques e gerou 0 vendas.`,
        });
      } else if (c.spend > 50 && c.acos > 80) {
        wasteItems.push({
          campaignId: c.id,
          campaignName: c.name,
          spend: c.spend,
          clicks: c.clicks,
          sales: c.sales,
          reason: `ACOS crítico de ${c.acos}% (gasto de ${c.spend} para vendas de ${c.sales}).`,
        });
      }
    }

    return wasteItems.sort((a, b) => b.spend - a.spend);
  }

  /**
   * Seeds a realistic Amazon Ads demonstration dataset (clearly flagged as DEMO)
   */
  public async seedDemoData(userId: string): Promise<string> {
    // 1. Find or create demo account
    let demoAccount = await prisma.amazonAccount.findFirst({
      where: { userId, isDemo: true },
    });

    if (!demoAccount) {
      demoAccount = await prisma.amazonAccount.create({
        data: {
          userId,
          accountName: 'Loja Exemplo Tech & Audio [DEMO]',
          marketplaceId: 'A2Q3Y263D00KWC',
          region: 'NA',
          currency: 'BRL',
          timezone: 'America/Sao_Paulo',
          isDemo: true,
          status: 'CONNECTED',
        },
      });
    }

    // Clean existing demo data for clean re-seeding
    await prisma.campaignMetric.deleteMany({
      where: { campaign: { accountId: demoAccount.id } },
    });
    await prisma.productMetric.deleteMany({
      where: { product: { accountId: demoAccount.id } },
    });
    await prisma.campaign.deleteMany({
      where: { accountId: demoAccount.id },
    });
    await prisma.product.deleteMany({
      where: { accountId: demoAccount.id },
    });

    // 2. Demo campaigns
    const sampleCampaigns = [
      { name: 'SP - Fone Bluetooth Pro - Exata', type: 'SPONSORED_PRODUCTS', budget: 150, acosTarget: 22 },
      { name: 'SP - Fone Bluetooth Pro - Ampla', type: 'SPONSORED_PRODUCTS', budget: 100, acosTarget: 38 },
      { name: 'SP - Caixa de Som Portátil - Auto', type: 'SPONSORED_PRODUCTS', budget: 80, acosTarget: 28 },
      { name: 'SP - Suporte Articulado Monitor - Exata', type: 'SPONSORED_PRODUCTS', budget: 120, acosTarget: 18 },
      { name: 'SB - Marca TechAudio - Top of Search', type: 'SPONSORED_BRANDS', budget: 200, acosTarget: 24 },
      { name: 'SD - Remarketing Visualizadores Fone', type: 'SPONSORED_DISPLAY', budget: 90, acosTarget: 32 },
      { name: 'SP - Teclado Mecânico RGB - Concorrentes', type: 'SPONSORED_PRODUCTS', budget: 110, acosTarget: 48 },
      { name: 'SP - Mouse Sem Fio Ergonômico - Frase', type: 'SPONSORED_PRODUCTS', budget: 60, acosTarget: 20 },
      { name: 'SP - Cabo USB-C Blindado - Desperdício Exemplo', type: 'SPONSORED_PRODUCTS', budget: 45, acosTarget: 95 },
      { name: 'SP - Hub USB 7 Portas - Lançamento', type: 'SPONSORED_PRODUCTS', budget: 75, acosTarget: 29 },
    ];

    const sampleProducts = [
      { asin: 'B08N5M7S6K', sku: 'AUDIO-FONE-01', title: 'Fone de Ouvido Bluetooth 5.3 com Cancelamento Ativo de Ruído', price: 289.90 },
      { asin: 'B09V7N88PX', sku: 'AUDIO-BOX-02', title: 'Caixa de Som Bluetooth À Prova D\'Água 20W RMS', price: 199.00 },
      { asin: 'B07T485V66', sku: 'DESK-SUPORTE-01', title: 'Suporte Articulado para 2 Monitores com Pistão a Gás', price: 349.90 },
      { asin: 'B08G89P1X8', sku: 'PERIF-TEC-RGB', title: 'Teclado Mecânico Gamer RGB Switch Blue ABNT2', price: 239.00 },
      { asin: 'B09L7X99QQ', sku: 'PERIF-MOUSE-01', title: 'Mouse Sem Fio Ergonômico Recarregável 4000 DPI', price: 129.90 },
    ];

    // Create products
    const createdProducts = [];
    for (const p of sampleProducts) {
      const prod = await prisma.product.create({
        data: {
          accountId: demoAccount.id,
          asin: p.asin,
          sku: p.sku,
          title: p.title,
          price: p.price,
          isDemo: true,
        },
      });
      createdProducts.push(prod);
    }

    // 3. Create campaigns and 30 days of metrics
    const now = new Date();
    for (let i = 0; i < sampleCampaigns.length; i++) {
      const sc = sampleCampaigns[i];
      const camp = await prisma.campaign.create({
        data: {
          accountId: demoAccount.id,
          name: sc.name,
          campaignType: sc.type,
          dailyBudget: sc.budget,
          status: 'ENABLED',
          isDemo: true,
        },
      });

      // Generate 30 days of metrics
      for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
        const date = startOfDay(subDays(now, dayOffset));
        const variance = 0.8 + Math.random() * 0.4; // 80% to 120%
        const impressions = Math.floor((1200 + i * 350) * variance);
        const clicks = Math.floor(impressions * (0.012 + Math.random() * 0.015));
        const spend = Number((clicks * (1.1 + Math.random() * 0.8)).toFixed(2));

        let sales = 0;
        let orders = 0;

        // Simulate intentional waste for the test campaign
        if (sc.name.includes('Desperdício')) {
          if (dayOffset % 7 === 0) {
            orders = 1;
            sales = Number((spend * 0.7).toFixed(2));
          } else {
            orders = 0;
            sales = 0;
          }
        } else {
          const targetAcos = sc.acosTarget / 100;
          sales = Number((spend / targetAcos * variance).toFixed(2));
          orders = Math.max(1, Math.round(sales / 180));
        }

        const cpc = safeDivide(spend, clicks);
        const acos = safeDivide(spend, sales) * 100;
        const roas = safeDivide(sales, spend);
        const ctr = safeDivide(clicks, impressions) * 100;
        const conversionRate = safeDivide(orders, clicks) * 100;

        await prisma.campaignMetric.create({
          data: {
            campaignId: camp.id,
            date,
            impressions,
            clicks,
            spend,
            sales,
            orders,
            units: orders,
            cpc: Number(cpc.toFixed(2)),
            acos: Number(acos.toFixed(2)),
            roas: Number(roas.toFixed(2)),
            ctr: Number(ctr.toFixed(2)),
            conversionRate: Number(conversionRate.toFixed(2)),
          },
        });
      }
    }

    // Seed 30 days for products
    for (const prod of createdProducts) {
      for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
        const date = startOfDay(subDays(now, dayOffset));
        const clicks = Math.floor(15 + Math.random() * 30);
        const spend = Number((clicks * 1.5).toFixed(2));
        const orders = Math.floor(1 + Math.random() * 4);
        const sales = Number((orders * (prod.price || 150)).toFixed(2));
        const impressions = clicks * 40;

        await prisma.productMetric.create({
          data: {
            productId: prod.id,
            date,
            impressions,
            clicks,
            spend,
            sales,
            orders,
            cpc: Number(safeDivide(spend, clicks).toFixed(2)),
            acos: Number((safeDivide(spend, sales) * 100).toFixed(2)),
            roas: Number(safeDivide(sales, spend).toFixed(2)),
          },
        });
      }
    }

    return demoAccount.id;
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
