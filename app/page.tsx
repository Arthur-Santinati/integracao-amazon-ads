'use client';

import React, { useState, useEffect } from 'react';
import MetricCard from '@/components/MetricCard';
import PerformanceChart from '@/components/PerformanceChart';
import CampaignTable from '@/components/CampaignTable';
import {
  DollarSign,
  TrendingUp,
  Percent,
  Award,
  Eye,
  MousePointerClick,
  ShoppingBag,
  Target,
  Sparkles,
  Info,
  Calendar,
} from 'lucide-react';
import { formatCurrency, formatPercent, formatRoas, formatNumber } from '@/lib/utils';
import { CampaignRow, DailyChartPoint, DashboardMetrics, MetricComparison } from '@/types/analytics';
import Link from 'next/link';

export default function DashboardPage() {
  const [range, setRange] = useState('7d');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [comparison, setComparison] = useState<MetricComparison | null>(null);
  const [chartData, setChartData] = useState<DailyChartPoint[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [isDemo, setIsDemo] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [dashRes, campRes] = await Promise.all([
        fetch(`/api/analytics/dashboard?range=${range}`),
        fetch(`/api/campaigns?days=${range === '7d' ? 7 : range === '14d' ? 14 : range === '30d' ? 30 : 60}`),
      ]);

      if (dashRes.ok) {
        const dashData = await dashRes.json();
        setMetrics(dashData.metrics);
        setComparison(dashData.comparison);
        setChartData(dashData.chart || []);
        setIsDemo(dashData.account?.isDemo ?? true);
      }

      if (campRes.ok) {
        const campData = await campRes.json();
        setCampaigns(campData.campaigns || []);
      }
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [range]);

  return (
    <div className="space-y-6">
      {/* Top Banner if DEMO */}
      {isDemo && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-200">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <strong className="font-semibold text-amber-300">Ambiente de Demonstração (DEMO):</strong>{' '}
              Os dados exibidos são simulados para ilustrar a análise do sistema. Conecte sua conta oficial da
              Amazon ou importe um relatório CSV para visualizar métricas reais.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/reports"
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-medium transition-colors"
            >
              Importar CSV Real
            </Link>
          </div>
        </div>
      )}

      {/* Header Bar with Title and Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Visão Geral de Anúncios</h1>
          <p className="text-xs text-slate-400 mt-1">
            Métricas de desempenho consolidado de Sponsored Products, Brands e Display.
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto text-xs">
          <span className="px-2 text-slate-400 flex items-center gap-1 text-[11px] font-medium">
            <Calendar className="w-3.5 h-3.5" />
            Período:
          </span>
          {[
            { label: 'Últimos 7 dias', val: '7d' },
            { label: 'Últimos 14 dias', val: '14d' },
            { label: 'Últimos 30 dias', val: '30d' },
            { label: 'Últimos 60 dias', val: '60d' },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => setRange(item.val)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                range === item.val
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Gasto Total"
          value={formatCurrency(metrics?.spend)}
          change={comparison?.percentageChanges.spend}
          icon={DollarSign}
          subtitle={`Anterior: ${formatCurrency(comparison?.previous.spend)}`}
        />

        <MetricCard
          title="Vendas Atribuídas"
          value={formatCurrency(metrics?.sales)}
          change={comparison?.percentageChanges.sales}
          icon={TrendingUp}
          subtitle={`Anterior: ${formatCurrency(comparison?.previous.sales)}`}
        />

        <MetricCard
          title="ACOS Médio"
          value={metrics?.sales ? formatPercent(metrics?.acos) : '0,00%'}
          change={comparison?.percentageChanges.acos}
          invertChangeColors={true}
          icon={Percent}
          subtitle="Gasto / Vendas (Menor é melhor)"
        />

        <MetricCard
          title="ROAS Geral"
          value={formatRoas(metrics?.roas)}
          change={comparison?.percentageChanges.roas}
          icon={Award}
          subtitle="Vendas / Gasto (Maior é melhor)"
        />

        <MetricCard
          title="Impressões"
          value={formatNumber(metrics?.impressions)}
          change={comparison?.percentageChanges.impressions}
          icon={Eye}
          subtitle={`CTR médio: ${formatPercent(metrics?.ctr)}`}
        />

        <MetricCard
          title="Cliques"
          value={formatNumber(metrics?.clicks)}
          change={comparison?.percentageChanges.clicks}
          icon={MousePointerClick}
          subtitle={`CPC médio: ${formatCurrency(metrics?.cpc)}`}
        />

        <MetricCard
          title="Pedidos"
          value={formatNumber(metrics?.orders)}
          change={comparison?.percentageChanges.orders}
          icon={ShoppingBag}
          subtitle={`Taxa conv.: ${formatPercent(metrics?.conversionRate)}`}
        />

        <MetricCard
          title="CPC Médio"
          value={formatCurrency(metrics?.cpc)}
          change={comparison?.percentageChanges.cpc}
          invertChangeColors={true}
          icon={Target}
          subtitle="Custo por Clique"
        />
      </div>

      {/* AI Assistant Quick Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
            <Sparkles className="w-5 h-5 fill-slate-950" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">
              Quer uma auditoria inteligente de anúncios com Gemini?
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Descubra campanhas com desperdício de verba, produtos com melhor retorno e oportunidades de escala.
            </p>
          </div>
        </div>

        <Link
          href="/chat"
          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-2 transition-colors shrink-0 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Abrir Chat com IA</span>
        </Link>
      </div>

      {/* Chart Section */}
      <PerformanceChart data={chartData} />

      {/* Campaign Table Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Desempenho das Campanhas</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Detalhamento de métricas e eficiência por campanha no período.
            </p>
          </div>
          <Link
            href="/campaigns"
            className="text-xs text-amber-400 hover:text-amber-300 font-medium"
          >
            Ver todas as campanhas →
          </Link>
        </div>

        <CampaignTable campaigns={campaigns} isDemo={isDemo} />
      </div>
    </div>
  );
}
