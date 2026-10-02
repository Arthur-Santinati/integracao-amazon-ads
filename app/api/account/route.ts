import { NextResponse } from 'next/server';
import { getCurrentUserAndAccount } from '@/lib/session';
import prisma from '@/db/prisma';

export async function GET() {
  try {
    const session = await getCurrentUserAndAccount();

    try {
      const account = await prisma.amazonAccount.findUnique({
        where: { id: session.account.id },
        include: {
          token: {
            select: {
              expiresAt: true,
              scope: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      if (account) {
        return NextResponse.json({
          user: session.user,
          account: {
            id: account.id,
            accountName: account.accountName,
            marketplaceId: account.marketplaceId,
            region: account.region,
            currency: account.currency,
            isDemo: account.isDemo,
            status: account.status,
            lastSyncAt: account.lastSyncAt,
            tokenExpiresAt: account.token?.expiresAt,
            hasToken: !!account.token,
          },
        });
      }
    } catch {
      // Fallback to session data if DB query fails
    }

    return NextResponse.json({
      user: session.user,
      account: {
        id: session.account.id,
        accountName: session.account.accountName,
        marketplaceId: 'A2Q3Y263D00KWC',
        region: session.account.region,
        currency: session.account.currency,
        isDemo: session.account.isDemo,
        status: session.account.status,
        hasToken: false,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar dados da conta' },
      { status: 500 }
    );
  }
}
