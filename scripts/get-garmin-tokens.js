#!/usr/bin/env node
/**
 * Semi-Manual Garmin Token Generator
 * 
 * 1. Opens the official Garmin login in your browser.
 * 2. You log in manually (bypassing all bot detection).
 * 3. You paste the resulting URL back here.
 * 4. This script exchanges the ticket for long-lived OAuth tokens.
 */

const readline = require('readline');

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
  console.log('\n🏃 Garmin Semi-Manual Token Generator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('This method is 100% reliable because YOU perform the login in your browser.');
  
  const loginUrl = 'https://sso.garmin.com/sso/signin?service=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&webhost=https%3A%2F%2Fconnect.garmin.com&source=https%3A%2F%2Fconnect.garmin.com%2Fsignin&gauthHost=https%3A%2F%2Fsso.garmin.com%2Fsso&locale=en_US&id=gauth-widget&clientId=GarminConnect&initialFocus=true&embedWidget=false&generateExtraServiceTicket=true&connectLegalTerms=true';

  console.log('\nSTEP 1: Open this URL in your browser and log in:');
  console.log('\x1b[36m%s\x1b[0m', loginUrl);
  
  console.log('\nSTEP 2: After logging in, you will see a BLANK PAGE.');
  console.log('Copy the ENTIRE URL from the address bar (it starts with "https://connect.garmin.com/modern/?ticket=...")');

  const fullUrl = await prompt('\nSTEP 3: Paste the copied URL here: ');

  try {
    const url = new URL(fullUrl);
    const ticket = url.searchParams.get('ticket');

    if (!ticket) {
      console.error('\n❌ Error: Could not find a "ticket" in that URL. Did you copy the whole thing?');
      process.exit(1);
    }

    console.log('\n✅ Ticket found! Exchanging for tokens...');

    // We need the @gooin/garmin-connect package for the exchange
    const { GarminConnect } = require('@gooin/garmin-connect');
    
    // We use dummy credentials because the ticket is already authenticated
    const gc = new GarminConnect({ username: 'user@example.com', password: 'password' });
    
    // @ts-ignore - access internal httpClient
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
    console.log('Try running the script again. If it still fails, your Vercel IP might be blocked from the exchange API.');
    process.exit(1);
  }
}

main();
