import {
  AMAZON_REGIONS,
  AmazonCampaignData,
  AmazonProfile,
  AmazonRegion,
  AmazonSpCampaignListResponse,
  CampaignActionResponse,
  CreateReportV3Params,
  ReportStatusResponse,
  UpdateBidParams,
  UpdateCampaignBudgetParams,
} from '@/types/amazon';
import defaultAmazonOAuthService, { AmazonOAuthService } from './AmazonOAuthService';

export class AmazonAdsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: string
  ) {
    super(message);
    this.name = 'AmazonAdsApiError';
  }
}

export class AmazonAdsAuthError extends AmazonAdsApiError {
  constructor(message: string = 'Autenticação inválida ou token expirado na Amazon Ads API.') {
    super(message, 401);
    this.name = 'AmazonAdsAuthError';
  }
}

export class AmazonAdsForbiddenError extends AmazonAdsApiError {
  constructor(
    message: string = 'Acesso não autorizado ao profileId ou permissões insuficientes.'
  ) {
    super(message, 403);
    this.name = 'AmazonAdsForbiddenError';
  }
}

export interface AmazonApiRequestOptions {
  accountId: string;
  profileId?: string | number;
  region?: AmazonRegion;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  contentType?: string;
  accept?: string;
  body?: any;
}

export class AmazonAdsService {
  private clientId: string;
  private defaultRegion: AmazonRegion;
  private oauthService: AmazonOAuthService;

  constructor(oauthService: AmazonOAuthService = defaultAmazonOAuthService) {
    this.clientId = process.env.AMAZON_ADS_CLIENT_ID || '';
    this.defaultRegion = (process.env.AMAZON_ADS_REGION as AmazonRegion) || 'NA';
    this.oauthService = oauthService;
  }

