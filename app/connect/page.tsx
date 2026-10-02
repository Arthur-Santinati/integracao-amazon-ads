'use client';

import React, { useState, useEffect } from 'react';
import {
  Link2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Radio,
  ExternalLink,
  CheckCircle2,
  Lock,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react';
import Link from 'next/link';

export default function ConnectAmazonPage() {
  const [account, setAccount] = useState<any>(null);
  const [region, setRegion] = useState('NA');
  const [authConfigured, setAuthConfigured] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const fetchStatus = async () => {
    try {
      const [accRes, urlRes] = await Promise.all([
        fetch('/api/account'),
        fetch(`/api/auth/amazon/url?region=${region}`),
      ]);

      if (accRes.ok) {
        const data = await accRes.json();
        setAccount(data.account);
      }

      if (urlRes.ok) {
        const data = await urlRes.json();
        setAuthConfigured(data.configured);
        setAuthUrl(data.url);
      }
    } catch (e) {
      console.error('Erro ao verificar status OAuth:', e);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Check URL query parameters for feedback from OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setFeedback({
        type: 'success',
        message: 'Conta Amazon conectada com sucesso via OAuth 2.0 oficial!',
      });
    } else if (params.get('error')) {
      setFeedback({
        type: 'error',
        message: decodeURIComponent(params.get('error') || 'Erro na autorização da Amazon'),
      });
    }
  }, [region]);

  const handleConnect = () => {
    if (!authConfigured) {
      alert(
        'As credenciais AMAZON_ADS_CLIENT_ID e AMAZON_ADS_CLIENT_SECRET ainda não foram preenchidas no arquivo .env local.'
      );
      return;
    }
    if (authUrl) {
      window.location.href = authUrl;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Link2 className="w-5 h-5 text-amber-400" />
          Conectar Amazon Ads API
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Integração oficial via OAuth 2.0 (Login with Amazon / Amazon Advertising API).
        </p>
      </div>

      {/* URL feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Connection Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-white mb-4">Estado Atual da Conexão</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Status da Conexão
            </span>
            <div className="mt-2">
              {account?.status === 'CONNECTED' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Conectada
                </span>
              ) : account?.status === 'EXPIRED' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Token Expirado
                </span>
              ) : account?.status === 'ERROR' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Erro de Conexão
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  <Radio className="w-3 h-3 text-slate-400" />
                  Não Conectada
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Conta Ativa
            </span>
            <span className="text-sm font-semibold text-slate-100 mt-2 block truncate">
              {account?.accountName || 'Nenhuma conta'}
            </span>
            <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
              Região: {account?.region || 'NA'} • {account?.currency || 'BRL'}
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Modo de Operação
            </span>
            <span className="text-sm font-semibold text-amber-400 mt-2 block">
              {account?.isDemo ? 'Demonstração (DEMO)' : 'Produção'}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {account?.hasToken ? 'Tokens OAuth armazenados' : 'Aguardando credenciais'}
            </span>
          </div>
        </div>

        {/* Region Selector & Connect Button */}
        <div className="border-t border-slate-800 pt-6">
          <label className="text-xs font-semibold text-slate-300 block mb-2">
            Selecione a Região de Anúncios da Amazon:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[
              {
                id: 'NA',
                title: 'América do Norte & Brasil',
                desc: 'Brasil, EUA, Canadá e México',
              },
              {
                id: 'EU',
                title: 'Europa',
                desc: 'Reino Unido, Alemanha, França, etc.',
              },
              {
                id: 'FE',
                title: 'Extremo Oriente',
                desc: 'Japão, Austrália, Cingapura',
              },
            ].map((reg) => (
              <button
                key={reg.id}
                type="button"
                onClick={() => setRegion(reg.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  region === reg.id
                    ? 'border-amber-500 bg-amber-500/10 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between">
                  <span>{reg.title}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800">
                    {reg.id}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{reg.desc}</div>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Conexão criptografada. Client Secret e Access Tokens nunca são expostos no navegador.
              </span>
            </div>

            <button
              onClick={handleConnect}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Conectar Conta Amazon</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fallback Notice */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
        <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-amber-400" />
          Acesso à API ainda em processo de aprovação pela Amazon?
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">
          A aprovação de um Developer Profile na Amazon Ads API pode levar alguns dias. Enquanto seu acesso
          oficial não estiver homologado pela Amazon, você pode utilizar normalmente todas as funcionalidades
          (Dashboard, Gráficos, Produtos e Chat com Gemini) através da importação de relatórios CSV oficiais.
        </p>

        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold"
        >
          <span>Ir para a área de importação de CSV</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
