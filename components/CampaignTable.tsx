'use client';

import React, { useState } from 'react';
import { CampaignRow } from '@/types/analytics';
import { formatCurrency, formatPercent, formatRoas, formatNumber } from '@/lib/utils';
import { Search, Filter, AlertCircle, CheckCircle2, PauseCircle } from 'lucide-react';

interface CampaignTableProps {
  campaigns: CampaignRow[];
  currency?: string;
  isDemo?: boolean;
}

export function CampaignTable({ campaigns, currency = 'BRL', isDemo = false }: CampaignTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome da campanha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ENABLED">Ativas (Enabled)</option>
              <option value="PAUSED">Pausadas (Paused)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-400">
          <span>{filteredCampaigns.length} campanhas exibidas</span>
          {isDemo && (
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
              DEMO
            </span>
          )}
        </div>
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-4 py-3">Campanha</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Gasto</th>
              <th className="px-4 py-3 text-right">Vendas</th>
              <th className="px-4 py-3 text-right">ACOS</th>
              <th className="px-4 py-3 text-right">ROAS</th>
              <th className="px-4 py-3 text-right">Cliques</th>
              <th className="px-4 py-3 text-right">Impressões</th>
              <th className="px-4 py-3 text-right">Pedidos</th>
              <th className="px-4 py-3 text-right">CPC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {filteredCampaigns.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                  Nenhuma campanha encontrada com os filtros aplicados.
                </td>
              </tr>
            ) : (
              filteredCampaigns.map((camp) => {
                const isWasting = camp.spend > 25 && camp.sales === 0;
                const isHighAcos = camp.acos > 50;

                return (
                  <tr
                    key={camp.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-100 group-hover:text-amber-300 transition-colors">
                          {camp.name}
                        </span>
                        {isWasting && (
                          <span
                            title="Atenção: Gasto sem conversão de vendas"
                            className="inline-flex items-center text-rose-400"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {camp.campaignType.replace('_', ' ')}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {camp.status === 'ENABLED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Ativa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                          <PauseCircle className="w-3 h-3" />
                          Pausada
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-medium text-slate-100">
                      {formatCurrency(camp.spend, currency)}
                    </td>

                    <td className="px-4 py-3 text-right font-medium text-emerald-400">
                      {formatCurrency(camp.sales, currency)}
                    </td>

                    <td className="px-4 py-3 text-right font-medium">
                      <span
                        className={
                          isHighAcos
                            ? 'text-rose-400 font-semibold'
                            : camp.acos > 0 && camp.acos <= 25
                            ? 'text-emerald-400 font-semibold'
                            : 'text-slate-300'
                        }
                      >
                        {camp.sales > 0 ? formatPercent(camp.acos) : 'N/A'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-medium">
                      <span
                        className={
                          camp.roas >= 4
                            ? 'text-emerald-400 font-semibold'
                            : camp.roas < 1.5 && camp.spend > 0
                            ? 'text-rose-400'
                            : 'text-slate-300'
                        }
                      >
                        {formatRoas(camp.roas)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right text-slate-300">
                      {formatNumber(camp.clicks)}
                    </td>

                    <td className="px-4 py-3 text-right text-slate-400">
                      {formatNumber(camp.impressions)}
                    </td>

                    <td className="px-4 py-3 text-right font-medium text-slate-200">
                      {formatNumber(camp.orders)}
                    </td>

                    <td className="px-4 py-3 text-right text-slate-400">
                      {formatCurrency(camp.cpc, currency)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CampaignTable;
