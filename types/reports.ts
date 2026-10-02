export interface NormalizedCSVRow {
  date: Date;
  campaignName: string;
  campaignId?: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  units?: number;
  asin?: string;
  sku?: string;
}

export interface CSVParseResult {
  success: boolean;
  fileName: string;
  totalRows: number;
  validRows: NormalizedCSVRow[];
  invalidRowsCount: number;
  errors: string[];
  detectedColumns: Record<string, string>;
  startDate?: Date;
  endDate?: Date;
}

export interface ImportReportSummary {
  reportId: string;
  fileName: string;
  reportType: string;
  rowCount: number;
  status: 'COMPLETED' | 'FAILED';
  importedAt: string;
  errorDetails?: string;
}
