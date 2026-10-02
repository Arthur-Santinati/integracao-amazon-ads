# AmzAds AI - Análise de Anúncios da Amazon com Inteligência Artificial

Sistema de análise e inteligência de mídia paga para **Amazon Ads** com integração nativa com o **Google Gemini** via *Function Calling / Tool Calling*. Permite ao vendedor e ao gestor de tráfego conectar sua conta da Amazon, analisar métricas de campanhas (Gastos, Vendas, ACOS, ROAS, CPC, Conversão) e conversar com uma IA especialista que consulta os dados diretamente no banco de dados.

---

## 🎯 Objetivo do MVP

Criar um sistema de alta performance, seguro e modular para visualização e auditoria de anúncios:
- **Dashboard analítico**: KPIs, comparação de períodos e evolução temporal de gastos, vendas, ACOS e ROAS.
- **Chat com IA (Gemini)**: Interpretação de perguntas em linguagem natural com consulta dinâmica ao backend via Tool Calling. A IA nunca inventa dados.
- **Integração oficial Amazon Ads (v3)**: Estrutura auditada e preparada para OAuth 2.0 (Login with Amazon), Profiles v2, Sponsored Products v3 (`POST /sp/campaigns/list`) e Reporting API v3 / Unified.
- **Importação de relatórios CSV**: Fallback funcional e robusto enquanto a aprovação da Amazon Ads API estiver em análise.
- **Dataset DEMO integrado**: Ambiente de testes com dados simulados realistas de 30 dias claramente identificado como `[DEMO]`.
- **Arquitetura preparada para o futuro**: Abstrações prontas para operações de escrita (ajuste de lances, orçamentos e pausa de campanhas) na Fase 2.

> **Importante**: No MVP atual, o sistema é **estritamente de leitura e análise**. Nenhuma alteração direta em contas ou orçamentos é disparada.

---

## 🛠️ Stack Tecnológica

- **Frontend & Backend**: Next.js 14 (App Router) + TypeScript + React 18
- **Estilização**: Tailwind CSS com tema escuro profissional
- **Ícones & Gráficos**: Lucide React + Recharts
- **Banco de Dados**: PostgreSQL 16 + Prisma ORM
- **IA**: Google Gemini API (`@google/generative-ai`) com *Function Calling*
- **Importação CSV**: PapaParse com detecção automática de colunas em Português e Inglês
- **Testes Unitários**: Vitest (24 testes cobrindo cálculos, CSV, OAuth, v3 campaigns, reporting lifecycle, rate limit e erros 401/403/429)
- **Containerização**: Docker & Docker Compose para PostgreSQL

---

## 📁 Estrutura do Projeto

