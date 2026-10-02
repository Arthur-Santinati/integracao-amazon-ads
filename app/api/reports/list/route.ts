import { NextResponse } from 'next/server';
import { getCurrentUserAndAccount } from '@/lib/session';
import prisma from '@/db/prisma';

export async function GET() {
  try {
    const session = await getCurrentUserAndAccount();

    try {
      const reports = await prisma.importedReport.findMany({
        where: { accountId: session.account.id },
        orderBy: { importedAt: 'desc' },
        select: {
          id: true,
          fileName: true,
          reportType: true,
          startDate: true,
          endDate: true,
          rowCount: true,
          status: true,
          errorDetails: true,
          importedAt: true,
        },
      });

      return NextResponse.json({
        reports,
        total: reports.length,
      });
    } catch {
      return NextResponse.json({
        reports: [],
        total: 0,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar relatórios' },
      { status: 500 }
    );
  }
}
