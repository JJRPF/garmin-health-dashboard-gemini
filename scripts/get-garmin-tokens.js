#!/usr/bin/env node
/**
 * Garmin Token Generator - Pure HTTP Exchange (Corrected Host)
 * 
 * Host fixed to connectapi.garmin.com
 */

const readline = require('readline');
const axios = require('axios');
const qs = require('qs');
const crypto = require('node:crypto');
const OAuth = require('oauth-1.0a');

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

// Garmin's OAuth Consumer Key/Secret
const CONSUMER_KEY = '693a9ef8-4962-49cf-b6a4-87b69503646d';
const CONSUMER_SECRET = 'bc9f54f0-4939-4018-9125-e0d930d44ad0';

const oauth = new OAuth({
  consumer: { key: CONSUMER_KEY, secret: CONSUMER_SECRET },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

async function main() {
  console.log('\n🏃 Garmin Token Generator (Low-Level Exchange)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const ticketUrl = 'https://sso.garmin.com/sso/login?service=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&generateExtraServiceTicket=true';

  console.log('\nSTEP 1: Log in to https://connect.garmin.com in your browser.');
  console.log('STEP 2: Open DevTools (F12) -> Network tab -> Check "Preserve Log".');
  console.log('STEP 3: Paste this into the same tab:');
  console.log('\x1b[36m%s\x1b[0m', ticketUrl);
  console.log('\nSTEP 4: Look for the "modern/" request and find the ticket.');

  const input = await prompt('\nSTEP 5: Paste the Ticket (ST-...) or full URL: ');

  try {
    let ticket = input;
    if (input.includes('ticket=')) {
      const match = input.match(/ticket=(ST-[A-Za-z0-9-]+-cas)/);
      ticket = match ? match[1] : null;
    }

    if (!ticket || !ticket.startsWith('ST-')) {
      console.error('\n❌ Error: Invalid ticket format.');
      process.exit(1);
    }

    console.log('\n✅ Ticket received. Exchanging for OAuth1...');

    // ─── Phase 1: Ticket -> OAuth1 ──────────────────────────────────────────
    // Correct Host: connectapi.garmin.com
    const preauthUrl = `https://connectapi.garmin.com/oauth-service/oauth/preauthorized?ticket=${ticket}&login-url=https%3A%2F%2Fsso.garmin.com%2Fsso%2Fembed&accepts-mfa-tokens=true`;
    
    const req1 = { url: preauthUrl, method: 'GET' };
    const authHeader = oauth.toHeader(oauth.authorize(req1));

    const res1 = await axios.get(preauthUrl, {
      headers: {
        ...authHeader,
        'User-Agent': 'com.garmin.android.apps.connectmobile',
      }
    });

    const oauth1 = qs.parse(res1.data);
    if (!oauth1.oauth_token || !oauth1.oauth_token_secret) {
      throw new Error('Failed to parse OAuth1 tokens from response.');
    }

    console.log('✅ OAuth1 obtained. Exchanging for OAuth2...');

    // ─── Phase 2: OAuth1 -> OAuth2 ──────────────────────────────────────────
    const exchangeUrl = 'https://connectapi.garmin.com/oauth-service/oauth/exchange/user/2.0';
    const token = {
      key: oauth1.oauth_token,
      secret: oauth1.oauth_token_secret
    };

    const req2 = { url: exchangeUrl, method: 'POST' };
    const authData = oauth.authorize(req2, token);
    const finalUrl = `${exchangeUrl}?${qs.stringify(authData)}`;

    const res2 = await axios.post(finalUrl, null, {
      headers: {
        'User-Agent': 'com.garmin.android.apps.connectmobile',
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    const oauth2 = res2.data;

    console.log('\n' + '━'.repeat(65));
    console.log('🚀 SUCCESS! PASTE THESE INTO YOUR APP SETTINGS:');
    console.log('━'.repeat(65));
    console.log('\nGARMIN_OAUTH1:');
    console.log('\x1b[32m%s\x1b[0m', JSON.stringify(oauth1));
    console.log('\nGARMIN_OAUTH2:');
    console.log('\x1b[32m%s\x1b[0m', JSON.stringify(oauth2));
    console.log('\n' + '━'.repeat(65));

  } catch (err) {
    console.error('\n❌ Error during exchange:');
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error(`Data: ${JSON.stringify(err.response.data)}`);
    } else {
      console.error(err.message);
    }
    process.exit(1);
  }
}

main();