  /**
   * Helper to execute requests against Amazon Advertising API endpoints
   * with automatic token management, rate limit handling, and safe logging.
   */
  public async executeRequest<T>(options: AmazonApiRequestOptions): Promise<T> {
    const {
      accountId,
      profileId,
      region = this.defaultRegion,
      method = 'GET',
      endpoint,
      contentType = 'application/json',
      accept = 'application/json',
      body,
    } = options;

    const regionConfig = AMAZON_REGIONS[region] || AMAZON_REGIONS.NA;

    const accessToken = await this.oauthService.getValidAccessToken(accountId);
    if (!accessToken) {
      throw new AmazonAdsAuthError('Conta Amazon não conectada ou token de acesso expirado/inválido.');
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Amazon-Advertising-API-ClientId': this.clientId,
      'Content-Type': contentType,
      'Accept': accept,
    };

    // The Amazon-Advertising-API-Scope header must ONLY be sent when interacting with
    // advertiser entities (campaigns, ad groups, reports). It is not allowed on /v2/profiles.
    if (profileId) {
      headers['Amazon-Advertising-API-Scope'] = String(profileId);
    }

    const url = `${regionConfig.apiEndpoint}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    let attempts = 0;
    const maxAttempts = 3;
    let delay = 1000;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        // 1. Handle Rate Limiting (HTTP 429)
        if (response.status === 429) {
          const retryAfterHeader = response.headers.get('Retry-After');
          const retrySeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : null;
          const waitTime = retrySeconds && !isNaN(retrySeconds) ? retrySeconds * 1000 : delay;

          console.warn(
            `[AmazonAdsService] Rate limit (429) em ${endpoint}. Aguardando ${waitTime}ms (tentativa ${attempts}/${maxAttempts}).`
          );

          if (attempts < maxAttempts) {
            await new Promise((res) => setTimeout(res, waitTime));
            delay *= 2;
            continue;
          }
          throw new AmazonAdsApiError(
            'Limite de requisições excedido na Amazon Ads API (Rate Limit 429).',
            429
          );
        }

        // 2. Handle HTTP 401 Unauthorized
        if (response.status === 401) {
          console.error(`[AmazonAdsService] Falha de autenticação (401) ao acessar ${endpoint}`);
          throw new AmazonAdsAuthError();
        }

        // 3. Handle HTTP 403 Forbidden
        if (response.status === 403) {
          console.error(
            `[AmazonAdsService] Permissão negada (403) ao acessar ${endpoint} para o profile ${profileId}`
          );
          throw new AmazonAdsForbiddenError();
        }

        // 4. Handle other non-2xx responses
        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `[AmazonAdsService] Erro na API (${response.status}) ao acessar ${endpoint}: ${errorText.substring(0, 150)}`
          );
          throw new AmazonAdsApiError(
            `Amazon Ads API Error (${response.status}): ${errorText}`,
            response.status,
            errorText
          );
        }

        // For HTTP 204 No Content
        if (response.status === 204) {
          return {} as T;
        }

        return (await response.json()) as T;
      } catch (err: any) {
        if (
          err instanceof AmazonAdsAuthError ||
          err instanceof AmazonAdsForbiddenError ||
          attempts >= maxAttempts
        ) {
          throw err;
        }
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2;
      }
    }

    throw new AmazonAdsApiError(`Falha após ${maxAttempts} tentativas de comunicação com a Amazon Ads API`, 500);
  }

  /**
   * Fetches Advertising Profiles associated with the authorized account
   * Endpoint: GET /v2/profiles
   * Ref: https://advertising.amazon.com/API/docs/en-us/reference/2/profiles
   * Note: This endpoint does NOT accept Amazon-Advertising-API-Scope
   */
  public async getProfiles(accountId: string, region?: AmazonRegion): Promise<AmazonProfile[]> {
    return this.executeRequest<AmazonProfile[]>({
      accountId,
      region,
      endpoint: '/v2/profiles',
      method: 'GET',
    });
  }

  /**
   * Fetches Sponsored Products campaigns using official v3 API
   * Endpoint: POST /sp/campaigns/list
   * Headers: application/vnd.spCampaign.v3+json
   * Ref: https://advertising.amazon.com/API/docs/en-us/sponsored-products/2-0/openapi#/Campaigns/listCampaigns
   */
  public async getCampaigns(
    accountId: string,
    profileId: string | number,
    region?: AmazonRegion
  ): Promise<AmazonCampaignData[]> {
    try {
      // Primary: Official Sponsored Products v3 endpoint
      const response = await this.executeRequest<AmazonSpCampaignListResponse>({
        accountId,
        profileId,
        region,
        endpoint: '/sp/campaigns/list',
        method: 'POST',
        contentType: 'application/vnd.spCampaign.v3+json',
        accept: 'application/vnd.spCampaign.v3+json',
        body: {
          stateFilter: {
            include: ['ENABLED', 'PAUSED', 'ARCHIVED'],
          },
        },
      });

      if (response && Array.isArray(response.campaigns)) {
        return response.campaigns.map((c) => ({
          campaignId: c.campaignId,
          name: c.name,
          campaignType: 'SPONSORED_PRODUCTS',
          targetingType: c.targetingType,
          state: c.state,
          dailyBudget: c.budget?.budget || 0,
          startDate: c.startDate,
          endDate: c.endDate,
        }));
      }

      return [];
    } catch (v3Error: any) {
      if (
        v3Error instanceof AmazonAdsAuthError ||
        v3Error instanceof AmazonAdsForbiddenError
      ) {
        throw v3Error;
      }
      // Fallback: If profile only supports v2
      console.warn('[AmazonAdsService] Tentando fallback para /v2/sp/campaigns:', v3Error.message);
      return this.executeRequest<AmazonCampaignData[]>({
        accountId,
        profileId,
        region,
        endpoint: '/v2/sp/campaigns',
        method: 'GET',
      });
    }
  }

  /**
   * Requests asynchronous Report generation (Reporting API v3)
   * Endpoint: POST /reporting/reports
   * Ref: https://advertising.amazon.com/API/docs/en-us/guides/reporting/v3/get-started
   */
  public async createReport(
    accountId: string,
    profileId: string | number,
    params: CreateReportV3Params,
    region?: AmazonRegion
  ): Promise<{ reportId: string; status: string }> {
    return this.executeRequest<{ reportId: string; status: string }>({
      accountId,
      profileId,
      region,
      endpoint: '/reporting/reports',
      method: 'POST',
      body: params,
    });
  }

  /**
   * Checks status of an asynchronous report (Reporting API v3)
   * Endpoint: GET /reporting/reports/{reportId}
   * When status === 'COMPLETED', response includes presigned S3 'url'
   */
  public async getReportStatus(
    accountId: string,
    profileId: string | number,
    reportId: string,
    region?: AmazonRegion
  ): Promise<ReportStatusResponse> {
    return this.executeRequest<ReportStatusResponse>({
      accountId,
      profileId,
      region,
      endpoint: `/reporting/reports/${reportId}`,
      method: 'GET',
    });
  }

  /**
   * Deletes an asynchronous report (Reporting API v3)
   * Endpoint: DELETE /reporting/reports/{reportId}
   */
  public async deleteReport(
    accountId: string,
    profileId: string | number,
    reportId: string,
    region?: AmazonRegion
  ): Promise<void> {
    await this.executeRequest<void>({
      accountId,
      profileId,
      region,
      endpoint: `/reporting/reports/${reportId}`,
      method: 'DELETE',
    });
  }

  /**
   * Downloads completed report content from presigned S3 URL
   * Does NOT send Amazon Ads authentication headers (S3 presigned URL).
   */
  public async downloadReportData(downloadUrl: string): Promise<any> {
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Falha ao baixar relatório do S3 (Status ${response.status})`);
      }
      return await response.json();
    } catch (err: any) {
      console.error('[AmazonAdsService] Erro ao baixar dados do relatório:', err.message);
      throw err;
    }
  }

  /**
   * Prepared for the new Amazon Ads Unified Reporting API (v1)
   * Endpoint: POST /adsApi/v1/create/reports
   */
  public async createUnifiedReport(
    accountId: string,
    profileId: string | number,
    params: any,
    region?: AmazonRegion
  ): Promise<{ reportId: string; status: string }> {
    return this.executeRequest<{ reportId: string; status: string }>({
      accountId,
      profileId,
      region,
      endpoint: '/adsApi/v1/create/reports',
      method: 'POST',
      body: params,
    });
  }

  /**
   * Checks status in the new Amazon Ads Unified Reporting API (v1)
   * Endpoint: GET /adsApi/v1/reports/{reportId}
   */
  public async getUnifiedReportStatus(
    accountId: string,
    profileId: string | number,
    reportId: string,
    region?: AmazonRegion
  ): Promise<any> {
    return this.executeRequest<any>({
      accountId,
      profileId,
      region,
      endpoint: `/adsApi/v1/reports/${reportId}`,
      method: 'GET',
    });
  }

  /* =========================================================================
   * PHASE 2 PREPARED ACTIONS (READ-ONLY IN MVP)
   * The methods below provide typed interfaces and safe abstractions for
   * future campaign modifications, but do NOT execute write calls in this MVP.
   * ========================================================================= */

  public async updateCampaignBudget(
    params: UpdateCampaignBudgetParams
  ): Promise<CampaignActionResponse> {
    return {
      success: false,
      readOnlyMVP: true,
      message:
        'Ação não executada: A aplicação está em modo MVP de somente leitura e análise. Alterações de orçamento serão habilitadas na Fase 2.',
      simulatedAction: `updateCampaignBudget for campaign ${params.campaignId} to ${params.dailyBudget}`,
    };
  }

  public async updateBid(params: UpdateBidParams): Promise<CampaignActionResponse> {
    return {
      success: false,
      readOnlyMVP: true,
      message:
        'Ação não executada: A aplicação está em modo MVP de somente leitura e análise. Alterações de lance/CPC serão habilitadas na Fase 2.',
      simulatedAction: `updateBid for ${params.keywordId || params.targetId} to ${params.bid}`,
    };
  }

  public async pauseCampaign(campaignId: string): Promise<CampaignActionResponse> {
    return {
      success: false,
      readOnlyMVP: true,
      message:
        'Ação não executada: A aplicação está em modo MVP de somente leitura e análise. Pausa de campanhas será habilitada na Fase 2.',
      simulatedAction: `pauseCampaign for campaign ${campaignId}`,
    };
  }

  public async enableCampaign(campaignId: string): Promise<CampaignActionResponse> {
    return {
      success: false,
      readOnlyMVP: true,
      message:
        'Ação não executada: A aplicação está em modo MVP de somente leitura e análise. Ativação de campanhas será habilitada na Fase 2.',
      simulatedAction: `enableCampaign for campaign ${campaignId}`,
    };
  }
}

export const amazonAdsService = new AmazonAdsService();
export default amazonAdsService;
