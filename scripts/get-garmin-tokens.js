#!/usr/bin/env node
/**
 * Garmin Token Generator - Garth-Style Flow
 * 
 * This script emulates the 'garth' Python library authentication flow.
 * It is performed entirely in the terminal to avoid "one-time ticket" 
 * consumption issues in the browser.
 */

const readline = require('readline');
const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const qs = require('qs');
const crypto = require('node:crypto');
const OAuth = require('oauth-1.0a');

async function prompt(question, hidden = false) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  if (hidden && process.stdout.isTTY) {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    return new Promise(resolve => {
      let input = '';
      process.stdin.on('data', (ch) => {
        ch = ch.toString();
        if (ch === '\r' || ch === '\n') {
          process.stdin.setRawMode(false);
          process.stdout.write('\n');
          rl.close();
          resolve(input);
        } else if (ch === '\u0003') {
          process.exit();
        } else if (ch === '\u007f') {
          input = input.slice(0, -1);
        } else {
          input += ch;
        }
      });
      process.stdin.resume();
    });
  }
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

function extractInput(html, name) {
  const re = new RegExp(`<input[^>]+name=["']?${name}["']?[^>]*>`, 'i');
  const el = html.match(re);
  if (!el) return null;
  const val = el[0].match(/value=["']([^"']*)/i);
  return val ? val[1] : null;
}

// GARTH / GCM ANDROID CREDENTIALS
const CONSUMER_KEY = 'fc3e99d2-118c-44b8-8ae3-03370dde24c0';
const CONSUMER_SECRET = 'E08WAR897WEy2knn7aFBrvegVAf0AFdWBBF';

const oauth = new OAuth({
  consumer: { key: CONSUMER_KEY, secret: CONSUMER_SECRET },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

const UA = 'com.garmin.android.apps.connectmobile/4.71.1 (Android 13; Scale/2.25)';

async function main() {
  console.log('\n🏃 Garmin Token Generator (Garth-Style)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const user = await prompt('📧  Garmin Email: ');
  const pass = await prompt('🔑  Garmin Password: ', true);

  if (!user || !pass) {
    console.error('❌ Email and password required');
    process.exit(1);
  }

  const jar = new CookieJar();
  const axiosInst = wrapper(axios.create({ jar, withCredentials: true }));

  const SSO = 'https://sso.garmin.com/sso';
  const QS = [
    'service=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F',
    'webhost=https%3A%2F%2Fconnect.garmin.com',
    'source=https%3A%2F%2Fconnect.garmin.com%2Fsignin',
    'gauthHost=https%3A%2F%2Fsso.garmin.com%2Fsso',
    'locale=en_US',
    'id=gauth-widget',
    'clientId=GarminConnect',
    'initialFocus=true',
    'embedWidget=false',
    'generateExtraServiceTicket=true',
    'connectLegalTerms=true',
  ].join('&');

  const signinUrl = `${SSO}/signin?${QS}`;

  try {
    console.log('\n🔐  Step 1: Authenticating...');
    const page1 = await axiosInst.get(signinUrl, { headers: { 'User-Agent': UA } });
    const html1 = page1.data;

    const loginBody = new URLSearchParams();
    loginBody.set('username', user);
    loginBody.set('password', pass);
    loginBody.set('embed', 'true');
    loginBody.set('_eventId', 'submit');
    
    const csrf1 = extractInput(html1, '_csrf');
    const lt = extractInput(html1, 'lt');
    const execution = extractInput(html1, 'execution');
    if (csrf1) loginBody.set('_csrf', csrf1);
    if (lt) loginBody.set('lt', lt);
    if (execution) loginBody.set('execution', execution);

    const page2 = await axiosInst.post(signinUrl, loginBody.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
        'Referer': signinUrl,
      },
    });

    const html2 = page2.data;
    let ticket = html2.match(/ticket=([^"&\s]+)/);

    // Handle MFA
    if (!ticket && (html2.includes('mfa-code') || html2.includes('loginEnterMfaCode'))) {
      console.log('📧  MFA required. Check your email.');
      const mfaCode = await prompt('\n🔢  Enter the 6-digit code: ');
      
      const mfaBody = new URLSearchParams();
      mfaBody.set('mfa', mfaCode.trim());
      mfaBody.set('embed', 'true');
      mfaBody.set('_eventId', 'submit');
      const csrf2 = extractInput(html2, '_csrf');
      if (csrf2) mfaBody.set('_csrf', csrf2);

      const page3 = await axiosInst.post(
        `${SSO}/verifyMFA/loginEnterMfaCode?${QS}`,
        mfaBody.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': UA,
            'Referer': signinUrl,
          },
        }
      );
      ticket = page3.data.match(/ticket=([^"&\s]+)/);
    }

    if (!ticket) {
      throw new Error('Login failed. Check credentials or if Garmin is blocking your IP.');
    }

    const st = ticket[1];
    console.log('✅  Login successful. Exchanging ticket...');

    // Exchange Phase
    const preauthUrl = `https://connectapi.garmin.com/oauth-service/oauth/preauthorized?ticket=${st}&login-url=https%3A%2F%2Fsso.garmin.com%2Fsso%2Fembed&accepts-mfa-tokens=true`;
    const authHeader = oauth.toHeader(oauth.authorize({ url: preauthUrl, method: 'GET' }));

    const res1 = await axios.get(preauthUrl, {
      headers: { ...authHeader, 'User-Agent': UA }
    });

    const oauth1 = qs.parse(res1.data);
    console.log('✅  OAuth1 obtained. Getting OAuth2...');

    const exchangeUrl = 'https://connectapi.garmin.com/oauth-service/oauth/exchange/user/2.0';
    const token = { key: oauth1.oauth_token, secret: oauth1.oauth_token_secret };
    const authData = oauth.authorize({ url: exchangeUrl, method: 'POST' }, token);
    const finalUrl = `${exchangeUrl}?${qs.stringify(authData)}`;

    const res2 = await axios.post(finalUrl, null, {
      headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    console.log('\n' + '━'.repeat(60));
    console.log('🚀 SUCCESS! PASTE THESE INTO YOUR APP SETTINGS:');
    console.log('━'.repeat(60));
    console.log('\nGARMIN_OAUTH1:');
    console.log('\x1b[32m%s\x1b[0m', JSON.stringify(oauth1));
    console.log('\nGARMIN_OAUTH2:');
    console.log('\x1b[32m%s\x1b[0m', JSON.stringify(res2.data));
    console.log('\n' + '━'.repeat(60));

  } catch (err) {
    console.error('\n❌ Error:', err.response?.status === 403 ? 'Blocked by Garmin (403). Try phone hotspot.' : err.message);
    process.exit(1);
  }
}

main();
