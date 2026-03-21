import { NextRequest, NextResponse } from 'next/server';
import { fetchDailyMetrics, GarminCredentials } from '@/lib/garmin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel max for Hobby plan

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') ?? undefined;
  
  // Extract credentials from headers if provided (to keep GET simple, or use a POST for this later)
  const username = req.headers.get('x-garmin-username') || undefined;
  const password = req.headers.get('x-garmin-password') || undefined;
  const oauth1 = req.headers.get('x-garmin-oauth1') || undefined;
  const oauth2 = req.headers.get('x-garmin-oauth2') || undefined;

  const creds: GarminCredentials | undefined = username || oauth1 ? {
    username,
    password,
    oauth1,
    oauth2,
  } : undefined;

  try {
    const data = await fetchDailyMetrics(date, creds);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[API] /health error:', err);
    return NextResponse.json({ error: 'Failed to fetch health data' }, { status: 500 });
  }
}
