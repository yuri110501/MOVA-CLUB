import { createClient } from '@libsql/client';
import fs from 'node:fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (let line of envFile.split('\n')) {
  line = line.replace(/\r$/, '').trim();
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    let key = match[1].trim();
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
}

const client = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

const markers = [
  'home_review_v3',
  'ticketing_setup_v8',
  'public_copy_v10',
  'official_event_v11',
  'refund_policy_v12',
  'launch_v13',
];

async function main() {
  const now = new Date().toISOString();
  for (const m of markers) {
    await client.execute({
      sql: 'INSERT OR REPLACE INTO mova_meta (key, value) VALUES (?, ?)',
      args: [m, now],
    });
  }
  console.log('Successfully set all meta markers in mova_meta.');
}

main().catch(console.error);
