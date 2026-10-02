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

    // 1. Find or create Chat session
    let chat = null;
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
    const history = (chat.messages || []).slice(-8).map((m) => ({
      role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
      content: m.content,
    }));

    // 4. Call Gemini with function calling
    const result = await geminiService.chat(session.account.id, message.trim(), history);

    // 5. Save AI response to database
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

    return NextResponse.json({
      chatId: chat.id,
      message: {
        id: modelMessage.id,
        role: 'model',
        content: result.text,
        toolCalls: result.toolCallsExecuted,
        createdAt: modelMessage.createdAt.toISOString(),
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
