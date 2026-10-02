import { NextResponse } from 'next/server';
import { getCurrentUserAndAccount } from '@/lib/session';
import analyticsService from '@/services/AnalyticsService';

export async function POST() {
  try {
    const session = await getCurrentUserAndAccount();
    const demoAccountId = await analyticsService.seedDemoData(session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Dataset de demonstração gerado com sucesso! 10 campanhas, 5 produtos e 30 dias de métricas carregados.',
      accountId: demoAccountId,
      isDemo: true,
    });
  } catch (error: any) {
    console.error('[API Demo Seed Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar dataset de demonstração' },
      { status: 500 }
    );
  }
}
