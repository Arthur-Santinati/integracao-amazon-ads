import { NextResponse } from 'next/server';
import { getCurrentUserAndAccount } from '@/lib/session';
import analyticsService from '@/services/AnalyticsService';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '7d';
    const session = await getCurrentUserAndAccount();

    let days = 7;
    if (range === '14d') days = 14;
    else if (range === '30d') days = 30;
    else if (range === '60d') days = 60;
    else if (range === 'all') days = 90;

    const startDate = startOfDay(subDays(new Date(), days - 1));
    const endDate = endOfDay(new Date());

    const [metrics, comparison, chart] = await Promise.all([
      analyticsService.getDashboardMetrics(session.account.id, startDate, endDate),
      analyticsService.getMetricComparison(session.account.id, days),
      analyticsService.getDailyChartPoints(session.account.id, startDate, endDate),
    ]);

    return NextResponse.json({
      account: session.account,
      range,
      days,
      metrics,
      comparison,
      chart,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar dados do dashboard' },
      { status: 500 }
    );
  }
}
