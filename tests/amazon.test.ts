import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AmazonOAuthService } from '@/services/AmazonOAuthService';
import {
  AmazonAdsService,
  AmazonAdsAuthError,
  AmazonAdsForbiddenError,
  AmazonAdsApiError,
} from '@/services/AmazonAdsService';
import { AMAZON_REGIONS } from '@/types/amazon';

describe('Amazon Ads Integration Audit - Comprehensive Test Suite', () => {
  let oauthService: AmazonOAuthService;
  let adsService: AmazonAdsService;

  beforeEach(() => {
    process.env.AMAZON_ADS_CLIENT_ID = 'amzn1.application-oa2-client.test12345';
    process.env.AMAZON_ADS_CLIENT_SECRET = 'secret_test_xyz';
    process.env.AMAZON_ADS_REDIRECT_URI = 'http://localhost:3000/api/auth/amazon/callback';
    process.env.AMAZON_ADS_REGION = 'NA';

    oauthService = new AmazonOAuthService();
    adsService = new AmazonAdsService(oauthService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* =========================================================================
   * 1. OAuth & Login with Amazon (LwA)
   * ========================================================================= */
  describe('OAuth 2.0 & Login with Amazon', () => {
    it('verifies regional hosts and authorization endpoints according to official documentation', () => {
      // North America (including Brazil)
      expect(AMAZON_REGIONS.NA.apiEndpoint).toBe('https://advertising-api.amazon.com');
      expect(AMAZON_REGIONS.NA.authUrl).toBe('https://www.amazon.com/ap/oa');
      expect(AMAZON_REGIONS.NA.tokenUrl).toBe('https://api.amazon.com/auth/o2/token');

      // Europe
      expect(AMAZON_REGIONS.EU.apiEndpoint).toBe('https://advertising-api-eu.amazon.com');
      expect(AMAZON_REGIONS.EU.authUrl).toBe('https://eu.account.amazon.com/ap/oa');
      expect(AMAZON_REGIONS.EU.tokenUrl).toBe('https://api.amazon.co.uk/auth/o2/token');

      // Far East
      expect(AMAZON_REGIONS.FE.apiEndpoint).toBe('https://advertising-api-fe.amazon.com');
      expect(AMAZON_REGIONS.FE.authUrl).toBe('https://apac.account.amazon.com/ap/oa');
      expect(AMAZON_REGIONS.FE.tokenUrl).toBe('https://api.amazon.co.jp/auth/o2/token');
    });

    it('generates authorization URL with mandatory scope advertising::campaign_management', () => {
      const url = oauthService.getAuthorizationUrl('state_test_xyz', 'NA');

      expect(url).toContain('https://www.amazon.com/ap/oa');
      expect(url).toContain('client_id=amzn1.application-oa2-client.test12345');
      expect(url).toContain('scope=advertising%3A%3Acampaign_management');
      expect(url).toContain('response_type=code');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Famazon%2Fcallback');
      expect(url).toContain('state=state_test_xyz');
    });

    it('supports multi-scope requests (e.g. including advertising::test:create_account)', () => {
      const url = oauthService.getAuthorizationUrl('state_test_sandbox', 'NA', [
        'advertising::campaign_management',
        'advertising::test:create_account',
      ]);

      expect(url).toContain('advertising%3A%3Acampaign_management+advertising%3A%3Atest%3Acreate_account');
    });

    it('refreshes token via POST to LwA token endpoint and returns new access_token', async () => {
      const mockTokenResponse = {
        access_token: 'Atza|new_access_token_67890',
        refresh_token: 'Atzr|retained_or_new_refresh_token',
        token_type: 'bearer',
        expires_in: 3600,
        scope: 'advertising::campaign_management',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockTokenResponse,
      } as any);

      const result = await oauthService.refreshAccessToken('Atzr|mock_refresh_token', 'NA');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.amazon.com/auth/o2/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          }),
          body: expect.stringContaining('grant_type=refresh_token'),
        })
      );

      expect(result.access_token).toBe('Atza|new_access_token_67890');
      expect(result.expires_in).toBe(3600);
    });
  });

  /* =========================================================================
   * 2. Profiles API
   * ========================================================================= */
  describe('Profiles API (GET /v2/profiles)', () => {
    it('calls GET /v2/profiles without Amazon-Advertising-API-Scope header', async () => {
      vi.spyOn(oauthService, 'getValidAccessToken').mockResolvedValue('Atza|valid_token');

      const mockProfiles = [
        {
          profileId: '123456789',
          countryCode: 'BR',
          currencyCode: 'BRL',
          timezone: 'America/Sao_Paulo',
          accountInfo: {
            marketplaceStringId: 'A2Q3Y263D00KWC',
            id: 'ENTITY_BR_1',
            type: 'seller',
            name: 'Loja Vendedora Brasil',
          },
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockProfiles,
      } as any);

      const profiles = await adsService.getProfiles('test-acc-id', 'NA');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://advertising-api.amazon.com/v2/profiles',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer Atza|valid_token',
            'Amazon-Advertising-API-ClientId': 'amzn1.application-oa2-client.test12345',
          }),
        })
      );

      // Verify that Amazon-Advertising-API-Scope is NOT sent to /v2/profiles
      const calledHeaders = (global.fetch as any).mock.calls[0][1].headers;
      expect(calledHeaders['Amazon-Advertising-API-Scope']).toBeUndefined();

      expect(profiles.length).toBe(1);
      expect(profiles[0].countryCode).toBe('BR');
      expect(profiles[0].currencyCode).toBe('BRL');
    });
  });

  /* =========================================================================
   * 3. Sponsored Products Campaigns (POST /sp/campaigns/list - v3)
   * ========================================================================= */
  describe('Sponsored Products Campaigns v3', () => {
    it('calls POST /sp/campaigns/list with application/vnd.spCampaign.v3+json and Scope header', async () => {
      vi.spyOn(oauthService, 'getValidAccessToken').mockResolvedValue('Atza|valid_token');

      const mockV3Response = {
        campaigns: [
          {
            campaignId: 'sp_camp_999',
            name: 'SP - Fone Bluetooth - Auto',
            state: 'ENABLED',
            targetingType: 'AUTO',
            budget: {
              budget: 75.5,
              budgetType: 'DAILY',
            },
            startDate: '2026-09-01',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockV3Response,
      } as any);

      const campaigns = await adsService.getCampaigns('test-acc-id', '123456789', 'NA');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://advertising-api.amazon.com/sp/campaigns/list',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer Atza|valid_token',
            'Amazon-Advertising-API-ClientId': 'amzn1.application-oa2-client.test12345',
            'Amazon-Advertising-API-Scope': '123456789',
            'Content-Type': 'application/vnd.spCampaign.v3+json',
            'Accept': 'application/vnd.spCampaign.v3+json',
          }),
        })
      );

      expect(campaigns.length).toBe(1);
      expect(campaigns[0].campaignId).toBe('sp_camp_999');
      expect(campaigns[0].name).toBe('SP - Fone Bluetooth - Auto');
      expect(campaigns[0].dailyBudget).toBe(75.5);
    });
  });

  /* =========================================================================
   * 4. Reporting API Lifecycle (v3 & Unified)
   * ========================================================================= */
  describe('Reporting API Lifecycle', () => {
    it('creates report via POST /reporting/reports with valid v3 payload', async () => {
      vi.spyOn(oauthService, 'getValidAccessToken').mockResolvedValue('Atza|valid_token');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ reportId: 'amzn1.clicksreport.v3.12345', status: 'PENDING' }),
      } as any);

      const result = await adsService.createReport(
        'test-acc-id',
        '123456789',
        {
          startDate: '2026-09-01',
          endDate: '2026-09-07',
          configuration: {
            adProduct: 'SPONSORED_PRODUCTS',
            groupBy: ['campaign'],
            columns: ['date', 'campaignId', 'impressions', 'clicks', 'cost', 'sales14d'],
            reportTypeId: 'spCampaigns',
            timeUnit: 'DAILY',
            format: 'GZIP_JSON',
          },
        },
        'NA'
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://advertising-api.amazon.com/reporting/reports',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Amazon-Advertising-API-Scope': '123456789',
          }),
          body: expect.stringContaining('"reportTypeId":"spCampaigns"'),
        })
      );

      expect(result.reportId).toBe('amzn1.clicksreport.v3.12345');
      expect(result.status).toBe('PENDING');
    });

    it('queries report status via GET /reporting/reports/{reportId} returning COMPLETED and S3 url', async () => {
      vi.spyOn(oauthService, 'getValidAccessToken').mockResolvedValue('Atza|valid_token');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          reportId: 'amzn1.clicksreport.v3.12345',
          status: 'COMPLETED',
          url: 'https://amazon-advertising-api-reports-us-east-1.s3.amazonaws.com/report.json.gz?signature=xxx',
          fileSize: 45210,
        }),
      } as any);

      const status = await adsService.getReportStatus(
        'test-acc-id',
        '123456789',
        'amzn1.clicksreport.v3.12345',
        'NA'
      );

      expect(status.status).toBe('COMPLETED');
      expect(status.url).toContain('https://amazon-advertising-api-reports-us-east-1.s3.amazonaws.com');
      expect(status.fileSize).toBe(45210);
    });

    it('downloads completed report data directly from S3 presigned URL without Ads auth headers', async () => {
      const mockReportData = [
        {
          date: '2026-09-01',
          campaignId: 'camp_1',
          impressions: 500,
          clicks: 20,
          cost: 25.0,
          sales14d: 150.0,
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockReportData,
      } as any);

      const data = await adsService.downloadReportData(
        'https://amazon-advertising-api-reports-us-east-1.s3.amazonaws.com/report.json'
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://amazon-advertising-api-reports-us-east-1.s3.amazonaws.com/report.json'
      );
      expect(data.length).toBe(1);
      expect(data[0].cost).toBe(25.0);
    });
  });

  /* =========================================================================
   * 5. HTTP Status Code Handling (401, 403, 429)
   * ========================================================================= */
  describe('HTTP Status Code Error Handling', () => {
    it('throws AmazonAdsAuthError on HTTP 401 Unauthorized', async () => {
      vi.spyOn(oauthService, 'getValidAccessToken').mockResolvedValue('Atza|expired_token');

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized: Invalid token',
      } as any);

      await expect(adsService.getProfiles('test-acc-id', 'NA')).rejects.toThrow(
        AmazonAdsAuthError
      );
    });

    it('throws AmazonAdsForbiddenError on HTTP 403 Forbidden', async () => {
      vi.spyOn(oauthService, 'getValidAccessToken').mockResolvedValue('Atza|valid_token');

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden: Profile scope not authorized',
      } as any);

      await expect(
        adsService.getCampaigns('test-acc-id', 'unauthorized_profile', 'NA')
      ).rejects.toThrow(AmazonAdsForbiddenError);
    });

    it('respects Retry-After header on HTTP 429 Too Many Requests', async () => {
      vi.spyOn(oauthService, 'getValidAccessToken').mockResolvedValue('Atza|valid_token');

      let attempt = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        attempt++;
        if (attempt === 1) {
          return {
            ok: false,
            status: 429,
            headers: new Map([['Retry-After', '0']]),
            text: async () => 'Rate limit exceeded',
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => [{ profileId: '123' }],
        };
      });

      const profiles = await adsService.getProfiles('test-acc-id', 'NA');
      expect(profiles.length).toBe(1);
      expect(attempt).toBe(2);
    });
  });

  /* =========================================================================
   * 6. Phase 2 Prepared Write Actions (Safe Read-Only in MVP)
   * ========================================================================= */
  describe('Phase 2 Write Abstractions (Read-Only)', () => {
    it('safely intercepts updateCampaignBudget returning readOnlyMVP', async () => {
      const res = await adsService.updateCampaignBudget({ campaignId: 'c1', dailyBudget: 100 });
      expect(res.success).toBe(false);
      expect(res.readOnlyMVP).toBe(true);
      expect(res.message).toContain('modo MVP de somente leitura');
    });

    it('safely intercepts updateBid returning readOnlyMVP', async () => {
      const res = await adsService.updateBid({ keywordId: 'kw1', bid: 1.25 });
      expect(res.success).toBe(false);
      expect(res.readOnlyMVP).toBe(true);
    });

    it('safely intercepts pauseCampaign and enableCampaign returning readOnlyMVP', async () => {
      const pause = await adsService.pauseCampaign('c1');
      expect(pause.success).toBe(false);
      expect(pause.readOnlyMVP).toBe(true);

      const enable = await adsService.enableCampaign('c1');
      expect(enable.success).toBe(false);
      expect(enable.readOnlyMVP).toBe(true);
    });
  });
});
