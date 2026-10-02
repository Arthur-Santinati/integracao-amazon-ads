import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number | undefined | null,
  currency: string = 'BRL'
): string {
  if (value === undefined || value === null || isNaN(value)) {
    return currency === 'BRL' ? 'R$ 0,00' : '$0.00';
  }

  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(value);
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
}

export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '0,00%';
  return `${value.toFixed(2).replace('.', ',')}%`;
}

export function formatRoas(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '0.00x';
  return `${value.toFixed(2)}x`;
}

export function safeDivide(numerator: number, denominator: number): number {
  if (!denominator || denominator === 0 || isNaN(numerator) || isNaN(denominator)) {
    return 0;
  }
  return numerator / denominator;
}