```
/
├── app/                        # Next.js App Router (Páginas e Endpoints API)
│   ├── api/
│   │   ├── account/            # Dados da conta e status da conexão
│   │   ├── analytics/dashboard # Métricas agregadas, comparações e séries temporais
│   │   ├── auth/amazon/        # Geração de URL OAuth e callback de autorização
│   │   ├── campaigns/          # Consulta e listagem de campanhas
│   │   ├── chat/               # Processamento do chat com Gemini e histórico
│   │   ├── demo/seed/          # Gerador do dataset de demonstração
│   │   ├── products/           # Consulta de desempenho de ASINs
│   │   └── reports/            # Upload e processamento de relatórios CSV
│   ├── campaigns/              # Página dedicada de campanhas
│   ├── chat/                   # Página do assistente de IA
│   ├── connect/                # Página de conexão OAuth com a Amazon
│   ├── products/               # Página de produtos e ASINs
│   ├── reports/                # Página de importação de CSV
│   ├── settings/               # Configurações do sistema e gerenciamento de DEMO
│   ├── globals.css             # Estilos globais Tailwind
│   ├── layout.tsx              # Layout raiz com Sidebar e Header
│   └── page.tsx                # Dashboard principal
├── components/                 # Componentes reutilizáveis de UI
│   ├── CampaignTable.tsx       # Tabela de campanhas com filtros
│   ├── ChatInterface.tsx       # Interface de chat com IA e badges de consulta
│   ├── CsvUploader.tsx         # Upload com drag-and-drop e modelo CSV
│   ├── Header.tsx              # Cabeçalho com status da conexão
│   ├── MetricCard.tsx          # Card de KPI com cálculo de delta percentual
│   ├── PerformanceChart.tsx    # Gráfico diário interativo (Gastos, Vendas, ACOS, ROAS)
│   ├── ProductTable.tsx        # Tabela de métricas por produto (ASIN/SKU)
│   └── Sidebar.tsx             # Menu lateral de navegação
├── db/                         # Instância singleton do Prisma Client
├── docs/
│   └── AMAZON_ADS_INTEGRATION.md # Auditoria e documentação detalhada da API da Amazon
├── lib/
│   ├── session.ts              # Gerenciador de sessão local/DEMO com fallback
│   └── utils.ts                # Utilitários de formatação (moeda BRL, %, ROAS)
├── prisma/
│   └── schema.prisma           # Modelagem de banco de dados relacional
├── services/                   # Camada de serviços de negócio independentes
│   ├── AmazonAdsService.ts     # Chamadas à API da Amazon (v3, reporting, retry 429) e Fase 2
│   ├── AmazonOAuthService.ts   # Autenticação OAuth 2.0 e renovação de tokens
│   ├── AnalyticsService.ts     # Cálculos matemáticos de ACOS, ROAS, CPC e DEMO seeder
│   ├── GeminiService.ts        # Integração oficial com Gemini e Tool Calling
│   └── ReportImportService.ts  # Parsing, normalização e deduplicação de CSV
├── tests/                      # Suíte de testes unitários (Vitest)
│   ├── amazon.test.ts          # 15 testes de OAuth, v3, reporting, 401/403/429
│   ├── analytics.test.ts       # Testes de matemática e métricas
│   └── reports.test.ts         # Testes de parsing e normalização de CSV
├── docker-compose.yml          # Container PostgreSQL local
├── .env.example                # Modelo de variáveis de ambiente
└── vitest.config.mjs           # Configuração de testes Vitest
```

---

## 🚀 Instalação e Execução Local

