import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

export const runtime = 'nodejs';

const SSO = 'https://sso.garmin.com/sso';
const QS = [
  'service=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F',
  'webhost=https%3A%2F%2Fconnect.garmin.com',
  'source=https%3A%2F%2Fconnect.garmin.com%2Fsignin',
  'redirectAfterAccountLoginUrl=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F',
  'redirectAfterAccountCreationUrl=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F',
  'gauthHost=https%3A%2F%2Fsso.garmin.com%2Fsso',
  'locale=en_US',
  'id=gauth-widget',
  'clientId=GarminConnect',
  'initialFocus=true',
  'embedWidget=false',
  'generateExtraServiceTicket=true',
  'generateTwoExtraServiceTickets=false',
  'generateNoServiceTicket=false',
  'connectLegalTerms=true',
].join('&');

// Realistic modern browser headers
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const getHeaders = (referer?: string) => ({
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': referer ? 'same-origin' : 'none',
  'Sec-Fetch-User': '?1',
  'Sec-Ch-Ua': '"Not/A)Branch";v="8", "Chromium";v="126", "Google Chrome";v="126"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  ...(referer ? { 'Referer': referer } : {}),
});

function extractInput(html: string, name: string) {
  const re = new RegExp(`<input[^>]+name=["']?${name}["']?[^>]*>`, 'i');
  const el = html.match(re);
  if (!el) return null;
  const val = el[0].match(/value=["']([^"']*)/i);
  return val ? val[1] : null;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, username, password, mfaCode, state } = body;

    const jar = new CookieJar();
    if (state?.cookies) {
      // Use fromJSON to properly restore the jar state
      const cookieData = typeof state.cookies === 'string' ? JSON.parse(state.cookies) : state.cookies;
      // Tough-cookie store might be nested
      const store = cookieData.cookies || cookieData;
      // @ts-ignore
      jar.setCookieSync(store, SSO);
    }
    
    const axiosInst = wrapper(axios.create({ 
      jar, 
      withCredentials: true,
      maxRedirects: 10,
      validateStatus: (status) => status >= 200 && status < 400,
    }));

    const signinUrl = `${SSO}/signin?${QS}`;

    if (action === 'login') {
      // Step 1: Initial GET to establish session
      const page1 = await axiosInst.get(signinUrl, { headers: getHeaders() });
      const html1 = page1.data;

      const csrf1 = extractInput(html1, '_csrf');
      const lt = extractInput(html1, 'lt');
      const execution = extractInput(html1, 'execution');

      await sleep(800 + Math.random() * 500); // Human-like delay

      // Step 2: Submit credentials
      const loginBody = new URLSearchParams();
      loginBody.set('username', username);
      loginBody.set('password', password);
      loginBody.set('embed', 'true');
      loginBody.set('_eventId', 'submit');
      if (csrf1) loginBody.set('_csrf', csrf1);
      if (lt) loginBody.set('lt', lt);
      if (execution) loginBody.set('execution', execution);

      const page2 = await axiosInst.post(signinUrl, loginBody.toString(), {
        headers: {
          ...getHeaders(signinUrl),
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': 'https://sso.garmin.com',
        },
      });

      const html2 = page2.data;
      const ticket = html2.match(/ticket=([^"&\s]+)/);
      
      if (ticket) {
        return await exchangeTicket(ticket[1], username, password);
      }

      if (html2.includes('mfa-code') || html2.includes('loginEnterMfaCode')) {
        const csrf2 = extractInput(html2, '_csrf');
        return NextResponse.json({
          status: 'mfa_required',
          state: {
            csrf: csrf2,
            cookies: jar.toJSON(),
          }
        });
      }

      return NextResponse.json({ error: 'Login failed. Check credentials or bot detection.' }, { status: 401 });
    }

    if (action === 'verify') {
      const mfaBody = new URLSearchParams();
      mfaBody.set('mfa', mfaCode.trim());
      mfaBody.set('embed', 'true');
      mfaBody.set('_eventId', 'submit');
      if (state.csrf) mfaBody.set('_csrf', state.csrf);

      const restoredJar = CookieJar.fromJSON(state.cookies);
      const mfaAxios = wrapper(axios.create({ jar: restoredJar, withCredentials: true }));

      const page3 = await mfaAxios.post(
        `${SSO}/verifyMFA/loginEnterMfaCode?${QS}`,
        mfaBody.toString(),
        {
          headers: {
            ...getHeaders(signinUrl),
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://sso.garmin.com',
          },
        }
      );

      const html3 = page3.data;
      const ticket3 = html3.match(/ticket=([^"&\s]+)/);
      
      if (ticket3) {
        return await exchangeTicket(ticket3[1], username, password);
      }

      return NextResponse.json({ error: 'MFA code rejected or expired.' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err: any) {
    if (err.response?.status === 403) {
      return NextResponse.json({ 
        error: 'Garmin blocked the request (403). Try again in 15 minutes or use a different network.' 
      }, { status: 403 });
    }
    console.error('[Auth] Garmin error:', err.message);
    return NextResponse.json({ error: err.message || 'Authentication error' }, { status: 500 });
  }
}

async function exchangeTicket(ticket: string, user: string, pass: string) {
  const { GarminConnect } = require('@gooin/garmin-connect');
  const gc = new GarminConnect({ username: user, password: pass });
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
