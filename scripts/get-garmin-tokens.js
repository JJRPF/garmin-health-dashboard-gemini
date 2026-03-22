#!/usr/bin/env node
/**
 * Garmin Token Generator - "The Network Inspector Method"
 * 
 * Fix: Explicitly fetch OAuth consumer before ticket exchange.
 */

const readline = require('readline');

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
  console.log('\n🏃 Garmin Token Generator (Network Inspector Method)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const ticketUrl = 'https://sso.garmin.com/sso/login?service=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&generateExtraServiceTicket=true';

  console.log('\nSTEP 1: Prepare your Browser');
  console.log('1. Open Chrome or Safari (Incognito recommended).');
  console.log('2. Log in to \x1b[36mhttps://connect.garmin.com\x1b[0m normally.');
  console.log('3. Once logged in, press \x1b[1mF12\x1b[0m (or Cmd+Opt+I) to open DevTools.');
  console.log('4. Go to the \x1b[1mNetwork\x1b[0m tab.');
  console.log('5. \x1b[33mCRITICAL:\x1b[0m Check the \x1b[1m"Preserve Log"\x1b[0m checkbox.');
  
  console.log('\nSTEP 2: Capture the Ticket');
  console.log('1. Paste this URL into the SAME browser tab:');
  console.log('\x1b[36m%s\x1b[0m', ticketUrl);
  console.log('2. The page will redirect back to your dashboard.');
  console.log('3. In the Network tab, look for a request named \x1b[1m"modern/"\x1b[0m.');
  console.log('4. Click it and look at the \x1b[1mURL\x1b[0m in the "General" or "Summary" section.');
  console.log('5. It will contain \x1b[32m?ticket=ST-XXXXX-cas\x1b[0m.');

  const input = await prompt('\nSTEP 3: Paste the Ticket (ST-...) or the full URL here: ');

  try {
    let ticket = input;
    if (input.includes('ticket=')) {
      const match = input.match(/ticket=(ST-[A-Za-z0-9-]+-cas)/);
      ticket = match ? match[1] : null;
    }

    if (!ticket || !ticket.startsWith('ST-')) {
      console.error('\n❌ Error: Invalid ticket format. It should start with "ST-".');
      process.exit(1);
    }

    console.log('\n✅ Ticket found! Initializing OAuth exchange...');

    const { GarminConnect } = require('@gooin/garmin-connect');
    const gc = new GarminConnect({ username: 'user@example.com', password: 'password' });
    
    // @ts-ignore - access internal httpClient
    const client = gc.client;

    console.log('  [1/2] Fetching OAuth consumer metadata...');
    await client.fetchOauthConsumer();

    console.log('  [2/2] Exchanging ticket for tokens...');
    const oauth1 = await client.getOauth1Token(ticket);
    await client.exchange(oauth1);

    const o1 = JSON.stringify(client.oauth1Token);
    const o2 = JSON.stringify(client.oauth2Token);

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
    process.exit(1);
  }
}

main();
