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

      if (reports.length > 0) {
        return NextResponse.json({
          reports,
          total: reports.length,
        });
      }
    } catch {
      // fallback below
    }

    const inMem = (await import('@/services/ReportImportService')).default.getInMemoryReports(session.account.id);
    return NextResponse.json({
      reports: inMem.map((r: any) => ({
        id: r.id,
        fileName: r.fileName,
        reportType: r.reportType,
        startDate: r.startDate,
        endDate: r.endDate,
        rowCount: r.rowCount,
        status: 'COMPLETED',
        errorDetails: null,
        importedAt: r.importedAt.toISOString ? r.importedAt.toISOString() : r.importedAt,
      })),
      total: inMem.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar relatórios' },
      { status: 500 }
    );
  }
}
