import { describe, it, expect } from 'vitest';
import { AnalyticsService } from '@/services/AnalyticsService';
import { safeDivide, formatCurrency, formatPercent, formatRoas } from '@/lib/utils';

describe('AnalyticsService and Math Utilities', () => {
  const service = new AnalyticsService();

  it('correctly calculates basic metrics (ACOS, ROAS, CPC, CTR, Conversion Rate)', () => {
    const rows = [
      {
        spend: 100,
        sales: 500,
        impressions: 10000,
        clicks: 200,
        orders: 10,
      },
    ];

    const result = service.computeMetrics(rows);

    expect(result.spend).toBe(100);
    expect(result.sales).toBe(500);
    expect(result.clicks).toBe(200);
    expect(result.impressions).toBe(10000);
    expect(result.orders).toBe(10);

    // ACOS = 100 / 500 * 100 = 20%
    expect(result.acos).toBe(20);

    // ROAS = 500 / 100 = 5.0
    expect(result.roas).toBe(5);

    // CPC = 100 / 200 = 0.50
    expect(result.cpc).toBe(0.5);

    // CTR = 200 / 10000 * 100 = 2.0%
    expect(result.ctr).toBe(2);

    // Conversion rate = 10 / 200 * 100 = 5.0%
    expect(result.conversionRate).toBe(5);
  });

  it('safely handles zero division without returning NaN or Infinity', () => {
    expect(safeDivide(100, 0)).toBe(0);
    expect(safeDivide(0, 0)).toBe(0);
    expect(safeDivide(NaN, 5)).toBe(0);

    const zeroResult = service.computeMetrics([
      { spend: 0, sales: 0, impressions: 0, clicks: 0, orders: 0 },
    ]);

    expect(zeroResult.acos).toBe(0);
    expect(zeroResult.roas).toBe(0);
    expect(zeroResult.cpc).toBe(0);
    expect(zeroResult.ctr).toBe(0);
    expect(zeroResult.conversionRate).toBe(0);
  });

  it('formats currency, percentages and ROAS accurately', () => {
    expect(formatRoas(4.567)).toBe('4.57x');
    expect(formatRoas(0)).toBe('0.00x');
    expect(formatPercent(25.432)).toBe('25,43%');
  });
});
