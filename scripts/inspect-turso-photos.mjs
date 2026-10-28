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
  const doc = await client.execute('SELECT id, revision, body FROM mova_documents WHERE id = 1');
  const d = JSON.parse(doc.rows[0].body);
  console.log('Revision in Turso:', doc.rows[0].revision);
  console.log('Hero in Turso:', d.content.heroImage);
  console.log('About in Turso:', d.content.aboutImage);
  console.log('Ana in Turso:', d.content.anaImage);
  console.log('Gallery in Turso:', d.gallery.length, 'photos');
  d.gallery.forEach((g, i) => console.log(' G' + i + ':', g.image));
  console.log('Event cover in Turso:', d.events[0]?.cover);
}

main().catch(console.error);