### 1. Clonar e Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```
Edite `.env`:
- `DATABASE_URL`: `postgresql://postgres:postgrespassword@localhost:5432/amazon_ads_db?schema=public`
- `GEMINI_API_KEY`: Chave do Google AI Studio ([obtenha gratuitamente aqui](https://aistudio.google.com/))
- `GEMINI_MODEL`: `gemini-1.5-flash`
- `AMAZON_ADS_CLIENT_ID`: Client ID do Login with Amazon (LwA)
- `AMAZON_ADS_CLIENT_SECRET`: Client Secret da Amazon (mantido seguro)
- `AMAZON_ADS_REDIRECT_URI`: `http://localhost:3000/api/auth/amazon/callback`
- `AMAZON_ADS_REGION`: `NA` (Brasil, EUA, Canadá, México)

### 3. Iniciar o Banco de Dados PostgreSQL (via Docker)
```bash
docker compose up -d
```

### 4. Executar Migrações do Prisma
```bash
npx prisma db push
```

### 5. Iniciar o Servidor
```bash
npm run dev
```
Acesse `http://localhost:3000` no seu navegador.

---

## 🔑 Como Configurar as Credenciais e Testar a Conexão Real da Amazon

### Passo 1: Cadastro no Amazon Ads Developer
1. Acesse o [Amazon Advertising Developer Console](https://advertising.amazon.com/).
2. Solicite o cadastro como desenvolvedor (Direct Advertiser para sua própria marca/loja, ou Partner se for ferramenta de terceiros).

### Passo 2: Criar o Security Profile no Login with Amazon (LwA)
1. Acesse o [Developer Console do Login with Amazon](https://developer.amazon.com/loginwithamazon/console/site/lwa/overview.html).
2. Clique em **Create a New Security Profile**.
3. Preencha o nome e a descrição da sua aplicação.
4. Na aba **Web Settings**, clique em **Edit** e adicione em **Allowed Return URLs**:
   ```
   http://localhost:3000/api/auth/amazon/callback
   ```
5. Copie o **Client ID** e o **Client Secret** gerados.
6. Cole-os no seu arquivo `.env`:
   ```env
   AMAZON_ADS_CLIENT_ID="amzn1.application-oa2-client.sua_chave"
   AMAZON_ADS_CLIENT_SECRET="amzn1.oa2-cs.v1.seu_secret"
   AMAZON_ADS_REDIRECT_URI="http://localhost:3000/api/auth/amazon/callback"
   AMAZON_ADS_REGION="NA"
   ```

### Passo 3: Autorizar e Testar
1. Inicie a aplicação (`npm run dev`) e vá até a aba **Conectar Amazon** (`http://localhost:3000/connect`).
2. Selecione a região **América do Norte & Brasil (NA)**.
3. Clique em **Conectar Conta Amazon**.
4. Faça login com as credenciais da conta do anunciante na Amazon e autorize os escopos de `advertising::campaign_management`.
5. A Amazon redirecionará para seu callback local, que armazenará o par de tokens de forma segura e listará os perfis da conta via `GET /v2/profiles`.

---

## 🤖 Como Funciona o Chat com IA (Gemini Function Calling)

A integração com o Gemini utiliza **Tool Calling oficial**, conectando o modelo diretamente com o banco de dados da sua conta:

```
Usuário: "Quais campanhas estão gastando sem gerar vendas?"
  ↓
Gemini interpreta a pergunta e decide chamar:
  Tool: getWasteAnalysis({ days: 30 })
  ↓
Backend executa a consulta no PostgreSQL via AnalyticsService
  Retorna: [{ campaignName: "SP - Cabo USB-C Blindado", spend: 45.00, sales: 0, clicks: 35 }]
  ↓
Gemini recebe o resultado e sintetiza a resposta objetiva para o vendedor
  "Identifiquei 1 campanha com desperdício de orçamento nos últimos 30 dias..."
```

---

## 🧪 Executando os Testes

O projeto conta com suíte de testes completa com **Vitest**:
```bash
npm test
```
Resultados:
- **`tests/amazon.test.ts` (15 testes)**: Validação de URLs regionais de auth e token (NA, EU, FE), escopo obrigatório `advertising::campaign_management`, refresh token com retorno de 3600s, Profiles v2 sem Scope header, Sponsored Products v3 (`POST /sp/campaigns/list`) com `application/vnd.spCampaign.v3+json`, Reporting API v3 (`POST /reporting/reports`, `GET /reporting/reports/{reportId}` e download S3), tratamento de erros HTTP 401, 403 e 429 com `Retry-After`, e abstrações seguras de escrita da Fase 2.
- **`tests/reports.test.ts` (6 testes)**: Identificação automática de colunas em português e inglês, normalização de moedas brasileiras e americanas, parsing de datas e deduplicação.
- **`tests/analytics.test.ts` (3 testes)**: Precisão matemática de ACOS, ROAS, CPC, CTR, conversão e proteção contra divisão por zero.

---

## 📄 Documentação Técnica da Amazon

Para especificações detalhadas de endpoints, payloads e cabeçalhos de requisição, consulte o arquivo:
[`docs/AMAZON_ADS_INTEGRATION.md`](file:///c:/Users/Windows/Desktop/Arthur%20-%20Trabalho/Projetos/Projetos%20Pessoais/integracao-amazon-ads/docs/AMAZON_ADS_INTEGRATION.md).
