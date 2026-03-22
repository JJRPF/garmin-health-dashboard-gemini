#!/usr/bin/env node
/**
 * Garmin Token Generator - Multi-Key Brute Force Exchange
 * 
 * Automatically tries multiple consumer keys to find the one that matches 
 * your account's region/type.
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

// Known Consumer Keys extracted from various Garmin apps
const KNOWN_KEYS = [
  { name: 'Android GCM (Primary)', key: 'fc3e99d2-118c-44b8-8ae3-03370dde24c0', secret: 'E08WAR897WEy2knn7aFBrvegVAf0AFdWBBF' },
  { name: 'Garmin Connect (Web)', key: '693a9ef8-4962-49cf-b6a4-87b69503646d', secret: 'bc9f54f0-4939-4018-9125-e0d930d44ad0' },
  { name: 'iOS Connect (Legacy)', key: 'ad39402c-5a06-4e71-8267-d4f3d0cf3f2d', secret: 'A6956944BB4D4070AA2B7CFE3CC5697EE' }
];

function getOAuth(consumer) {
  return new OAuth({
    consumer: { key: consumer.key, secret: consumer.secret },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    },
  });
}

async function main() {
  console.log('\n🏃 Garmin Token Generator (Multi-Key Exchange)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const ticketUrl = 'https://sso.garmin.com/sso/login?service=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&generateExtraServiceTicket=true';

  console.log('\nSTEP 1: Log in to https://connect.garmin.com in your browser.');
  console.log('STEP 2: Open DevTools (F12) -> Network tab -> Check "Preserve Log".');
  console.log('STEP 3: Paste this into the same tab:');
  console.log('\x1b[36m%s\x1b[0m', ticketUrl);
  console.log('\nSTEP 4: Look for the "modern/" request and find the ticket (ST-...).');

  const input = await prompt('\nSTEP 5: Paste the Ticket (ST-...) or full URL: ');

  let ticket = input;
  if (input.includes('ticket=')) {
    const match = input.match(/ticket=(ST-[A-Za-z0-9-]+-cas)/);
    ticket = match ? match[1] : null;
  }

  if (!ticket || !ticket.startsWith('ST-')) {
    console.error('\n❌ Error: Invalid ticket format.');
    process.exit(1);
  }

  console.log('\n✅ Ticket received. Testing consumer keys...');

  let oauth1 = null;
  let workingConsumer = null;

  for (const consumer of KNOWN_KEYS) {
    process.stdout.write(`  Trying ${consumer.name}... `);
    
    try {
      const oauth = getOAuth(consumer);
      const url = `https://connectapi.garmin.com/oauth-service/oauth/preauthorized?ticket=${ticket}&login-url=https%3A%2F%2Fsso.garmin.com%2Fsso%2Fembed&accepts-mfa-tokens=true`;
      
      const req = { url, method: 'GET' };
      const authHeader = oauth.toHeader(oauth.authorize(req));

      const res = await axios.get(url, {
        headers: {
          ...authHeader,
          'User-Agent': 'com.garmin.android.apps.connectmobile',
        }
      });

      oauth1 = qs.parse(res.data);
      workingConsumer = consumer;
      console.log('\x1b[32mSUCCESS!\x1b[0m');
      break;
    } catch (err) {
      if (err.response?.status === 401) {
        console.log('\x1b[31mRejected\x1b[0m');
      } else {
        console.log(`\x1b[31mError (${err.response?.status || err.message})\x1b[0m`);
      }
    }
  }

  if (!oauth1 || !workingConsumer) {
    console.error('\n❌ All exchange attempts failed.');
    console.log('This usually means the ticket was already used, expired, or Garmin is rate-limiting you.');
    console.log('Wait 10 minutes, get a NEW ticket, and try again.');
    process.exit(1);
  }

  try {
    console.log('\n✅ OAuth1 obtained. Exchanging for OAuth2...');
    
    const exchangeUrl = 'https://connectapi.garmin.com/oauth-service/oauth/exchange/user/2.0';
    const oauth = getOAuth(workingConsumer);
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
    console.error('\n❌ OAuth2 exchange failed:', err.message);
    process.exit(1);
  }
}

main();
