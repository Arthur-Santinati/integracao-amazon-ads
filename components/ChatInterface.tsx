'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User as UserIcon,
  Sparkles,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react';
import { ChatMessageItem } from '@/types/chat';

const quickPrompts = [
  'Como estão minhas campanhas nos últimos 7 dias?',
  'Qual campanha está gastando mais?',
  'Qual campanha tem o pior ACOS?',
  'Qual produto tem o melhor ROAS?',
  'Quais campanhas estão gastando sem gerar vendas?',
  'Encontre possíveis desperdícios no meu orçamento.',
];

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, activeTool]);

  // Load chat history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/chat/history');
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
            setChatId(data.chatId);
          }
        }
      } catch (err) {
        console.error('Falha ao carregar histórico do chat:', err);
      }
    };

    fetchHistory();
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = textToSend || input;
    if (!messageContent.trim() || loading) return;

    const userMessage: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageContent.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setLoading(true);
    setActiveTool('Consultando ferramentas do Amazon Ads...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent.trim(),
          chatId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao processar resposta da IA');
      }

      setChatId(data.chatId);

      const aiMessage: ChatMessageItem = {
        id: data.message.id || `model-${Date.now()}`,
        role: 'model',
        content: data.message.content,
        toolCalls: data.message.toolCalls,
        createdAt: data.message.createdAt || new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessageItem = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `⚠️ Desculpe, não foi possível concluir a análise: ${err.message}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setActiveTool(null);
    }
  };

  const handleNewChat = async () => {
    try {
      if (chatId) {
        await fetch(`/api/chat/history?chatId=${chatId}`, { method: 'DELETE' });
      }
      setMessages([]);
      setChatId(null);
    } catch (e) {
      console.error('Erro ao resetar conversa:', e);
    }
  };

  const formatToolName = (toolName: string) => {
    switch (toolName) {
      case 'getMetrics':
        return 'Consultando métricas agregadas da conta';
      case 'getCampaigns':
        return 'Listando campanhas e orçamentos';
      case 'getCampaignPerformance':
        return 'Analisando gastos, vendas e ACOS das campanhas';
      case 'getProductPerformance':
        return 'Verificando desempenho de produtos anunciados';
      case 'getSpend':
        return 'Calculando investimento em anúncios';
      case 'getSales':
        return 'Verificando faturamento atribuído';
      case 'getWasteAnalysis':
        return 'Identificando desperdícios de orçamento';
      case 'getImportedReports':
        return 'Consultando relatórios importados';
      default:
        return `Executando consulta (${toolName})`;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Chat Top Bar */}
      <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-slate-950 shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
              Amazon Ads AI Analyst
              <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300">
                Gemini Function Calling
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Análise baseada estritamente em dados reais e relatórios da sua conta.
            </p>
          </div>
        </div>

        <button
          onClick={handleNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Nova Conversa</span>
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-12">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
              <Sparkles className="w-7 h-7" />
            </div>
            <h4 className="text-base font-semibold text-white mb-2">
              Converse com a IA sobre seus Anúncios
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              A IA utiliza <strong className="text-slate-300">Tool Calling oficial do Gemini</strong> para
              consultar suas campanhas, vendas, ACOS e ROAS diretamente no banco de dados. Nunca inventa métricas.
            </p>

            <div className="w-full text-left space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                Sugestões de perguntas:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/40 text-left text-xs text-slate-200 transition-all flex items-start gap-2 group"
                  >
                    <span className="text-amber-400 group-hover:translate-x-0.5 transition-transform">
                      →
                    </span>
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3.5 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-400 text-slate-950 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl px-5 py-3.5 text-xs leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-amber-500 text-slate-950 font-medium'
                    : 'bg-slate-800/80 border border-slate-700/60 text-slate-200'
                }`}
              >
                {/* Tool calls execution pills if present */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mb-3 space-y-1 pb-2.5 border-b border-slate-700/60">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                      Consultas ao Backend (Tool Calling):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.toolCalls.map((tc, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-amber-300 text-[10px] font-mono"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          {formatToolName(tc.name)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="whitespace-pre-wrap">{msg.content}</div>

                <div
                  className={`mt-2 text-[10px] text-right ${
                    msg.role === 'user' ? 'text-slate-900/70' : 'text-slate-500'
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading / Tool executing state */}
        {loading && (
          <div className="flex gap-3.5 justify-start">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-400 text-slate-950 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-4 py-3 text-xs text-slate-300 flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
              <span>{activeTool || 'Analisando dados do Amazon Ads...'}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Pergunte sobre campanhas, ACOS, gastos, vendas ou desperdícios..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition-colors disabled:opacity-40 disabled:hover:bg-amber-500 shrink-0 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatInterface;
