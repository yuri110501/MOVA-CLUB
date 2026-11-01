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
  const origPath = 'C:/Users/Yuri/Documents/Codex/2026-10-19/fa-a-estas-altera-es-em/work/mova-recovery-2026-10-28/original-public.json';
  const originalData = JSON.parse(fs.readFileSync(origPath, 'utf8'));
  const origEvents = originalData.state.events;

  const doc = await client.execute('SELECT id, revision, body FROM mova_documents WHERE id = 1');
  const current = JSON.parse(doc.rows[0].body);
  const nextRevision = Number(doc.rows[0].revision) + 1;

  // Replace events with official event from original-public.json
  current.events = origEvents;

  const jsonBody = JSON.stringify(current);

  await client.batch([
    {
      sql: 'UPDATE mova_documents SET body = ?, revision = ? WHERE id = 1',
      args: [jsonBody, nextRevision],
    },
    {
      sql: 'INSERT INTO mova_history (revision, body, actor, name, at, action) VALUES (?, ?, ?, ?, ?, ?)',
      args: [
        nextRevision,
        jsonBody,
        'system-restore',
        'Restore Official Eventbrite Integration',
        new Date().toISOString(),
        'event-update',
      ],
    },
  ], 'write');

  console.log(`Success! Updated Event 0 to official event with Eventbrite checkout (Revision ${nextRevision}).`);
}

main().catch(console.error);
