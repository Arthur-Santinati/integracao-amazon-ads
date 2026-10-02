'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  FileCheck,
} from 'lucide-react';

interface CsvUploaderProps {
  onSuccess?: () => void;
}

export function CsvUploader({ onSuccess }: CsvUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      setFile(selected);
      setError(null);
      setResult(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/reports/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar o relatório CSV');
      }

      setResult(data);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao importar CSV');
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleTemplate = () => {
    const csvContent =
      'Data,Nome da campanha,Impressões,Cliques,Gastos,Vendas,Pedidos,ASIN\n' +
      '2026-09-25,SP - Fone Bluetooth Pro - Exata,1850,42,65.20,380.00,2,B08N5M7S6K\n' +
      '2026-09-26,SP - Fone Bluetooth Pro - Exata,1920,48,72.10,490.00,3,B08N5M7S6K\n' +
      '2026-09-25,SP - Caixa de Som Portátil - Auto,1200,28,45.00,199.00,1,B09V7N88PX\n' +
      '2026-09-26,SP - Caixa de Som Portátil - Auto,1340,31,49.60,199.00,1,B09V7N88PX\n' +
      '2026-09-25,SP - Suporte Articulado Monitor,950,22,38.50,349.90,1,B07T485V66\n' +
      '2026-09-26,SP - Suporte Articulado Monitor,1100,25,41.20,349.90,1,B07T485V66\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'exemplo_relatorio_amazon_ads.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            Importar Relatório Amazon Ads (CSV)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Faça upload do relatório de Sponsored Products exportado do console do Amazon Ads.
          </p>
        </div>

        <button
          onClick={downloadSampleTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span>Baixar Modelo CSV</span>
        </button>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-amber-400 bg-amber-500/5'
            : file
            ? 'border-emerald-500/60 bg-emerald-500/5'
            : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv,text/plain,*"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center">
          {file ? (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                <FileCheck className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-white">{file.name}</span>
              <span className="text-xs text-slate-400 mt-1">
                {(file.size / 1024).toFixed(1)} KB • Pronto para importar
              </span>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-slate-200">
                Arraste seu arquivo CSV aqui ou clique para selecionar
              </span>
              <span className="text-xs text-slate-500 mt-1.5">
                Compatível com relatórios de Sponsored Products (PT-BR ou EN)
              </span>
            </>
          )}
        </div>
      </div>

      {/* Action Button */}
      {file && (
        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            onClick={() => {
              setFile(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando Linhas...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Confirmar Importação</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Error Feedback */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <div className="font-semibold text-rose-200">Erro na importação:</div>
            <div className="mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* Success Feedback */}
      {result && (
        <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-emerald-200">
              Relatório importado com sucesso!
            </div>
            <div>
              Arquivo: <span className="font-mono text-emerald-100">{result.fileName}</span>
            </div>
            <div>
              Linhas válidas processadas: <strong className="text-white">{result.importedRows}</strong> de{' '}
              {result.totalRows}
            </div>
            {result.detectedColumns && (
              <div className="text-[11px] text-emerald-400/80 mt-1">
                Colunas detectadas:{' '}
                {Object.keys(result.detectedColumns).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CsvUploader;
