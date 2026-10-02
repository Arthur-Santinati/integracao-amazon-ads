import { NextResponse } from 'next/server';
import { getCurrentUserAndAccount } from '@/lib/session';
import analyticsService from '@/services/AnalyticsService';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const daysStr = searchParams.get('days') || '30';
    const days = parseInt(daysStr, 10) || 30;

    const startDate = startOfDay(subDays(new Date(), days - 1));
    const endDate = endOfDay(new Date());

    const session = await getCurrentUserAndAccount();
    const products = await analyticsService.getProductRows(session.account.id, {
      search,
      startDate,
      endDate,
    });

    return NextResponse.json({
      products,
      total: products.length,
      isDemo: session.account.isDemo,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar produtos' },
      { status: 500 }
    );
  }
}
