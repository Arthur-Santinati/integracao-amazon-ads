import { NextResponse } from 'next/server';
import amazonOAuthService from '@/services/AmazonOAuthService';
import { getCurrentUserAndAccount } from '@/lib/session';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const region = (searchParams.get('region') as any) || 'NA';
    const session = await getCurrentUserAndAccount();

    const state = JSON.stringify({
      userId: session.user.id,
      accountId: session.account.id,
      nonce: Math.random().toString(36).substring(7),
    });

    const url = amazonOAuthService.getAuthorizationUrl(Buffer.from(state).toString('base64'), region);

    return NextResponse.json({
      url,
      configured: !!process.env.AMAZON_ADS_CLIENT_ID,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar URL de autorização' },
      { status: 500 }
    );
  }
}
