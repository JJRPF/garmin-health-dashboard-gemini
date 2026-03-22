#!/usr/bin/env node
/**
 * Semi-Manual Garmin Token Generator (Improved)
 * 
 * Uses a more reliable redirect target and provides better instructions.
 */

const readline = require('readline');

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
  console.log('\n🏃 Garmin Semi-Manual Token Generator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // A slightly different URL that is often more reliable for CAS tickets
  const loginUrl = 'https://sso.garmin.com/sso/signin?service=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&webhost=https%3A%2F%2Fconnect.garmin.com&source=https%3A%2F%2Fconnect.garmin.com%2Fsignin&redirectAfterAccountLoginUrl=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&redirectAfterAccountCreationUrl=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&gauthHost=https%3A%2F%2Fsso.garmin.com%2Fsso&locale=en_US&id=gauth-widget&clientId=GarminConnect&initialFocus=true&embedWidget=false&generateExtraServiceTicket=true';

  console.log('\n\x1b[33m%s\x1b[0m', 'CRITICAL: Open your browser in INCOGNITO / PRIVATE mode first!');
  console.log('\nSTEP 1: Paste this URL into your INCOGNITO browser and log in:');
  console.log('\x1b[36m%s\x1b[0m', loginUrl);
  
  console.log('\nSTEP 2: After logging in, wait for the page to redirect.');
  console.log('The URL in your address bar will change to one containing "ticket=ST-..."');
  console.log('Copy that ENTIRE URL.');

  const fullUrl = await prompt('\nSTEP 3: Paste the NEW URL here: ');

  try {
    // Try to find the ticket anywhere in the string
    const ticketMatch = fullUrl.match(/ticket=(ST-[A-Za-z0-9-]+-cas)/);
    const ticket = ticketMatch ? ticketMatch[1] : null;

    if (!ticket) {
      console.error('\n❌ Error: Could not find a ticket (starts with "ST-") in that URL.');
      console.log('Make sure you copied the URL AFTER logging in, not the one I gave you.');
      process.exit(1);
    }

    console.log('\n✅ Ticket found: ' + ticket.slice(0, 10) + '...');
    console.log('Exchanging for long-lived tokens...');

    const { GarminConnect } = require('@gooin/garmin-connect');
    const gc = new GarminConnect({ username: 'user@example.com', password: 'password' });
    
    // @ts-ignore
    const oauth1 = await gc.client.getOauth1Token(ticket);
    // @ts-ignore
    await gc.client.exchange(oauth1);

    const o1 = JSON.stringify(gc.client.oauth1Token);
    const o2 = JSON.stringify(gc.client.oauth2Token);

    console.log('\n' + '━'.repeat(60));
    console.log('🚀 SUCCESS! COPY THESE TWO STRINGS INTO YOUR APP SETTINGS:');
    console.log('━'.repeat(60));
    console.log('\nGARMIN_OAUTH1:');
    console.log('\x1b[32m%s\x1b[0m', o1);
    console.log('\nGARMIN_OAUTH2:');
    console.log('\x1b[32m%s\x1b[0m', o2);
    console.log('\n' + '━'.repeat(60));
    console.log('Paste these into Settings -> Advanced / Manual Tokens.\n');

  } catch (err) {
    console.error('\n❌ Error during exchange:', err.message);
    console.log('Check if you copied the whole URL. If it still fails, wait 10 minutes and try again.');
    process.exit(1);
  }
}

main();
