import prisma from '@/db/prisma';

export interface CurrentUserSession {
  user: {
    id: string;
    email: string;
    name: string;
  };
  account: {
    id: string;
    accountName: string;
    isDemo: boolean;
    status: string;
    region: string;
    currency: string;
  };
}

/**
 * Ensures an initial default user and demo account exist for local development and testing
 * Provides graceful fallback if database container is not yet started.
 */
export async function getCurrentUserAndAccount(): Promise<CurrentUserSession> {
  try {
    // 1. Get or create user
    let user = await prisma.user.findFirst({
      include: { amazonAccounts: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'vendedor@exemplo.com.br',
          name: 'Vendedor Amazon',
        },
        include: { amazonAccounts: true },
      });
    }

    // 2. Get or create primary amazon account
    let account = user.amazonAccounts[0];

    if (!account) {
      account = await prisma.amazonAccount.create({
        data: {
          userId: user.id,
          accountName: 'Loja Principal [DEMO]',
          marketplaceId: 'A2Q3Y263D00KWC',
          region: 'NA',
          currency: 'BRL',
          timezone: 'America/Sao_Paulo',
          isDemo: true,
          status: 'DISCONNECTED',
        },
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name || 'Vendedor Amazon',
      },
      account: {
        id: account.id,
        accountName: account.accountName,
        isDemo: account.isDemo,
        status: account.status,
        region: account.region,
        currency: account.currency,
      },
    };
  } catch (error: any) {
    console.warn(
      '[Session] Banco de dados indisponível no momento. Utilizando sessão padrão em memória (DEMO).'
    );
    return {
      user: {
        id: 'demo-user-id',
        email: 'vendedor@exemplo.com.br',
        name: 'Vendedor Amazon',
      },
      account: {
        id: 'demo-account-id',
        accountName: 'Loja Exemplo Tech & Audio [DEMO]',
        isDemo: true,
        status: 'DISCONNECTED',
        region: 'NA',
        currency: 'BRL',
      },
    };
  }
}
