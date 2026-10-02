export type DateRangeKey = '7d' | '14d' | '30d' | '60d' | 'all';

export interface DashboardMetrics {
  spend: number;
  sales: number;
  acos: number;
  roas: number;
  impressions: number;
  clicks: number;
  orders: number;
  units: number;
  cpc: number;
  ctr: number;
  conversionRate: number;
}

export interface MetricComparison {
  current: DashboardMetrics;
  previous: DashboardMetrics;
  percentageChanges: {
    spend: number;
    sales: number;
    acos: number;
    roas: number;
    impressions: number;
    clicks: number;
    orders: number;
    cpc: number;
  };
}

export interface DailyChartPoint {
  date: string;
  spend: number;
  sales: number;
  acos: number;
  roas: number;
  orders: number;
  clicks: number;
  impressions: number;
}

export interface CampaignRow {
  id: string;
  amazonCampaignId?: string | null;
  name: string;
  status: string;
  campaignType: string;
  spend: number;
  sales: number;
  acos: number;
  roas: number;
  impressions: number;
  clicks: number;
  orders: number;
  cpc: number;
  ctr: number;
  dailyBudget?: number | null;
  isDemo?: boolean;
}

export interface ProductRow {
  id: string;
  asin: string;
  sku?: string | null;
  title: string;
  imageUrl?: string | null;
  price?: number | null;
  spend: number;
  sales: number;
  acos: number;
  roas: number;
  orders: number;
  clicks: number;
  impressions: number;
  cpc: number;
  isDemo?: boolean;
}

export interface WasteAnalysisItem {
  campaignId: string;
  campaignName: string;
  spend: number;
  clicks: number;
  sales: number;
  reason: string;
}
