'use client';

import React, { useState, useEffect } from 'react';
import CampaignTable from '@/components/CampaignTable';
import { CampaignRow } from '@/types/analytics';
import { Megaphone, Calendar, AlertCircle } from 'lucide-react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [days, setDays] = useState(30);
  const [isDemo, setIsDemo] = useState(false);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`/api/campaigns?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
        setIsDemo(data.isDemo ?? false);
      }
    } catch (e) {
      console.error('Falha ao carregar campanhas:', e);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [days]);

  return (
    <div className="space-y-6">
      {/* Title & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Megaphone className="w-5 h-5 text-amber-400" />
            Campanhas Publicitárias
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Análise detalhada de investimento, ACOS e conversões por campanha.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto text-xs">
          <span className="px-2 text-slate-400 flex items-center gap-1 text-[11px] font-medium">
            <Calendar className="w-3.5 h-3.5" />
            Janela:
          </span>
          {[
            { label: '7 Dias', val: 7 },
            { label: '14 Dias', val: 14 },
            { label: '30 Dias', val: 30 },
            { label: '60 Dias', val: 60 },
          ].map((d) => (
            <button
              key={d.val}
              onClick={() => setDays(d.val)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                days === d.val
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notice about Read-Only MVP */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2.5">
        <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
        <span>
          <strong>Modo Somente Leitura:</strong> Ações de alteração de orçamento diário e lances estão
          bloqueadas neste MVP. Ajustes devem ser feitos diretamente no console do Amazon Ads.
        </span>
      </div>

      <CampaignTable campaigns={campaigns} isDemo={isDemo} />
    </div>
  );
}
