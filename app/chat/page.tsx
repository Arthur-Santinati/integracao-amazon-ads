'use client';

import React from 'react';
import ChatInterface from '@/components/ChatInterface';

export default function ChatPage() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Assistente de Anúncios com IA (Gemini)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Faça perguntas sobre suas campanhas, métricas, lucros e desperdícios em linguagem natural.
        </p>
      </div>

      <ChatInterface />
    </div>
  );
}
