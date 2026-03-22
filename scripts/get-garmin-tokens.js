#!/usr/bin/env node
/**
 * Run this script ONCE locally to get long-lived Garmin OAuth tokens.
 * Uses the Mobile App headers to bypass strict Web SSO bot detection.
 */

const readline = require('readline');
const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

// ── Prompt helper ────────────────────────────────────────────────────────────
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

async function main() {
  console.log('\n🏃 Garmin Token Generator');
  console.log('───────────────────────────');

  const user = await prompt('📧  Garmin Email: ');
  const pass = await prompt('🔑  Garmin Password: ', true);

  if (!user || !pass) {
    console.error('❌ Email and password required');
    process.exit(1);
  }

  const jar = new CookieJar();
  const axiosInst = wrapper(axios.create({ jar, withCredentials: true }));

  // Mobile App SSO Parameters
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

  // Use the Mobile App User Agent
  const UA = 'com.garmin.android.apps.connectmobile/4.71.1 (Android 13; Scale/2.25)';

  try {
    console.log('\n🔐  Attempting login...');
    const signinUrl = `${SSO}/signin?${QS}`;
    
    const page1 = await axiosInst.get(signinUrl, { headers: { 'User-Agent': UA } });
    const html1 = page1.data;

    const csrf1 = extractInput(html1, '_csrf');
    const lt = extractInput(html1, 'lt');
    const execution = extractInput(html1, 'execution');

    const loginBody = new URLSearchParams();
    loginBody.set('username', user);
    loginBody.set('password', pass);
    loginBody.set('embed', 'true');
    loginBody.set('_eventId', 'submit');
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

    if (!ticket && (html2.includes('mfa-code') || html2.includes('loginEnterMfaCode'))) {
      console.log('📧  MFA required. Check your email for a code.');
      const mfaCode = await prompt('\n🔢  Enter the 6-digit code: ');
      
      const csrf2 = extractInput(html2, '_csrf');
      const mfaBody = new URLSearchParams();
      mfaBody.set('mfa', mfaCode.trim());
      mfaBody.set('embed', 'true');
      mfaBody.set('_eventId', 'submit');
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
      throw new Error('Could not obtain login ticket. Check credentials or if Garmin is blocking your IP.');
    }

    console.log('✅  Login successful. Exchanging tokens...');
    const { GarminConnect } = require('@gooin/garmin-connect');
    const gc = new GarminConnect({ username: user, password: pass });
    
    // @ts-ignore
    const oauth1 = await gc.client.getOauth1Token(ticket[1]);
    // @ts-ignore
    await gc.client.exchange(oauth1);

    const o1 = JSON.stringify(gc.client.oauth1Token);
    const o2 = JSON.stringify(gc.client.oauth2Token);

    console.log('\n' + '━'.repeat(50));
    console.log('🚀 SUCCESS! COPY THESE TWO STRINGS:');
    console.log('━'.repeat(50));
    console.log('\nGARMIN_OAUTH1:');
    console.log(o1);
    console.log('\nGARMIN_OAUTH2:');
    console.log(o2);
    console.log('\n' + '━'.repeat(50));
    console.log('Paste them into your app settings under "Advanced / Manual Tokens".\n');

  } catch (err) {
    if (err.response?.status === 403) {
      console.error('\n❌ Garmin 403: Your IP is temporarily blocked. Try again in 1 hour or use a phone hotspot.');
    } else {
      console.error('\n❌ Error:', err.message);
    }
    process.exit(1);
  }
}

main();
