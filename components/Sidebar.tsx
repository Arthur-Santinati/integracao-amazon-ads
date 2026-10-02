'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Megaphone,
  ShoppingBag,
  FileSpreadsheet,
  Bot,
  Link2,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Campanhas', href: '/campaigns', icon: Megaphone },
  { name: 'Produtos', href: '/products', icon: ShoppingBag },
  { name: 'Relatórios CSV', href: '/reports', icon: FileSpreadsheet },
  { name: 'Chat IA', href: '/chat', icon: Bot, badge: 'Gemini' },
  { name: 'Conectar Amazon', href: '/connect', icon: Link2 },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-200 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-orange-500/20">
            <Zap className="w-5 h-5 fill-slate-950" />
          </div>
          <div>
            <span className="font-bold text-base text-white tracking-tight">AmzAds</span>
            <span className="text-amber-400 font-semibold ml-1 text-sm">AI</span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Menu Principal
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-amber-500/10 text-amber-400 font-semibold border-l-2 border-amber-500'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('w-4 h-4', isActive ? 'text-amber-400' : 'text-slate-400')} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-400/20 text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-slate-800">
        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-300">Amazon Ads MVP</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">
              v1.0 Read-Only
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Análise e inteligência assistida por Gemini para Sponsored Ads.
          </p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
