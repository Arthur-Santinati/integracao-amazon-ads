'use client';

import React, { useState } from 'react';
import { ProductRow } from '@/types/analytics';
import { formatCurrency, formatPercent, formatRoas, formatNumber } from '@/lib/utils';
import { Search, Package, ExternalLink } from 'lucide-react';

interface ProductTableProps {
  products: ProductRow[];
  currency?: string;
  isDemo?: boolean;
}

export function ProductTable({ products, currency = 'BRL', isDemo = false }: ProductTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = products.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.asin.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por ASIN, SKU ou título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-400">
          <span>{filtered.length} produtos exibidos</span>
          {isDemo && (
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
              DEMO
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">ASIN / SKU</th>
              <th className="px-4 py-3 text-right">Preço</th>
              <th className="px-4 py-3 text-right">Vendas</th>
              <th className="px-4 py-3 text-right">Gasto</th>
              <th className="px-4 py-3 text-right">ACOS</th>
              <th className="px-4 py-3 text-right">ROAS</th>
              <th className="px-4 py-3 text-right">Pedidos</th>
              <th className="px-4 py-3 text-right">Cliques</th>
              <th className="px-4 py-3 text-right">CPC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                  Nenhum produto cadastrado ou associado a métricas.
                </td>
              </tr>
            ) : (
              filtered.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 max-w-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-amber-400" />
                      </div>
                      <span className="font-medium text-slate-100 truncate" title={prod.title}>
                        {prod.title}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 font-mono text-slate-300">
                      <span>{prod.asin}</span>
                      <a
                        href={`https://www.amazon.com.br/dp/${prod.asin}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-500 hover:text-amber-400 ml-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {prod.sku && (
                      <div className="text-[10px] text-slate-500 font-mono">{prod.sku}</div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right text-slate-300 font-medium">
                    {prod.price ? formatCurrency(prod.price, currency) : '-'}
                  </td>

                  <td className="px-4 py-3 text-right font-medium text-emerald-400">
                    {formatCurrency(prod.sales, currency)}
                  </td>

                  <td className="px-4 py-3 text-right font-medium text-slate-100">
                    {formatCurrency(prod.spend, currency)}
                  </td>

                  <td className="px-4 py-3 text-right font-medium">
                    {prod.sales > 0 ? (
                      <span
                        className={
                          prod.acos > 50
                            ? 'text-rose-400'
                            : prod.acos <= 25
                            ? 'text-emerald-400 font-semibold'
                            : 'text-slate-300'
                        }
                      >
                        {formatPercent(prod.acos)}
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </td>

                  <td className="px-4 py-3 text-right font-medium text-slate-200">
                    {formatRoas(prod.roas)}
                  </td>

                  <td className="px-4 py-3 text-right font-medium text-slate-200">
                    {formatNumber(prod.orders)}
                  </td>

                  <td className="px-4 py-3 text-right text-slate-300">
                    {formatNumber(prod.clicks)}
                  </td>

                  <td className="px-4 py-3 text-right text-slate-400">
                    {formatCurrency(prod.cpc, currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProductTable;
