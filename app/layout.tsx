import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'Amazon Ads AI - Análise Inteligente de Campanhas',
  description: 'Plataforma de análise e inteligência de mídia para Amazon Ads utilizando IA (Gemini)',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-slate-950 text-slate-100 font-sans antialiased min-h-screen flex flex-row">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          <Header />
          <main className="flex-1 p-6 md:p-8 bg-slate-950">{children}</main>
        </div>
      </body>
    </html>
  );
}
