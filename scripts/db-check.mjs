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

async function main() {
  const meta = await client.execute('SELECT * FROM mova_meta');
  console.log('mova_meta rows:', meta.rows);
  const doc = await client.execute('SELECT id, revision FROM mova_documents');
  console.log('mova_documents rows:', doc.rows);
  const history = await client.execute('SELECT revision, action, name FROM mova_history');
  console.log('mova_history rows:', history.rows);
}

main().catch(console.error);
