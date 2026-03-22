import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, username, password, ticket } = body;

    const { GarminConnect } = require('@gooin/garmin-connect');
    // We create a dummy client just to use the internal exchange logic
    const gc = new GarminConnect({ 
      username: username || 'user@example.com', 
      password: password || 'password' 
    });

    if (action === 'exchange') {
      if (!ticket) return NextResponse.json({ error: 'Ticket is required' }, { status: 400 });

      console.log('  [Auth] Exchanging ticket for tokens...');
      // @ts-ignore
      const oauth1 = await gc.client.getOauth1Token(ticket);
      // @ts-ignore
      await gc.client.exchange(oauth1);

      return NextResponse.json({
        status: 'success',
        tokens: {
          oauth1: gc.client.oauth1Token,
          oauth2: gc.client.oauth2Token,
        }
      });
    }

    // ... existing login logic (optional fallback)
    return NextResponse.json({ error: 'Please use the Manual Ticket method to bypass 403.' }, { status: 403 });

  } catch (err: any) {
    console.error('[Auth] Exchange error:', err.message);
    return NextResponse.json({ 
      error: 'Exchange failed. Your Vercel IP might be blocked from the token exchange too. Please use the local terminal script.' 
    }, { status: 500 });
  }
}
