#!/usr/bin/env node
import 'dotenv/config';
import { AtmosClient } from './src/client.js';
import { parseTemperatures } from './src/parser.js';
import { initCsv, appendRow } from './src/csv.js';

const username = process.env.ATMOS_USERNAME || getArg('--username');
const password = process.env.ATMOS_PASSWORD || getArg('--password');
const interval = parseInt(process.env.POLL_INTERVAL || getArg('--interval') || '60', 10) * 1000;
const outputFile = process.env.OUTPUT_FILE || getArg('--output') || 'atmos_history.csv';
const debug = process.argv.includes('--debug');

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx !== -1 ? process.argv[idx + 1] : null;
}

async function main() {
  if (!username || !password) {
    console.error('Error: Username and password required');
    console.error('Set ATMOS_USERNAME and ATMOS_PASSWORD in .env or use --username and --password');
    process.exit(1);
  }

  const client = new AtmosClient();

  console.log('Logging in to Atmos Cloud...');
  await client.login(username, password);
  console.log('Login successful');

  console.log('Waiting for device connection...');
  const connected = await client.waitForConnection(15000, 2000);

  if (connected) {
    console.log('Device connected');
    console.log('Navigating to Info page...');
    const infoResponse = await client.navigateToInfo();

    if (debug) {
      const fs = await import('fs');
      fs.writeFileSync('debug_info.html', infoResponse);
      console.log('Wrote Info page response to debug_info.html');
    }
    console.log('Info page loaded');
  } else {
    console.log('Device not connected after 15s, using home page data');
  }

  initCsv(outputFile);
  console.log(`Logging to ${outputFile} every ${interval / 1000}s`);
  console.log('Press Ctrl+C to stop\n');

  let running = true;
  process.on('SIGINT', () => {
    console.log('\nStopping...');
    running = false;
    process.exit(0);
  });

  while (running) {
    try {
      const xml = await client.pollTemperatures();
      if (debug) {
        const fs = await import('fs');
        fs.writeFileSync('debug_poll.xml', xml);
      }
      const data = parseTemperatures(xml);

      // Only write if we have actual sensor data (more than just timestamp)
      const sensorKeys = Object.keys(data).filter(k => k !== 'timestamp');
      if (sensorKeys.length > 0) {
        appendRow(outputFile, data);

        const temps = sensorKeys.map(k => `${k}=${data[k]}`).join(' ');
        console.log(`[${data.timestamp.toISOString()}] ${temps}`);
      } else if (debug) {
        console.log(`[${data.timestamp.toISOString()}] (no data)`);
      }
    } catch (err) {
      console.error('Poll error:', err.message);
    }

    await new Promise((r) => setTimeout(r, interval));
  }
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
