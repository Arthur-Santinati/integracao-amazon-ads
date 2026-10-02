'use client';

import React, { useState } from 'react';
import {
  Settings,
  Database,
  Key,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export default function SettingsPage() {
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSeed = async () => {
    setSeeding(true);
    setMessage(null);
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage('Dataset DEMO gerado com sucesso! 10 campanhas e 30 dias de métricas carregados.');
      } else {
        setMessage(`Erro: ${data.error}`);
      }
    } catch (e: any) {
      setMessage(`Erro: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-amber-400" />
          Configurações do Sistema
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Gerenciamento de credenciais, ambiente local e dados de demonstração.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Dataset Demo Management */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-400" />
          Gerenciamento do Dataset de Demonstração (DEMO)
        </h3>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Gera 10 campanhas simuladas realistas (Sponsored Products, Sponsored Brands e Sponsored Display)
          com 30 dias de métricas de impressões, cliques, vendas, pedidos e casos de desperdício para testar o
          Dashboard e o Chat com o Gemini.
        </p>

        <button
          onClick={handleSeed}
          disabled={seeding}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-50"
        >
          {seeding ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Gerando Dados...</span>
            </>
          ) : (
            <>
              <Database className="w-3.5 h-3.5" />
              <span>Carregar / Reiniciar Dataset DEMO</span>
            </>
          )}
        </button>
      </div>

      {/* Environment Variables Reference */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-400" />
          Variáveis de Ambiente Necessárias (.env)
        </h3>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Configure as seguintes chaves em seu arquivo <code className="text-amber-300">.env</code> para habilitar
          os serviços em produção:
        </p>

        <div className="space-y-3">
          {[
            {
              key: 'DATABASE_URL',
              desc: 'Conexão PostgreSQL (Docker ou local)',
              example: 'postgresql://postgres:postgrespassword@localhost:5432/amazon_ads_db?schema=public',
            },
            {
              key: 'GEMINI_API_KEY',
              desc: 'Chave da API do Google AI Studio para o Chat inteligente com function calling',
              example: 'AIzaSy...',
            },
            {
              key: 'AMAZON_ADS_CLIENT_ID',
              desc: 'Client ID do Login with Amazon (LwA) aprovado no Amazon Advertising',
              example: 'amzn1.application-oa2-client....',
            },
            {
              key: 'AMAZON_ADS_CLIENT_SECRET',
              desc: 'Client Secret do Login with Amazon (nunca compartilhe ou comite)',
              example: 'amzn1.oa2-cs.v1....',
            },
            {
              key: 'AMAZON_ADS_REDIRECT_URI',
              desc: 'URI de redirecionamento configurada no console da Amazon',
              example: 'http://localhost:3000/api/auth/amazon/callback',
            },
          ].map((item) => (
            <div key={item.key} className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-amber-300">{item.key}</span>
                <span className="text-[10px] text-slate-400">{item.desc}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-1 truncate">
                Exemplo: {item.example}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
