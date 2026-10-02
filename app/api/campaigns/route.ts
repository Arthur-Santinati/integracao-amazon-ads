import { NextResponse } from 'next/server';
import { getCurrentUserAndAccount } from '@/lib/session';
import analyticsService from '@/services/AnalyticsService';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const daysStr = searchParams.get('days') || '30';
    const days = parseInt(daysStr, 10) || 30;

    const startDate = startOfDay(subDays(new Date(), days - 1));
    const endDate = endOfDay(new Date());

    const session = await getCurrentUserAndAccount();
    const campaigns = await analyticsService.getCampaignRows(session.account.id, {
      search,
      status,
      startDate,
      endDate,
    });

    return NextResponse.json({
      campaigns,
      total: campaigns.length,
      isDemo: session.account.isDemo,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar campanhas' },
      { status: 500 }
    );
  }
}
