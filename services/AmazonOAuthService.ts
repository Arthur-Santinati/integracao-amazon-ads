import { AMAZON_REGIONS, AmazonOAuthTokenResponse, AmazonRegion } from '@/types/amazon';
import prisma from '@/db/prisma';

export class AmazonOAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private defaultRegion: AmazonRegion;

  constructor() {
    this.clientId = process.env.AMAZON_ADS_CLIENT_ID || '';
    this.clientSecret = process.env.AMAZON_ADS_CLIENT_SECRET || '';
    this.redirectUri =
      process.env.AMAZON_ADS_REDIRECT_URI || 'http://localhost:3000/api/auth/amazon/callback';
    this.defaultRegion = (process.env.AMAZON_ADS_REGION as AmazonRegion) || 'NA';
  }

  /**
   * Generates the Login with Amazon OAuth 2.0 authorization URL
   * Following Amazon Advertising API authorization guide:
   * Scope: advertising::campaign_management (mandatory double colon)
   * Ref: https://advertising.amazon.com/API/docs/en-us/setting-up/generate-api-tokens
   */
  public getAuthorizationUrl(
    state: string = 'amazon_auth_state',
    region: AmazonRegion = this.defaultRegion,
    scopes: string[] = ['advertising::campaign_management']
  ): string {
    const regionConfig = AMAZON_REGIONS[region] || AMAZON_REGIONS.NA;
    const scopeString = scopes.join(' ');

    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: scopeString,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      state: state,
    });

    return `${regionConfig.authUrl}?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for access and refresh tokens
   * Ref: https://advertising.amazon.com/API/docs/en-us/setting-up/generate-api-tokens
   */
  public async exchangeCodeForTokens(
    code: string,
    region: AmazonRegion = this.defaultRegion
  ): Promise<AmazonOAuthTokenResponse> {
    const regionConfig = AMAZON_REGIONS[region] || AMAZON_REGIONS.NA;

    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        'Credenciais da Amazon Ads API não configuradas (AMAZON_ADS_CLIENT_ID / AMAZON_ADS_CLIENT_SECRET)'
      );
    }

    const payload = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    try {
      const response = await fetch(regionConfig.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: payload.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        // Safe logging: Never log client_secret, access_token or refresh_token
        console.error('[AmazonOAuthService] Falha ao trocar código de autorização:', {
          status: response.status,
          error: data.error,
          error_description: data.error_description,
        });
        throw new Error(
          data.error_description || data.error || 'Erro na troca de código de autorização da Amazon'
        );
      }

      return data as AmazonOAuthTokenResponse;
    } catch (err: any) {
      console.error('[AmazonOAuthService] Erro na requisição de token:', err.message);
      throw err;
    }
  }

  /**
   * Refreshes an expired Amazon Ads access token
   * Access tokens expire in 3600 seconds (1 hour).
   */
  public async refreshAccessToken(
    refreshToken: string,
    region: AmazonRegion = this.defaultRegion
  ): Promise<AmazonOAuthTokenResponse> {
    const regionConfig = AMAZON_REGIONS[region] || AMAZON_REGIONS.NA;

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Credenciais da Amazon Ads API não configuradas');
    }

    const payload = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    try {
      const response = await fetch(regionConfig.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: payload.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[AmazonOAuthService] Falha ao renovar access token:', {
          status: response.status,
          error: data.error,
        });
        throw new Error(data.error_description || 'Falha ao renovar token de acesso da Amazon');
      }

      return data as AmazonOAuthTokenResponse;
    } catch (err: any) {
      console.error('[AmazonOAuthService] Erro na renovação de token:', err.message);
      throw err;
    }
  }

  /**
   * Saves or updates tokens associated with an account in PostgreSQL
   */
  public async saveAccountTokens(
    accountId: string,
    tokens: AmazonOAuthTokenResponse
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + (tokens.expires_in - 300) * 1000); // 5 min safety margin

      await prisma.amazonToken.upsert({
        where: { accountId },
        create: {
          accountId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenType: tokens.token_type || 'bearer',
          expiresIn: tokens.expires_in,
          expiresAt,
          scope: tokens.scope || 'advertising::campaign_management',
        },
        update: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || undefined,
          tokenType: tokens.token_type || 'bearer',
          expiresIn: tokens.expires_in,
          expiresAt,
          scope: tokens.scope || undefined,
          updatedAt: new Date(),
        },
      });

      await prisma.amazonAccount.update({
        where: { id: accountId },
        data: {
          status: 'CONNECTED',
          updatedAt: new Date(),
        },
      });
    } catch (err: any) {
      console.warn('[AmazonOAuthService] Erro ao persistir tokens no banco:', err.message);
    }
  }

  /**
   * Retrieves a valid access token for an account, automatically refreshing if expired
   */
  public async getValidAccessToken(accountId: string): Promise<string | null> {
    try {
      const tokenRecord = await prisma.amazonToken.findUnique({
        where: { accountId },
        include: { account: true },
      });

      if (!tokenRecord) return null;

      const now = new Date();
      // If not expired, return current token
      if (tokenRecord.expiresAt > now) {
        return tokenRecord.accessToken;
      }

      // Token expired -> perform refresh
      try {
        const region = (tokenRecord.account.region as AmazonRegion) || this.defaultRegion;
        const refreshed = await this.refreshAccessToken(tokenRecord.refreshToken, region);
        await this.saveAccountTokens(accountId, refreshed);
        return refreshed.access_token;
      } catch (error) {
        await prisma.amazonAccount.update({
          where: { id: accountId },
          data: { status: 'EXPIRED' },
        });
        return null;
      }
    } catch {
      return null;
    }
  }
}

export const amazonOAuthService = new AmazonOAuthService();
export default amazonOAuthService;
