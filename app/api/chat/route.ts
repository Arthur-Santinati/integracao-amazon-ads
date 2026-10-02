import { NextResponse } from 'next/server';
import { getCurrentUserAndAccount } from '@/lib/session';
import geminiService from '@/services/GeminiService';
import prisma from '@/db/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, chatId: requestedChatId } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Mensagem inválida ou vazia' }, { status: 400 });
    }

    const session = await getCurrentUserAndAccount();

    // 1. Find or create Chat session in database (with graceful fallback)
    let chat: any = null;
    let history: Array<{ role: 'user' | 'model'; content: string }> = [];

    try {
      if (requestedChatId) {
        chat = await prisma.chat.findUnique({
          where: { id: requestedChatId },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
      }

      if (!chat) {
        chat = await prisma.chat.create({
          data: {
            userId: session.user.id,
            title: message.substring(0, 40) + (message.length > 40 ? '...' : ''),
          },
          include: { messages: true },
        });
      }

      // 2. Save user message to database
      await prisma.chatMessage.create({
        data: {
          chatId: chat.id,
          role: 'user',
          content: message.trim(),
        },
      });

      // 3. Format history for context (last 8 messages)
      history = (chat.messages || []).slice(-8).map((m: any) => ({
        role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        content: m.content,
      }));
    } catch (dbErr: any) {
      console.warn('[ChatRoute] Prisma/Banco offline ou sem conexão:', dbErr.message);
    }

    // 4. Call Gemini with function calling
    const result = await geminiService.chat(session.account.id, message.trim(), history);

    // 5. Save AI response to database if available
    let savedMessageId = 'msg-' + Date.now();
    let createdAt = new Date().toISOString();

    if (chat?.id) {
      try {
        const modelMessage = await prisma.chatMessage.create({
          data: {
            chatId: chat.id,
            role: 'model',
            content: result.text,
            toolCalls:
              result.toolCallsExecuted.length > 0
                ? JSON.stringify(result.toolCallsExecuted.map((t) => ({ name: t.name, args: t.args })))
                : null,
            toolResponses:
              result.toolCallsExecuted.length > 0
                ? JSON.stringify(
                    result.toolCallsExecuted.map((t) => ({ name: t.name, response: t.response }))
                  )
                : null,
          },
        });
        savedMessageId = modelMessage.id;
        createdAt = modelMessage.createdAt.toISOString();
      } catch (saveErr: any) {
        console.warn('[ChatRoute] Falha ao persistir mensagem da IA no banco:', saveErr.message);
      }
    }

    return NextResponse.json({
      chatId: chat?.id || 'chat-stateless',
      message: {
        id: savedMessageId,
        role: 'model',
        content: result.text,
        toolCalls: result.toolCallsExecuted,
        createdAt,
      },
    });
  } catch (error: any) {
    console.error('[API Chat Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar mensagem do chat' },
      { status: 500 }
    );
  }
}
