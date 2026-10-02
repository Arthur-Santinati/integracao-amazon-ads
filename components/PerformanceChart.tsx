'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { DailyChartPoint } from '@/types/analytics';
import { formatCurrency, formatPercent, formatRoas } from '@/lib/utils';
import { TrendingUp, BarChart2, DollarSign, Percent } from 'lucide-react';

interface PerformanceChartProps {
  data: DailyChartPoint[];
  currency?: string;
}

type TabType = 'sales_spend' | 'acos' | 'roas' | 'traffic';

export function PerformanceChart({ data, currency = 'BRL' }: PerformanceChartProps) {
  const [activeTab, setActiveTab] = useState<TabType>('sales_spend');

  // Format short date "02/10"
  const formattedData = data.map((d) => {
    const parts = d.date.split('-');
    const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d.date;
    return {
      ...d,
      displayDate: label,
    };
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
      {/* Chart Header & Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Evolução Diária de Performance
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Acompanhe a curva de gastos, retorno sobre investimento e volume de vendas.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('sales_spend')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'sales_spend'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Gastos & Vendas
          </button>

          <button
            onClick={() => setActiveTab('acos')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'acos'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            ACOS (%)
          </button>

          <button
            onClick={() => setActiveTab('roas')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'roas'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            ROAS
          </button>

          <button
            onClick={() => setActiveTab('traffic')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'traffic'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Cliques & Pedidos
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full">
        {formattedData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
            <BarChart2 className="w-8 h-8 mb-2 stroke-1" />
            <span>Nenhum dado diário disponível para o período selecionado</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis
                dataKey="displayDate"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => {
                  if (activeTab === 'sales_spend') return `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`;
                  if (activeTab === 'acos') return `${val}%`;
                  if (activeTab === 'roas') return `${val}x`;
                  return `${val}`;
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                }}
                formatter={(value: any, name: any) => {
                  if (name === 'Vendas' || name === 'Gasto') return [formatCurrency(Number(value), currency), name];
                  if (name === 'ACOS') return [formatPercent(Number(value)), name];
                  if (name === 'ROAS') return [formatRoas(Number(value)), name];
                  return [value, name];
                }}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
              />

              {activeTab === 'sales_spend' && (
                <>
                  <Bar
                    dataKey="spend"
                    name="Gasto"
                    fill="#f97316"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    name="Vendas"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ fill: '#10b981', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </>
              )}

              {activeTab === 'acos' && (
                <Line
                  type="monotone"
                  dataKey="acos"
                  name="ACOS"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ fill: '#ef4444', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}

              {activeTab === 'roas' && (
                <Line
                  type="monotone"
                  dataKey="roas"
                  name="ROAS"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ fill: '#3b82f6', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}

              {activeTab === 'traffic' && (
                <>
                  <Bar
                    dataKey="clicks"
                    name="Cliques"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    name="Pedidos"
                    stroke="#fbbf24"
                    strokeWidth={2.5}
                    dot={{ fill: '#fbbf24', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default PerformanceChart;
