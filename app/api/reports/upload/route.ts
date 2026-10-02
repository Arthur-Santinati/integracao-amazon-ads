import { NextResponse } from 'next/server';
import { getCurrentUserAndAccount } from '@/lib/session';
import reportImportService from '@/services/ReportImportService';

export async function POST(req: Request) {
  try {
    const session = await getCurrentUserAndAccount();
    const contentType = req.headers.get('content-type') || '';

    let csvContent = '';
    let fileName = 'relatorio.csv';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
      }
      fileName = file.name;
      csvContent = await file.text();
    } else {
      const body = await req.json();
      csvContent = body.content || '';
      fileName = body.fileName || 'relatorio.csv';
    }

    if (!csvContent || csvContent.trim().length === 0) {
      return NextResponse.json({ error: 'O conteúdo do arquivo CSV está vazio' }, { status: 400 });
    }

    // 1. Parse and validate
    const parseResult = reportImportService.parseCSV(csvContent, fileName);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Falha na validação do relatório CSV',
          details: parseResult.errors,
          detectedColumns: parseResult.detectedColumns,
        },
        { status: 422 }
      );
    }

    // 2. Persist in Database
    const reportId = await reportImportService.saveReportToDatabase(
      session.user.id,
      session.account.id,
      parseResult
    );

    return NextResponse.json({
      success: true,
      reportId,
      fileName,
      totalRows: parseResult.totalRows,
      importedRows: parseResult.validRows.length,
      invalidRows: parseResult.invalidRowsCount,
      startDate: parseResult.startDate,
      endDate: parseResult.endDate,
      detectedColumns: parseResult.detectedColumns,
      warnings: parseResult.errors,
    });
  } catch (error: any) {
    console.error('[API Report Upload Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao importar relatório' },
      { status: 500 }
    );
  }
}
