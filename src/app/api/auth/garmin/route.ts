import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import qs from 'qs';
import crypto from 'node:crypto';
// @ts-ignore
import OAuth from 'oauth-1.0a';

export const runtime = 'nodejs';

const CONSUMER_KEY = 'fc3e99d2-118c-44b8-8ae3-03370dde24c0';
const CONSUMER_SECRET = 'E08WAR897WEy2knn7aFBrvegVAf0AFdWBBF';
const UA = 'com.garmin.android.apps.connectmobile/4.71.1 (Android 13; Scale/2.25)';

const oauth = new OAuth({
  consumer: { key: CONSUMER_KEY, secret: CONSUMER_SECRET },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string: string, key: string) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

function extractInput(html: string, name: string) {
  const re = new RegExp(`<input[^>]+name=["']?${name}["']?[^>]*>`, 'i');
  const el = html.match(re);
  if (!el) return null;
  const val = el[0].match(/value=["']([^"']*)/i);
  return val ? val[1] : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, username, password, mfaCode, state } = body;
    
    // Robust session restoration for Vercel
    let jar: CookieJar;
    if (state?.cookies) {
      try {
        // tough-cookie 5.x compatible deserialization
        const cookieData = typeof state.cookies === 'string' ? JSON.parse(state.cookies) : state.cookies;
        jar = CookieJar.fromJSON(cookieData);
      } catch (e) {
        console.warn('[Auth] Cookie restoration failed, starting fresh');
        jar = new CookieJar();
      }
    } else {
      jar = new CookieJar();
    }

    const axiosInst = wrapper(axios.create({ 
      jar, 
      withCredentials: true,
      headers: { 
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      }
    }));

    const SSO = 'https://sso.garmin.com/sso';
    const QS = 'service=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&webhost=https%3A%2F%2Fconnect.garmin.com&source=https%3A%2F%2Fconnect.garmin.com%2Fsignin&gauthHost=https%3A%2F%2Fsso.garmin.com%2Fsso&locale=en_US&id=gauth-widget&clientId=GarminConnect&initialFocus=true&embedWidget=false&generateExtraServiceTicket=true&connectLegalTerms=true';

    if (action === 'login') {
      const signinUrl = `${SSO}/signin?${QS}`;
      const page1 = await axiosInst.get(signinUrl);
      const html1 = page1.data;

      const loginBody = new URLSearchParams();
      loginBody.set('username', username);
      loginBody.set('password', password);
      loginBody.set('embed', 'true');
      loginBody.set('_eventId', 'submit');
      
      const csrf = extractInput(html1, '_csrf');
      const lt = extractInput(html1, 'lt');
      const execution = extractInput(html1, 'execution');
      if (csrf) loginBody.set('_csrf', csrf);
      if (lt) loginBody.set('lt', lt);
      if (execution) loginBody.set('execution', execution);

      const page2 = await axiosInst.post(signinUrl, loginBody.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': signinUrl,
        },
      });

      const html2 = page2.data;
      const ticket = html2.match(/ticket=([^"&\s]+)/);

      if (ticket) {
        return await performExchange(ticket[1]);
      }

      if (html2.includes('mfa-code') || html2.includes('loginEnterMfaCode')) {
        return NextResponse.json({
          status: 'mfa_required',
          state: {
            csrf: extractInput(html2, '_csrf'),
            cookies: jar.toJSON(), // Standard JSON format
          }
        });
      }

      if (html2.includes('Invalid user name or password')) {
        return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
      }

      return NextResponse.json({ error: 'Garmin rejected the session. Please try again on mobile data.' }, { status: 403 });
    }

    if (action === 'verify') {
      const mfaBody = new URLSearchParams();
      mfaBody.set('mfa', mfaCode.trim());
      mfaBody.set('embed', 'true');
      mfaBody.set('_eventId', 'submit');
      if (state.csrf) mfaBody.set('_csrf', state.csrf);

      const verifyUrl = `${SSO}/verifyMFA/loginEnterMfaCode?${QS}`;
      const page3 = await axiosInst.post(verifyUrl, mfaBody.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `${SSO}/signin?${QS}`,
        },
      });

      const ticket = page3.data.match(/ticket=([^"&\s]+)/);
      if (ticket) {
        return await performExchange(ticket[1]);
      }

      if (page3.data.includes('mfa-code')) {
        return NextResponse.json({ error: 'Invalid MFA code. Use the latest email.' }, { status: 401 });
      }

      return NextResponse.json({ error: 'Verification session expired. Please sign in again.' }, { status: 401 });
    }

  } catch (err: any) {
    console.error('[Auth] Garmin error:', err.response?.status, err.message);
    const status = err.response?.status || 500;
    return NextResponse.json({ error: `Auth failed (${status}): ${err.message}` }, { status });
  }
}

async function performExchange(ticket: string) {
  try {
    const preauthUrl = `https://connectapi.garmin.com/oauth-service/oauth/preauthorized?ticket=${ticket}&login-url=https%3A%2F%2Fsso.garmin.com%2Fsso%2Fembed&accepts-mfa-tokens=true`;
    const authHeader1 = oauth.toHeader(oauth.authorize({ url: preauthUrl, method: 'GET' }));
    const res1 = await axios.get(preauthUrl, { headers: { ...authHeader1, 'User-Agent': UA } });
    const oauth1 = qs.parse(res1.data);

    const exchangeUrl = 'https://connectapi.garmin.com/oauth-service/oauth/exchange/user/2.0';
    const token = { key: oauth1.oauth_token as string, secret: oauth1.oauth_token_secret as string };
    const authData = oauth.authorize({ url: exchangeUrl, method: 'POST' }, token);
    const finalUrl = `${exchangeUrl}?${qs.stringify(authData)}`;
    const res2 = await axios.post(finalUrl, null, {
      headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return NextResponse.json({
      status: 'success',
      tokens: {
        oauth1: oauth1,
        oauth2: res2.data,
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Exchange failed. Use terminal script.' }, { status: 500 });
  }
}
