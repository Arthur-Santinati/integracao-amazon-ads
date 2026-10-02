import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number; // percentage change compared to previous period
  invertChangeColors?: boolean; // For metrics like ACOS or CPC where decrease is good (green) and increase is bad (red)
  icon?: React.ComponentType<{ className?: string }>;
  tooltip?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  invertChangeColors = false,
  icon: Icon,
}: MetricCardProps) {
  const hasChange = change !== undefined && !isNaN(change);
  const isPositive = hasChange && change > 0;
  const isNegative = hasChange && change < 0;

  // Good or Bad direction determination
  let changeColor = 'text-slate-400 bg-slate-800';
  if (hasChange) {
    if (change === 0) {
      changeColor = 'text-slate-400 bg-slate-800';
    } else if (invertChangeColors) {
      // Decrease is good (e.g. ACOS down)
      changeColor = isNegative
        ? 'text-emerald-400 bg-emerald-500/10'
        : 'text-rose-400 bg-rose-500/10';
    } else {
      // Increase is good (e.g. Sales up, ROAS up)
      changeColor = isPositive
        ? 'text-emerald-400 bg-emerald-500/10'
        : 'text-rose-400 bg-rose-500/10';
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 transition-all rounded-xl p-5 flex flex-col justify-between shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300">
            <Icon className="w-4 h-4 text-slate-300" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-bold tracking-tight text-white">{value}</span>

        {hasChange && (
          <div
            className={cn(
              'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium',
              changeColor
            )}
          >
            {isPositive ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : isNegative ? (
              <ArrowDownRight className="w-3.5 h-3.5" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>

      {subtitle && <p className="text-[11px] text-slate-400 mt-2 font-normal">{subtitle}</p>}
    </div>
  );
}

export default MetricCard;
