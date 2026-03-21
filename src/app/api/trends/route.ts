import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import { fetchTrendData, GarminCredentials } from '@/lib/garmin';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = parseInt(url.searchParams.get('range') ?? '30');
  const date = url.searchParams.get('date') ?? format(new Date(), 'yyyy-MM-dd');

  if (![30, 90].includes(range)) {
    return NextResponse.json({ error: 'Invalid range. Use 30 or 90.' }, { status: 400 });
  }

  // Extract credentials from headers if provided
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
    const points = await fetchTrendData(range, date, creds);
    return NextResponse.json(points);
  } catch (err) {
    console.error('[API] /trends error:', err);
    return NextResponse.json({ error: 'Failed to fetch trend data' }, { status: 500 });
  }
}
