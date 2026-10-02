import { NextResponse } from 'next/server';
import amazonOAuthService from '@/services/AmazonOAuthService';
import { getCurrentUserAndAccount } from '@/lib/session';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error) {
    console.error('[OAuth Callback] Erro retornado pela Amazon:', error, errorDescription);
    return NextResponse.redirect(
      `${baseUrl}/connect?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/connect?error=${encodeURIComponent('Código de autorização ausente')}`
    );
  }

  try {
    const session = await getCurrentUserAndAccount();
    const tokenResponse = await amazonOAuthService.exchangeCodeForTokens(code);

    await amazonOAuthService.saveAccountTokens(session.account.id, tokenResponse);

    return NextResponse.redirect(`${baseUrl}/connect?success=true`);
  } catch (err: any) {
    console.error('[OAuth Callback] Falha na troca de token:', err.message);
    return NextResponse.redirect(
      `${baseUrl}/connect?error=${encodeURIComponent(err.message || 'Falha ao processar autorização')}`
    );
  }
}
