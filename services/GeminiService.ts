import {
  GoogleGenerativeAI,
  FunctionDeclaration,
  Tool,
  ChatSession as GoogleChatSession,
  Part,
} from '@google/generative-ai';
import analyticsService from './AnalyticsService';
import prisma from '@/db/prisma';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export interface ChatCompletionResult {
  text: string;
  toolCallsExecuted: Array<{
    name: string;
    args: Record<string, any>;
    response: Record<string, any>;
  }>;
}

export class GeminiService {
  private apiKey: string;
  private modelName: string;
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    }
  }

  /**
   * Function calling tool definitions for Gemini
   */
  private getToolDeclarations(): Tool[] {
    const getMetrics: FunctionDeclaration = {
      name: 'getMetrics',
      description:
        'Obtém as principais métricas agregadas da conta de anúncios (gasto total, vendas, ACOS, ROAS, cliques, impressões, pedidos, CPC, CTR) para um período de dias.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          days: {
            type: 'NUMBER' as any,
            description: 'Número de dias passados para analisar (ex: 7 para últimos 7 dias, 14, 30). Padrão é 7.',
          },
        },
      },
    };

    const getCampaigns: FunctionDeclaration = {
      name: 'getCampaigns',
      description: 'Lista as campanhas existentes na conta com seus status e orçamentos diários.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          status: {
            type: 'STRING' as any,
            description: 'Filtro por status da campanha: ENABLED, PAUSED, ARCHIVED ou ALL. Padrão é ALL.',
          },
        },
      },
    };

    const getCampaignPerformance: FunctionDeclaration = {
      name: 'getCampaignPerformance',
      description:
        'Obtém o desempenho detalhado de campanhas (gasto, vendas, ACOS, ROAS, cliques, impressões, pedidos e CPC) no período.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          days: {
            type: 'NUMBER' as any,
            description: 'Período em dias passados (ex: 7, 14, 30). Padrão 7.',
          },
          campaignName: {
            type: 'STRING' as any,
            description: 'Nome ou parte do nome da campanha específica a filtrar (opcional).',
          },
          limit: {
            type: 'NUMBER' as any,
            description: 'Quantidade máxima de campanhas a retornar. Padrão é 10.',
          },
        },
      },
    };

    const getProductPerformance: FunctionDeclaration = {
      name: 'getProductPerformance',
      description:
        'Obtém o desempenho de produtos e ASINs anunciados (vendas, gasto, ACOS, ROAS, pedidos) no período.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          days: {
            type: 'NUMBER' as any,
            description: 'Período em dias passados (ex: 7, 14, 30). Padrão 7.',
          },
          asin: {
            type: 'STRING' as any,
            description: 'Código ASIN específico a filtrar (opcional).',
          },
          limit: {
            type: 'NUMBER' as any,
            description: 'Quantidade máxima de produtos a retornar. Padrão 10.',
          },
        },
      },
    };

    const getSpend: FunctionDeclaration = {
      name: 'getSpend',
      description: 'Obtém especificamente o gasto/investimento em publicidade no período.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          days: {
            type: 'NUMBER' as any,
            description: 'Número de dias passados. Padrão é 7.',
          },
          campaignName: {
            type: 'STRING' as any,
            description: 'Nome de campanha específica (opcional).',
          },
        },
      },
    };

    const getSales: FunctionDeclaration = {
      name: 'getSales',
      description: 'Obtém especificamente as vendas atribuídas às campanhas no período.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          days: {
            type: 'NUMBER' as any,
            description: 'Número de dias passados. Padrão é 7.',
          },
          campaignName: {
            type: 'STRING' as any,
            description: 'Nome de campanha específica (opcional).',
          },
        },
      },
    };

    const getImportedReports: FunctionDeclaration = {
      name: 'getImportedReports',
      description: 'Lista os relatórios CSV do Amazon Ads importados para a conta e o número de linhas.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {},
      },
    };

    const getWasteAnalysis: FunctionDeclaration = {
      name: 'getWasteAnalysis',
      description:
        'Identifica possíveis desperdícios de orçamento: campanhas com gasto e 0 vendas ou com ACOS extremamente alto.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          days: {
            type: 'NUMBER' as any,
            description: 'Período em dias passados. Padrão 30.',
          },
        },
      },
    };

    return [
      {
        functionDeclarations: [
          getMetrics,
          getCampaigns,
          getCampaignPerformance,
          getProductPerformance,
          getSpend,
          getSales,
          getImportedReports,
          getWasteAnalysis,
        ],
      },
    ];
  }

  /**
   * Executes a specific tool requested by Gemini
   */
  public async executeTool(
    name: string,
    args: Record<string, any>,
    accountId: string
  ): Promise<Record<string, any>> {
    const days = typeof args?.days === 'number' ? args.days : 7;
    const startDate = startOfDay(subDays(new Date(), days - 1));
    const endDate = endOfDay(new Date());

    switch (name) {
      case 'getMetrics': {
        const metrics = await analyticsService.getDashboardMetrics(accountId, startDate, endDate);
        const comparison = await analyticsService.getMetricComparison(accountId, days);
        return {
          periodDays: days,
          current: metrics,
          previousPeriod: comparison.previous,
          percentageChanges: comparison.percentageChanges,
        };
      }

      case 'getCampaigns': {
        const status = args?.status;
        const campaigns = await analyticsService.getCampaignRows(accountId, {
          status: status !== 'ALL' ? status : undefined,
        });
        return {
          totalCampaigns: campaigns.length,
          campaigns: campaigns.map((c) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            type: c.campaignType,
            dailyBudget: c.dailyBudget,
          })),
        };
      }

      case 'getCampaignPerformance': {
        const limit = args?.limit || 10;
        const search = args?.campaignName;
        const rows = await analyticsService.getCampaignRows(accountId, {
          search,
          startDate,
          endDate,
        });

        // Sort by spend descending
        rows.sort((a, b) => b.spend - a.spend);

        return {
          periodDays: days,
          totalCampaigns: rows.length,
          campaigns: rows.slice(0, limit),
        };
      }

      case 'getProductPerformance': {
        const limit = args?.limit || 10;
        const search = args?.asin;
        const rows = await analyticsService.getProductRows(accountId, {
          search,
          startDate,
          endDate,
        });

        rows.sort((a, b) => b.sales - a.sales);

        return {
          periodDays: days,
          totalProducts: rows.length,
          products: rows.slice(0, limit),
        };
      }

      case 'getSpend': {
        const rows = await analyticsService.getCampaignRows(accountId, {
          search: args?.campaignName,
          startDate,
          endDate,
        });
        const totalSpend = rows.reduce((acc, c) => acc + c.spend, 0);
        return {
          periodDays: days,
          totalSpend: Number(totalSpend.toFixed(2)),
          campaignCount: rows.length,
        };
      }

      case 'getSales': {
        const rows = await analyticsService.getCampaignRows(accountId, {
          search: args?.campaignName,
          startDate,
          endDate,
        });
        const totalSales = rows.reduce((acc, c) => acc + c.sales, 0);
        return {
          periodDays: days,
          totalSales: Number(totalSales.toFixed(2)),
          campaignCount: rows.length,
        };
      }

      case 'getImportedReports': {
        const reports = await prisma.importedReport.findMany({
          where: { accountId },
          orderBy: { importedAt: 'desc' },
          take: 5,
        });
        return {
          totalReports: reports.length,
          reports: reports.map((r) => ({
            id: r.id,
            fileName: r.fileName,
            rowCount: r.rowCount,
            importedAt: r.importedAt,
            startDate: r.startDate,
            endDate: r.endDate,
          })),
        };
      }

      case 'getWasteAnalysis': {
        const wasteDays = typeof args?.days === 'number' ? args.days : 30;
        const wasteStart = startOfDay(subDays(new Date(), wasteDays - 1));
        const waste = await analyticsService.getWasteAnalysis(accountId, wasteStart, endDate);
        return {
          periodDays: wasteDays,
          detectedWasteItems: waste,
          totalWastedSpend: Number(waste.reduce((acc, w) => acc + w.spend, 0).toFixed(2)),
        };
      }

      default:
        return { error: `Ferramenta '${name}' desconhecida.` };
    }
  }

  /**
   * Builds the strict system prompt for the Amazon Ads AI Analyst
   */
  private buildSystemInstruction(accountContext: {
    accountName: string;
    isDemo: boolean;
    currency: string;
  }): string {
    return `Você é o Amazon Ads AI Analyst, um especialista sênior em publicidade digital da Amazon (Sponsored Products, Sponsored Brands e Sponsored Display).

Seu papel é analisar com precisão matemática, clareza e objetividade as campanhas do usuário.

CONTEXTO DA CONTA:
- Nome da Conta: ${accountContext.accountName}
- Modo: ${accountContext.isDemo ? 'AMBIENTE DE DEMONSTRAÇÃO (DEMO DATASET)' : 'DADOS REAIS / IMPORTADOS'}
- Moeda: ${accountContext.currency}

REGRAS ABSOLUTAS:
1. NUNCA INVENTE DADOS OU NÚMEROS. Todas as métricas (gasto, vendas, ACOS, ROAS, cliques, CPC) DEVEM ser obrigatoriamente consultadas através das ferramentas de backend disponíveis (ex: getMetrics, getCampaignPerformance, getWasteAnalysis).
2. Se a conta for DEMO, destaque no início ou final que a análise é baseada em dados do dataset de demonstração.
3. Se não houver dados no período solicitado ou os dados forem insuficientes, informe isso educadamente e sugira importar um relatório CSV ou selecionar outro período.
4. Explique as métricas de forma prática para o vendedor:
   - ACOS (Advertising Cost of Sales = Gasto / Vendas): menor é mais eficiente.
   - ROAS (Return on Ad Spend = Vendas / Gasto): maior é mais eficiente (ROAS = 100 / ACOS).
   - CPC (Custo por Clique): custo médio de cada visita qualificada.
5. Sempre aponte:
   - Pontos fortes (campanhas com bom ROAS e volume)
   - Oportunidades de economia (campanhas com gasto alto e poucas/nenhuma venda)
   - Próximos passos recomendados (ex: negativar termos, ajustar lances).
6. LEMBRETE IMPORTANTE: A aplicação atualmente está no MVP somente leitura. Deixe claro que recomendações de ação devem ser ajustadas manualmente pelo vendedor no console do Amazon Ads.`;
  }

  /**
   * Main chat completion with function calling loop
   */
  public async chat(
    accountId: string,
    userMessage: string,
    history: Array<{ role: 'user' | 'model'; content: string }> = []
  ): Promise<ChatCompletionResult> {
    const account = await prisma.amazonAccount.findUnique({
      where: { id: accountId },
    });

    const accountContext = {
      accountName: account?.accountName || 'Conta Padrão',
      isDemo: account?.isDemo ?? true,
      currency: account?.currency || 'BRL',
    };

    // If no GEMINI_API_KEY is configured in the environment
    if (!this.genAI) {
      return {
        text: `⚠️ **Chave da API do Gemini não configurada**\n\nPara habilitar a IA completa com function calling, defina a variável \`GEMINI_API_KEY\` no seu arquivo \`.env\`.\n\n*Modo fallback ativado:* Analisando dados da conta **${accountContext.accountName}** (${accountContext.isDemo ? 'DEMO' : 'PRODUÇÃO'}). Você pode conferir os números exatos nos cards e tabelas do Dashboard!`,
        toolCallsExecuted: [],
      };
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: this.buildSystemInstruction(accountContext),
        tools: this.getToolDeclarations(),
      });

      // Prepare history formatted for Gemini SDK
      const formattedHistory = history.map((h) => ({
        role: h.role,
        parts: [{ text: h.content }],
      }));

      const chatSession = model.startChat({
        history: formattedHistory,
      });

      const toolCallsExecuted: Array<{
        name: string;
        args: Record<string, any>;
        response: Record<string, any>;
      }> = [];

      let response = await chatSession.sendMessage(userMessage);
      let functionCalls = response.response.functionCalls();

      // Loop to handle function calling turns (Gemini asks -> backend responds -> repeat until final answer)
      let turnLimit = 5;
      while (functionCalls && functionCalls.length > 0 && turnLimit > 0) {
        turnLimit--;
        const functionResponses: Part[] = [];

        for (const call of functionCalls) {
          const toolResult = await this.executeTool(call.name, call.args, accountId);
          toolCallsExecuted.push({
            name: call.name,
            args: call.args,
            response: toolResult,
          });

          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: toolResult,
            },
          });
        }

        // Send tool results back to Gemini
        response = await chatSession.sendMessage(functionResponses);
        functionCalls = response.response.functionCalls();
      }

      const finalText = response.response.text();

      return {
        text: finalText,
        toolCallsExecuted,
      };
    } catch (error: any) {
      console.error('[GeminiService] Erro no processamento de chat:', error.message);
      return {
        text: `Ocorreu um erro ao consultar o Gemini: ${error.message}. Por favor, verifique sua chave de API e conexão.`,
        toolCallsExecuted: [],
      };
    }
  }
}

export const geminiService = new GeminiService();
export default geminiService;
