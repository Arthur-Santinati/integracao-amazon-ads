import { NextResponse } from 'next/server';
import { getCurrentUserAndAccount } from '@/lib/session';
import prisma from '@/db/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');
    const session = await getCurrentUserAndAccount();

    let chat = null;
    if (chatId) {
      chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    } else {
      chat = await prisma.chat.findFirst({
        where: { userId: session.user.id },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }

    if (!chat) {
      return NextResponse.json({
        chatId: null,
        messages: [],
      });
    }

    return NextResponse.json({
      chatId: chat.id,
      title: chat.title,
      messages: chat.messages.map((m) => {
        let toolCalls = undefined;
        let toolResponses = undefined;
        try {
          if (m.toolCalls) toolCalls = JSON.parse(m.toolCalls);
          if (m.toolResponses) toolResponses = JSON.parse(m.toolResponses);
        } catch {}

        return {
          id: m.id,
          role: m.role,
          content: m.content,
          toolCalls,
          toolResponses,
          createdAt: m.createdAt.toISOString(),
        };
      }),
    });
  } catch (_error: any) {
    return NextResponse.json({
      chatId: null,
      messages: [],
    });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');
    const session = await getCurrentUserAndAccount();

    if (chatId) {
      await prisma.chatMessage.deleteMany({ where: { chatId } });
      await prisma.chat.delete({ where: { id: chatId } });
    } else {
      await prisma.chat.deleteMany({ where: { userId: session.user.id } });
    }

    return NextResponse.json({ success: true, message: 'Histórico limpo com sucesso' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao limpar histórico de chat' },
      { status: 500 }
    );
  }
}
