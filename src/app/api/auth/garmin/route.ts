import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import qs from 'qs';
import crypto from 'node:crypto';
// @ts-ignore
import OAuth from 'oauth-1.0a';

export const runtime = 'nodejs';

// Use Browser headers for the SSO step to avoid 401 bot-detection
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MOBILE_UA = 'com.garmin.android.apps.connectmobile/4.71.1 (Android 13; Scale/2.25)';

const CONSUMER_KEY = 'fc3e99d2-118c-44b8-8ae3-03370dde24c0';
const CONSUMER_SECRET = 'E08WAR897WEy2knn7aFBrvegVAf0AFdWBBF';

const oauth = new OAuth({
  consumer: { key: CONSUMER_KEY, secret: CONSUMER_SECRET },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string: string, key: string) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

const SSO_BASE = 'https://sso.garmin.com/sso';
const LOGIN_QS = 'service=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&webhost=https%3A%2F%2Fconnect.garmin.com&source=https%3A%2F%2Fconnect.garmin.com%2Fsignin&gauthHost=https%3A%2F%2Fsso.garmin.com%2Fsso&locale=en_US&id=gauth-widget&clientId=GarminConnect&initialFocus=true&embedWidget=false&generateExtraServiceTicket=true&connectLegalTerms=true';

function extractAllInputs(html: string) {
  const inputs: Record<string, string> = {};
  const re = /<input[^>]+name=["']?([^"' ]+)["']?[^>]*value=["']?([^"' ]*)["']?[^>]*>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    if (match[1] && !['mfa', 'mfa-code', 'username', 'password'].includes(match[1])) {
      inputs[match[1]] = match[2] || '';
    }
  }
  return inputs;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, username, password, mfaCode, state } = body;
    
    let jar: CookieJar;
    if (state?.cookies) {
      jar = CookieJar.fromJSON(state.cookies);
    } else {
      jar = new CookieJar();
    }

    const axiosInst = wrapper(axios.create({ 
      jar, 
      withCredentials: true,
      headers: { 
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
      }
    }));

    if (action === 'login') {
      const signinUrl = `${SSO_BASE}/signin?${LOGIN_QS}`;
      const page1 = await axiosInst.get(signinUrl);
      
      const loginBody = new URLSearchParams();
      loginBody.set('username', username);
      loginBody.set('password', password);
      loginBody.set('embed', 'true');
      loginBody.set('_eventId', 'submit');
      
      const inputs = extractAllInputs(page1.data);
      Object.entries(inputs).forEach(([k, v]) => loginBody.set(k, v));

      const page2 = await axiosInst.post(signinUrl, loginBody.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': 'https://sso.garmin.com',
          'Referer': signinUrl,
        },
      });

      const ticket = page2.data.match(/ticket=([^"&\s]+)/);
      if (ticket) return await performExchange(ticket[1]);

      if (page2.data.includes('mfa-code') || page2.data.includes('loginEnterMfaCode')) {
        return NextResponse.json({
          status: 'mfa_required',
          state: {
            inputs: extractAllInputs(page2.data),
            cookies: jar.toJSON(),
          }
        });
      }

      if (page2.data.includes('Invalid user name or password')) {
        return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
      }

      return NextResponse.json({ error: 'Garmin blocked the automated sign-in. Try using mobile data on your phone.' }, { status: 403 });
    }

    if (action === 'verify') {
      const mfaBody = new URLSearchParams();
      mfaBody.set('mfa-code', mfaCode.trim());
      mfaBody.set('embed', 'true');
      mfaBody.set('_eventId', 'submit');
      if (state.inputs) {
        Object.entries(state.inputs).forEach(([k, v]) => mfaBody.set(k, v as string));
      }

      const verifyUrl = `${SSO_BASE}/verifyMFA/loginEnterMfaCode?${LOGIN_QS}`;
      const page3 = await axiosInst.post(verifyUrl, mfaBody.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': 'https://sso.garmin.com',
          'Referer': `${SSO_BASE}/signin?${LOGIN_QS}`,
        },
      });

      const ticket = page3.data.match(/ticket=([^"&\s]+)/);
      if (ticket) return await performExchange(ticket[1]);

      return NextResponse.json({ error: 'MFA failed. Check the code and try again.' }, { status: 401 });
    }

  } catch (err: any) {
    console.error('[Auth] error:', err.message);
    const status = err.response?.status || 500;
    return NextResponse.json({ error: `Auth failed (${status})` }, { status });
  }
}

async function performExchange(ticket: string) {
  try {
    const preauthUrl = `https://connectapi.garmin.com/oauth-service/oauth/preauthorized?ticket=${ticket}&login-url=https%3A%2F%2Fsso.garmin.com%2Fsso%2Fembed&accepts-mfa-tokens=true`;
    const authHeader1 = oauth.toHeader(oauth.authorize({ url: preauthUrl, method: 'GET' }));
    // Token exchange MUST use Mobile UA
    const res1 = await axios.get(preauthUrl, { headers: { ...authHeader1, 'User-Agent': MOBILE_UA } });
    const oauth1 = qs.parse(res1.data);

    const exchangeUrl = 'https://connectapi.garmin.com/oauth-service/oauth/exchange/user/2.0';
    const token = { key: oauth1.oauth_token as string, secret: oauth1.oauth_token_secret as string };
    const authData = oauth.authorize({ url: exchangeUrl, method: 'POST' }, token);
    const finalUrl = `${exchangeUrl}?${qs.stringify(authData)}`;
    const res2 = await axios.post(finalUrl, null, {
      headers: { 'User-Agent': MOBILE_UA, 'Content-Type': 'application/x-www-form-urlencoded' }
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
