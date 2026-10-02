'use client';

import React, { useState, useEffect } from 'react';
import ProductTable from '@/components/ProductTable';
import { ProductRow } from '@/types/analytics';
import { ShoppingBag, Calendar } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [days, setDays] = useState(30);
  const [isDemo, setIsDemo] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/products?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setIsDemo(data.isDemo ?? false);
      }
    } catch (e) {
      console.error('Falha ao carregar produtos:', e);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            Desempenho por Produto (ASIN)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Análise de lucratividade, ACOS e conversão por ASIN anunciado.
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

      <ProductTable products={products} isDemo={isDemo} />
    </div>
  );
}
