/**
 * Amazon Advertising API Types and Enums
 * Based strictly on the official Amazon Ads API documentation:
 * https://advertising.amazon.com/API/docs/en-us/
 */

export type AmazonRegion = 'NA' | 'EU' | 'FE';

export interface AmazonRegionConfig {
  name: string;
  authUrl: string;
  tokenUrl: string;
  apiEndpoint: string;
}

export const AMAZON_REGIONS: Record<AmazonRegion, AmazonRegionConfig> = {
  NA: {
    name: 'North America (US, CA, MX, BR)',
    authUrl: 'https://www.amazon.com/ap/oa',
    tokenUrl: 'https://api.amazon.com/auth/o2/token',
    apiEndpoint: 'https://advertising-api.amazon.com',
  },
  EU: {
    name: 'Europe (UK, DE, FR, IT, ES, NL, PL, SE, TR, AE, SA, EG)',
    authUrl: 'https://eu.account.amazon.com/ap/oa',
    tokenUrl: 'https://api.amazon.co.uk/auth/o2/token',
    apiEndpoint: 'https://advertising-api-eu.amazon.com',
  },
  FE: {
    name: 'Far East (JP, AU, SG)',
    authUrl: 'https://apac.account.amazon.com/ap/oa',
    tokenUrl: 'https://api.amazon.co.jp/auth/o2/token',
    apiEndpoint: 'https://advertising-api-fe.amazon.com',
  },
};

export interface AmazonOAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

export interface AmazonProfile {
  profileId: string | number;
  countryCode: string;
  currencyCode: string;
  dailyBudget?: number;
  timezone: string;
  accountInfo: {
    marketplaceStringId: string;
    id: string;
    type: 'seller' | 'vendor' | 'agency';
    name: string;
    subType?: string;
    validPaymentMethod?: boolean;
  };
}

export type AmazonCampaignType = 'SPONSORED_PRODUCTS' | 'SPONSORED_BRANDS' | 'SPONSORED_DISPLAY';
export type AmazonCampaignStatus = 'ENABLED' | 'PAUSED' | 'ARCHIVED';

/**
 * Sponsored Products v3 Campaign Structure
 * Endpoint: POST /sp/campaigns/list
 * Header: application/vnd.spCampaign.v3+json
 */
export interface AmazonSpCampaignV3 {
  campaignId: string;
  name: string;
  state: AmazonCampaignStatus;
  targetingType?: 'MANUAL' | 'AUTO';
  budget: {
    budget: number;
    budgetType: 'DAILY';
  };
  startDate?: string;
  endDate?: string;
  dynamicBidding?: {
    strategy?: 'LEGACY_FOR_SALES' | 'AUTO_FOR_SALES' | 'MANUAL';
  };
}

export interface AmazonSpCampaignListResponse {
  campaigns: AmazonSpCampaignV3[];
  totalResults?: number;
  nextToken?: string;
}

export interface AmazonCampaignData {
  campaignId: string;
  name: string;
  campaignType: AmazonCampaignType;
  targetingType?: 'MANUAL' | 'AUTO';
  state: AmazonCampaignStatus;
  dailyBudget: number;
  startDate?: string;
  endDate?: string;
}

/**
 * Reporting API v3 Types
 * Endpoint: POST /reporting/reports
 * Status Endpoint: GET /reporting/reports/{reportId}
 */
export type ReportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface CreateReportV3Params {
  name?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  configuration: {
    adProduct: 'SPONSORED_PRODUCTS' | 'SPONSORED_BRANDS' | 'SPONSORED_DISPLAY';
    groupBy: Array<'campaign' | 'adGroup' | 'target' | 'advertiser'>;
    columns: string[];
    reportTypeId: 'spCampaigns' | 'spAdvertisedProduct' | 'spTargeting' | 'spSearchTerm';
    timeUnit: 'DAILY' | 'SUMMARY';
    format: 'GZIP_JSON' | 'CSV';
  };
}

export interface ReportStatusResponse {
  reportId: string;
  status: ReportStatus;
  statusDetails?: string;
  url?: string; // Presigned Amazon S3 download URL
  fileSize?: number;
  expiration?: string;
  failureReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AmazonReportMetricData {
  campaignId: string;
  campaignName: string;
  date: string;
  impressions: number;
  clicks: number;
  cost: number; // Spend
  sales14d?: number; // Attributed sales
  purchases14d?: number; // Orders
  unitsSold14d?: number;
}

/**
 * Interfaces prepared for FUTURE write operations (Phase 2).
 * These must be defined but not executed in this MVP.
 */
export interface UpdateCampaignBudgetParams {
  campaignId: string;
  dailyBudget: number;
}

export interface UpdateBidParams {
  keywordId?: string;
  targetId?: string;
  bid: number;
}

export interface UpdateCampaignStatusParams {
  campaignId: string;
  status: AmazonCampaignStatus;
}

export interface CampaignActionResponse {
  success: boolean;
  message: string;
  readOnlyMVP: boolean;
  simulatedAction?: string;
}
