#!/usr/bin/env node
/**
 * Garmin Token Generator - "The Fail-Safe Method"
 * 
 * This version works even if Garmin's automatic redirect fails.
 */

const readline = require('readline');

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
  console.log('\n🏃 Garmin Token Generator (Fail-Safe Method)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const loginUrl = 'https://connect.garmin.com/signin';

  console.log('\nSTEP 1: Log in to Garmin Connect');
  console.log('1. Open your browser (Incognito recommended).');
  console.log('2. Go to: \x1b[36m%s\x1b[0m', loginUrl);
  console.log('3. Log in with your email and password.');
  
  console.log('\nSTEP 2: Get your Service Ticket');
  console.log('1. Once you are logged in and see your dashboard, PASTE this URL into the SAME tab:');
  console.log('\x1b[33m%s\x1b[0m', 'https://sso.garmin.com/sso/login?service=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&generateExtraServiceTicket=true');
  console.log('2. The page will likely be blank, but the URL in your address bar will now have a ticket.');
  console.log('3. Look for \x1b[1m"ticket=ST-XXXXX-cas"\x1b[0m in the URL.');

  const fullUrl = await prompt('\nSTEP 3: Paste the ENTIRE URL from your address bar here: ');

  try {
    const ticketMatch = fullUrl.match(/ticket=(ST-[A-Za-z0-9-]+-cas)/);
    const ticket = ticketMatch ? ticketMatch[1] : null;

    if (!ticket) {
      console.error('\n❌ Error: No ticket found in that URL.');
      console.log('The URL should look like: https://connect.garmin.com/modern/?ticket=ST-...');
      console.log('Make sure you followed Step 2 correctly while still logged in.');
      process.exit(1);
    }

    console.log('\n✅ Ticket found: ' + ticket.slice(0, 15) + '...');
    console.log('Exchanging for long-lived OAuth tokens...');

    const { GarminConnect } = require('@gooin/garmin-connect');
    const gc = new GarminConnect({ username: 'user@example.com', password: 'password' });
    
    // @ts-ignore
    const oauth1 = await gc.client.getOauth1Token(ticket);
    // @ts-ignore
    await gc.client.exchange(oauth1);

    const o1 = JSON.stringify(gc.client.oauth1Token);
    const o2 = JSON.stringify(gc.client.oauth2Token);

    console.log('\n' + '━'.repeat(65));
    console.log('🚀 SUCCESS! PASTE THESE INTO YOUR APP SETTINGS:');
    console.log('━'.repeat(65));
    console.log('\nGARMIN_OAUTH1:');
    console.log('\x1b[32m%s\x1b[0m', o1);
    console.log('\nGARMIN_OAUTH2:');
    console.log('\x1b[32m%s\x1b[0m', o2);
    console.log('\n' + '━'.repeat(65));
    console.log('Paste these into Settings -> Advanced / Manual Tokens.\n');

  } catch (err) {
    console.error('\n❌ Error during exchange:', err.message);
    console.log('If your IP is heavily blocked, this exchange might fail. Try using a phone hotspot.');
    process.exit(1);
  }
}

main();
