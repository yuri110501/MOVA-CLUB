import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

// 1. Read env from .env.local
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

if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
  console.error('Missing TURSO credentials in .env.local');
  process.exit(1);
}

const client = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

async function main() {
  console.log('Connecting to Turso DB...');
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('Tables in Turso DB:', tables.rows.map(r => r.name));
  for (const t of tables.rows) {
    const count = await client.execute('SELECT COUNT(*) as c FROM ' + t.name);
    console.log(`Table ${t.name}: ${count.rows[0].c} rows`);
  }
  
  // 1. Check or initialize document
  let docResult = await client.execute('SELECT id, body, revision FROM mova_documents ORDER BY revision DESC LIMIT 1');
  if (docResult.rows.length === 0) {
    console.log('mova_documents is empty. Initializing from seed...');
    const seed = JSON.parse(fs.readFileSync('lib/seed.json', 'utf8'));
    await client.execute({
      sql: 'INSERT INTO mova_documents(id, body, revision) VALUES(1, ?, 1)',
      args: [JSON.stringify(seed)]
    });
    docResult = await client.execute('SELECT id, body, revision FROM mova_documents WHERE id = 1');
  }
  
  const currentDocRow = docResult.rows[0];
  const currentRevision = Number(currentDocRow.revision);
  const currentState = JSON.parse(currentDocRow.body);
  console.log(`Current revision in Turso DB: ${currentRevision}`);
  
  // Save backup snapshot
  const backupDir = path.resolve('.data');
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(
    path.join(backupDir, `backup-turso-rev${currentRevision}.json`),
    JSON.stringify({ revision: currentRevision, state: currentState }, null, 2)
  );
  console.log(`Snapshot saved to .data/backup-turso-rev${currentRevision}.json`);

  // 2. Load authentic photos from original-public.json (Rev 36)
  const origPath = 'C:/Users/Yuri/Documents/Codex/2026-10-19/fa-a-estas-altera-es-em/work/mova-recovery-2026-10-28/original-public.json';
  const originalData = JSON.parse(fs.readFileSync(origPath, 'utf8'));
  const origState = originalData.state;

  console.log('Merging authentic photos into current document...');

  // 3. Compose merged state:
  const nextState = JSON.parse(JSON.stringify(currentState));

  // A. Hero Image & Concept flag
  nextState.content.heroImage = origState.content.heroImage;
  nextState.content.heroImageConcept = false;
  if (origState.content.heroImageFrame) {
    nextState.content.heroImageFrame = origState.content.heroImageFrame;
  }
  if (origState.content.heroAlt) {
    nextState.content.heroAlt = origState.content.heroAlt;
  }

  // B. About Image & Concept flag
  nextState.content.aboutImage = origState.content.aboutImage;
  nextState.content.aboutImageConcept = false;
  if (origState.content.aboutImageFrame) {
    nextState.content.aboutImageFrame = origState.content.aboutImageFrame;
  }
  if (origState.content.aboutAlt) {
    nextState.content.aboutAlt = origState.content.aboutAlt;
  }

  // C. Ana Image
  nextState.content.anaImage = origState.content.anaImage;
  if (origState.content.anaImageFrame) {
    nextState.content.anaImageFrame = origState.content.anaImageFrame;
  }
  if (origState.content.anaAlt) {
    nextState.content.anaAlt = origState.content.anaAlt;
  }

  // D. Gallery (8 authentic community & fitness photos)
  nextState.gallery = origState.gallery;

  // E. Event cover for the official event
  if (nextState.events && nextState.events.length > 0 && origState.events && origState.events.length > 0) {
    nextState.events[0].cover = origState.events[0].cover;
    if (origState.events[0].coverFrame) {
      nextState.events[0].coverFrame = origState.events[0].coverFrame;
    }
  }

  // nextState.sponsors (Venâncio & Eventbrite) is preserved!
  // nextState.legal and nextState.faq is preserved!

  const targetRevision = currentRevision + 1;
  const jsonBody = JSON.stringify(nextState);

  console.log(`Applying Revision ${targetRevision} to Turso DB...`);

  await client.batch([
    {
      sql: 'UPDATE mova_documents SET body = ?, revision = ? WHERE id = 1',
      args: [jsonBody, targetRevision],
    },
    {
      sql: 'INSERT INTO mova_history (revision, body, actor, name, at, action) VALUES (?, ?, ?, ?, ?, ?)',
      args: [
        targetRevision,
        jsonBody,
        'system-restore',
        'Restore Authentic Community Photographs',
        new Date().toISOString(),
        'restoration',
      ],
    },
  ], 'write');

  console.log(`Success! Updated mova_documents to Revision ${targetRevision}.`);
}

main().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
