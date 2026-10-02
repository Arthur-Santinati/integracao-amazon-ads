'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Radio,
  Database,
  User as UserIcon,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountInfo {
  id: string;
  accountName: string;
  marketplaceId?: string;
  region: string;
  currency: string;
  isDemo: boolean;
  status: string;
  tokenExpiresAt?: string;
  hasToken?: boolean;
}

export function Header() {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const fetchAccount = async () => {
    try {
      const res = await fetch('/api/account');
      if (res.ok) {
        const data = await res.json();
        setAccount(data.account);
      }
    } catch (e) {
      console.error('Falha ao carregar conta no header:', e);
    }
  };

  useEffect(() => {
    fetchAccount();
  }, []);

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      if (res.ok) {
        setSeedSuccess(true);
        await fetchAccount();
        // Trigger window reload or state refresh
        setTimeout(() => {
          setSeedSuccess(false);
          window.location.reload();
        }, 1200);
      }
    } catch (e) {
      console.error('Erro ao gerar demo:', e);
    } finally {
      setSeeding(false);
    }
  };

  const getStatusBadge = (status?: string, isDemo?: boolean) => {
    if (isDemo) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Ambiente DEMO
        </span>
      );
    }

    switch (status) {
      case 'CONNECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            Conectada
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            Token Expirado
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            Erro de Conexão
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/60 text-slate-300 border border-slate-600/50">
            <Radio className="w-3 h-3 text-slate-400" />
            Não Conectada
          </span>
        );
    }
  };

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between z-10 sticky top-0">
      {/* Account Info */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-100">
              {account?.accountName || 'Carregando conta...'}
            </span>
            {account?.marketplaceId && (
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {account.region} • {account.currency}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">
            {account?.isDemo
              ? 'Dados de simulação (30 dias)'
              : account?.hasToken
              ? 'Conexão direta com Amazon Ads API'
              : 'Dados via importação de relatórios'}
          </span>
        </div>

        <div className="ml-2">{getStatusBadge(account?.status, account?.isDemo)}</div>
      </div>

      {/* Actions & User */}
      <div className="flex items-center gap-3">
        {/* Quick Demo Seed Button */}
        <button
          onClick={handleSeedDemo}
          disabled={seeding || seedSuccess}
          title="Carrega ou atualiza um conjunto de dados realistas de demonstração para testes"
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
            seedSuccess
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-800 hover:bg-slate-700/80 text-slate-200 border-slate-700 hover:border-slate-600'
          )}
        >
          {seeding ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Gerando Dados DEMO...</span>
            </>
          ) : seedSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dados Carregados!</span>
            </>
          ) : (
            <>
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>Carregar Dados DEMO</span>
            </>
          )}
        </button>

        {/* User Profile Capsule */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-medium text-slate-200">Vendedor Amazon</span>
            <span className="text-[10px] text-slate-400">vendedor@exemplo.com.br</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
