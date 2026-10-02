'use client';

import React, { useState, useEffect } from 'react';
import CsvUploader from '@/components/CsvUploader';
import { FileSpreadsheet, Calendar, CheckCircle2, Clock, FileText } from 'lucide-react';

interface ReportItem {
  id: string;
  fileName: string;
  reportType: string;
  startDate?: string;
  endDate?: string;
  rowCount: number;
  status: string;
  importedAt: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports/list');
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (e) {
      console.error('Falha ao listar relatórios:', e);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <FileSpreadsheet className="w-5 h-5 text-amber-400" />
          Importação de Relatórios CSV
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Faça upload de relatórios brutos do Amazon Ads para alimentar suas métricas no banco de dados.
        </p>
      </div>

      {/* CSV Uploader Area */}
      <CsvUploader onSuccess={fetchReports} />

      {/* Imported Reports History */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Histórico de Relatórios Importados</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Arquivos processados e vinculados à sua conta no banco de dados.
            </p>
          </div>
          <span className="text-xs text-slate-400">{reports.length} relatórios</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Arquivo</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Período Coberto</th>
                <th className="px-4 py-3 text-right">Linhas Válidas</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Data de Importação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Nenhum relatório importado até o momento. Utilize o formulário acima para importar seu primeiro CSV.
                  </td>
                </tr>
              ) : (
                reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium text-slate-100">
                        <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{rep.fileName}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px]">
                        {rep.reportType}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-400">
                      {rep.startDate && rep.endDate ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {new Date(rep.startDate).toLocaleDateString('pt-BR')} até{' '}
                          {new Date(rep.endDate).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-medium text-white">
                      {rep.rowCount}
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        {rep.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right text-slate-400">
                      <span className="flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {new Date(rep.importedAt).toLocaleString('pt-BR')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
