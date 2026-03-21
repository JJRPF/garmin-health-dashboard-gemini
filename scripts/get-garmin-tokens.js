#!/usr/bin/env node
/**
 * Run this script ONCE locally to get long-lived Garmin OAuth tokens.
 * Supports accounts with MFA (email verification code) enabled.
 *
 * Usage:
 *   node scripts/get-garmin-tokens.js
 */

const readline = require('readline');
const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

// ── Load .env.local ──────────────────────────────────────────────────────────
try {
  const fs = require('fs');
  const envPath = require('path').join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    });
  }
} catch (_) { /* ignore */ }

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

async function ssoLogin(axiosInst, username, password) {
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

  const signinUrl = `${SSO}/signin?${QS}`;
  const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

  console.log('  [1/3] Initializing session...');
  const page1 = await axiosInst.get(signinUrl, { headers: { 'User-Agent': UA } });
  const html1 = page1.data;

  const csrf1 = extractInput(html1, '_csrf');
  const lt = extractInput(html1, 'lt');
  const execution = extractInput(html1, 'execution');

  console.log('  [2/3] Submitting credentials...');
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
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
      Referer: signinUrl,
    },
  });

  const html2 = page2.data;
  const ticket = html2.match(/ticket=([^"&\s]+)/);
  if (ticket) return ticket[1];

  // Detect MFA
  if (!html2.includes('mfa-code') && !html2.includes('loginEnterMfaCode')) {
    throw new Error('Login failed. Please check your credentials or check if your account is locked.');
  }

  console.log('  [MFA] MFA required. A code has been sent to your email.');
  const mfaCode = await prompt('\n📧  Enter the 6-digit code: ');
  if (!mfaCode) throw new Error('No code entered.');

  const csrf2 = extractInput(html2, '_csrf');
  const mfaBody = new URLSearchParams();
  mfaBody.set('mfa', mfaCode.trim());
  mfaBody.set('embed', 'true');
  mfaBody.set('_eventId', 'submit');
  if (csrf2) mfaBody.set('_csrf', csrf2);

  console.log('  [3/3] Verifying code...');
  const page3 = await axiosInst.post(
    `${SSO}/verifyMFA/loginEnterMfaCode?${QS}`,
    mfaBody.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
        Referer: signinUrl,
      },
    }
  );

  const html3 = page3.data;
  const ticket3 = html3.match(/ticket=([^"&\s]+)/);
  if (!ticket3) {
    throw new Error('MFA code rejected. Make sure you used the latest code and try again.');
  }

  return ticket3[1];
}

async function main() {
  const { GarminConnect } = require('@gooin/garmin-connect');

  let user = process.env.GARMIN_USERNAME;
  let pass = process.env.GARMIN_PASSWORD;

  if (!user) user = await prompt('Garmin username (email): ');
  if (!pass) pass = await prompt('Garmin password: ', true);

  if (!user || !pass) {
    console.error('❌  Username and password are required');
    process.exit(1);
  }

  console.log(`\n🔐  Logging in as ${user}...`);

  const jar = new CookieJar();
  const axiosInst = wrapper(axios.create({ jar, withCredentials: true }));

  let ticket;
  try {
    ticket = await ssoLogin(axiosInst, user, pass);
    console.log('  Login successful ✓');
  } catch (err) {
    console.error('\n❌ ', err.message);
    process.exit(1);
  }

  try {
    console.log('  Exchanging ticket for tokens...');
    const gc = new GarminConnect({ username: user, password: pass });
    // @ts-ignore
    const oauth1 = await gc.client.getOauth1Token(ticket);
    // @ts-ignore
    await gc.client.exchange(oauth1);

    const tokens = {
      oauth1: gc.client.oauth1Token,
      oauth2: gc.client.oauth2Token,
    };

    if (!tokens.oauth1 || !tokens.oauth2) throw new Error('Could not extract tokens');

    console.log('\n✅  Tokens obtained!\n');
    console.log('GARMIN_OAUTH1:');
    console.log(JSON.stringify(tokens.oauth1));
    console.log('\nGARMIN_OAUTH2:');
    console.log(JSON.stringify(tokens.oauth2));
    console.log('\nCopy these values into your app settings.');

  } catch (err) {
    console.error('\n❌  Token exchange failed:', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
