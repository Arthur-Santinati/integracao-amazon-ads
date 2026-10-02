# Auditoria e Guia Oficial da Amazon Ads API

Este documento consolida a arquitetura técnica, endpoints oficiais, especificações de cabeçalhos e procedimentos de autorização da **Amazon Advertising API**, baseados estritamente na documentação oficial atual da Amazon.

---

## 🔗 Referências Oficiais da Amazon
- **Visão Geral e Onboarding**: [Amazon Ads API Overview](https://advertising.amazon.com/API/docs/en-us/setting-up/overview)
- **Geração de Tokens e OAuth**: [Generate API Tokens](https://advertising.amazon.com/API/docs/en-us/setting-up/generate-api-tokens)
- **Profiles API (v2)**: [Amazon Advertising Profiles Reference](https://advertising.amazon.com/API/docs/en-us/reference/2/profiles)
- **Sponsored Products API (v3)**: [Sponsored Products v3 OpenAPI Specification](https://advertising.amazon.com/API/docs/en-us/sponsored-products/2-0/openapi#/)
- **Reporting API (v3)**: [Reporting API v3 Guide](https://advertising.amazon.com/API/docs/en-us/guides/reporting/v3/get-started)
- **Unified Reporting API (v1)**: [Unified Reporting OpenAPI Specification](https://advertising.amazon.com/API/docs/en-us/reporting/openapi#/)

---

## 1. OAuth 2.0 / Login with Amazon (LwA)

### 1.1. URLs Oficiais por Região
A autorização e a troca de tokens devem ocorrer no servidor de autenticação regional correspondente à conta do anunciante:

| Região | Mercados Cobertos | Host da API | URL de Autorização (Consent Screen) | URL de Token (POST) |
|---|---|---|---|---|
| **NA** | **Brasil (BR)**, EUA (US), Canadá (CA), México (MX) | `https://advertising-api.amazon.com` | `https://www.amazon.com/ap/oa` | `https://api.amazon.com/auth/o2/token` |
| **EU** | Reino Unido, Alemanha, França, Itália, Espanha, etc. | `https://advertising-api-eu.amazon.com` | `https://eu.account.amazon.com/ap/oa` | `https://api.amazon.co.uk/auth/o2/token` |
| **FE** | Japão, Austrália, Cingapura | `https://advertising-api-fe.amazon.com` | `https://apac.account.amazon.com/ap/oa` | `https://api.amazon.co.jp/auth/o2/token` |

> 🇧🇷 **Importante para o Brasil**: O marketplace da Amazon Brasil (`A2Q3Y263D00KWC`, `countryCode: BR`) pertence à região **North America (NA)**. O host da API é `https://advertising-api.amazon.com`.

### 1.2. Escopos de Permissão (Scopes)
- **Escopo Principal**: `advertising::campaign_management`
  - **Atenção**: É obrigatório utilizar **dois dois-pontos** (`::`). O uso de apenas um dois-pontos resulta em erro de escopo inválido retornado pela Amazon.
- **Escopo para Sandbox / Testes**: `advertising::test:create_account` (combinado via espaço, ex: `scope=advertising::campaign_management%20advertising::test:create_account`).

### 1.3. Fluxo para Direct Advertiser vs. Partner
1. **Direct Advertiser (Anunciante Próprio / Marca / Vendedor)**:
   - Registra-se no [Amazon Advertising Developer Console](https://advertising.amazon.com/).
   - Cria um **Security Profile** no [Login with Amazon Console](https://developer.amazon.com/loginwithamazon/console/site/lwa/overview.html).
   - Configura a URI exata de callback em **Allowed Return URLs** (ex: `http://localhost:3000/api/auth/amazon/callback`).
   - Associa o Client ID ao seu perfil de anunciante e autoriza a aplicação via consent screen.
2. **Partner / Integrador Terceiro**:
   - Exige registro no Amazon Ads Partner Network e homologação completa para operar multi-tenant em contas de clientes externos.

### 1.4. Ciclo de Vida dos Tokens
- **Access Token**: Validade de **3600 segundos (1 hora)**. Deve ser renovado periodicamente.
- **Refresh Token**: Validade indeterminada (enquanto não revogado pelo usuário). Usado para obter novos access tokens via chamada POST:
  ```http
  POST /auth/o2/token HTTP/1.1
  Host: api.amazon.com
  Content-Type: application/x-www-form-urlencoded;charset=UTF-8

  grant_type=refresh_token&
  refresh_token=<REFRESH_TOKEN>&
  client_id=<CLIENT_ID>&
  client_secret=<CLIENT_SECRET>
  ```

---

## 2. Endpoints e Versões Atuais da Amazon Ads API

### 2.1. Cabeçalhos Obrigatórios (Headers)
| Header | Descrição | Aplicabilidade |
|---|---|---|
| `Authorization` | `Bearer <access_token>` | Todos os endpoints |
| `Amazon-Advertising-API-ClientId` | `AMAZON_ADS_CLIENT_ID` (também aceito como `Amazon-Ads-ClientId`) | Todos os endpoints |
| `Amazon-Advertising-API-Scope` | `profileId` numérico do anunciante (ex: `"1234567890123456"`) | **Obrigatório em campanhas e relatórios**. **Proibido em `/v2/profiles`** |
| `Content-Type` | Específico por endpoint (ex: `application/vnd.spCampaign.v3+json` em SP v3) | Requisições POST/PUT |
| `Accept` | Específico por endpoint (ex: `application/vnd.spCampaign.v3+json` em SP v3) | Todas as requisições |

### 2.2. Perfis de Anunciante (Profiles API)
- **Método & Caminho**: `GET /v2/profiles`
- **Versão**: v2 (padrão oficial de onboarding)
- **Função**: Descobrir os perfis acessíveis e obter o `profileId`, moeda (`currencyCode`), país (`countryCode`) e tipo de entidade (`seller`, `vendor`).
- **Atenção**: Este endpoint **NÃO aceita** o header `Amazon-Advertising-API-Scope`.

### 2.3. Campanhas de Sponsored Products
- **Método & Caminho Atual**: `POST /sp/campaigns/list`
- **Versão**: **v3** (Sponsored Products v3)
- **Headers específicos**:
  - `Content-Type: application/vnd.spCampaign.v3+json`
  - `Accept: application/vnd.spCampaign.v3+json`
  - `Amazon-Advertising-API-Scope: <profileId>`
- **Corpo da requisição**:
  ```json
  {
    "stateFilter": {
      "include": ["ENABLED", "PAUSED", "ARCHIVED"]
    }
  }
  ```
- **Endpoint Legado (v2)**: `GET /v2/sp/campaigns` (em processo de descontinuação pela Amazon).

---

## 3. Reporting API (Relatórios de Métricas)

### 3.1. Estado Atual das APIs de Reporting
- **Reporting API v3 (`POST /reporting/reports`)**: API oficial assíncrona de relatórios em produção (suporte garantido até 30 de junho de 2027).
- **Unified Reporting API v1 (`POST /adsApi/v1/create/reports`)**: Nova geração de relatórios unificados (multidimensional e cross-ad product) com General Availability recente.

### 3.2. Fluxo Completo de Geração e Download (v3)

1. **Criação do Relatório**:
   - `POST /reporting/reports`
   - Headers: `Amazon-Advertising-API-Scope: <profileId>`, `Content-Type: application/json`
   - Payload:
     ```json
     {
       "name": "SP Campaign Daily Performance",
       "startDate": "2026-09-01",
       "endDate": "2026-09-07",
       "configuration": {
         "adProduct": "SPONSORED_PRODUCTS",
         "groupBy": ["campaign"],
         "columns": [
           "date",
           "campaignId",
           "campaignName",
           "campaignStatus",
           "impressions",
           "clicks",
           "cost",
           "spend",
           "purchases14d",
           "sales14d"
         ],
         "reportTypeId": "spCampaigns",
         "timeUnit": "DAILY",
         "format": "GZIP_JSON"
       }
     }
     ```
   - Resposta: `{ "reportId": "amzn1.clicksreport.v3...", "status": "PENDING" }`

2. **Consulta de Status**:
   - `GET /reporting/reports/{reportId}`
   - Resposta em andamento: `{ "status": "PROCESSING" }`
   - Resposta concluída:
     ```json
     {
       "reportId": "amzn1.clicksreport.v3...",
       "status": "COMPLETED",
       "url": "https://amazon-advertising-api-reports-us-east-1.s3.amazonaws.com/...",
       "fileSize": 45210,
       "expiration": "2026-10-03T12:00:00Z"
     }
     ```

3. **Download dos Dados**:
   - Realizar requisição HTTP `GET` diretamente na URL assinada do S3.
   - **Importante**: Não enviar os cabeçalhos de autenticação da Amazon Ads para a URL do S3 (pois o S3 autentica via query parameters da URL).
   - Descomprimir o stream GZIP e processar o JSON resultante.

### 3.3. Métricas Disponíveis para Sponsored Products
- **Dimensões**: `date`, `campaignId`, `campaignName`, `campaignStatus`, `campaignBudgetAmount`, `campaignBudgetType`.
- **Tráfego**: `impressions`, `clicks`, `cost` / `spend`.
- **Conversão e Vendas**:
  - `purchases1d`, `purchases7d`, `purchases14d`, `purchases30d` (Pedidos)
  - `sales1d`, `sales7d`, `sales14d`, `sales30d` (Faturamento atribuído)
  - `unitsSoldClicks1d`, `unitsSoldClicks7d`, `unitsSoldClicks14d`, `unitsSoldClicks30d` (Unidades vendidas)
  - `attributedSalesSameSku14d`, `purchasesSameSku14d` (Vendas e pedidos do mesmo SKU anunciado)

---

## 4. Mapeamento de Permissões

| Ação Pretendida | Escopo OAuth (LwA) | Permissão de Conta (Advertising Console) |
|---|---|---|
| **Leitura de Campanhas** | `advertising::campaign_management` | `advertiser_campaign_view` ou `advertiser_campaign_edit` |
| **Leitura de Métricas / KPIs** | `advertising::campaign_management` | `advertiser_campaign_view` ou `reporting` |
| **Geração de Relatórios Assíncronos** | `advertising::campaign_management` | `reporting` ou `advertiser_campaign_view` |
| **Fase 2: Alteração de Orçamentos e Lances** | `advertising::campaign_management` | `advertiser_campaign_edit` |
| **Fase 2: Pausa e Ativação de Campanhas** | `advertising::campaign_management` | `advertiser_campaign_edit` |

---

## 5. Tratamento de Erros e Rate Limiting

- **HTTP 401 Unauthorized**:
  - Token de acesso expirado ou Client ID inválido. A aplicação captura e dispara renovação via `refreshAccessToken` ou marca a conta como `EXPIRED`.
- **HTTP 403 Forbidden**:
  - Usuário não tem permissão para acessar o `profileId` solicitado ou o Developer Profile ainda não foi aprovado para aquela região.
- **HTTP 429 Too Many Requests (Rate Limiting)**:
  - O sistema lê o header `Retry-After` retornado pela Amazon.
  - Implementa *exponential backoff* automático de até 3 tentativas antes de falhar.

---

## 6. Segurança e Proteção de Dados

1. **Client Secret e Tokens**: Nunca trafegam para o frontend. Não há variáveis com prefixo `NEXT_PUBLIC_` para credenciais sensíveis.
2. **Sanitização de Logs**: Todas as mensagens de erro em chamadas OAuth e de API ocultam tokens e payloads confidenciais.
3. **Isolamento de Dados no Banco**: Os registros de campanhas, métricas e relatórios são indexados e isolados por `accountId` e `userId`.
