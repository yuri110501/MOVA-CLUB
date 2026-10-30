import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyClientCopy} from './lib/client-copy-v15.mjs';
import {applyLaunchUpdate,launchEventId} from './lib/launch-v13.mjs';
import {validateState,publicState} from './lib/core.mjs';
import {renderPublicHTML} from './lib/seo.mjs';
import seed from './lib/seed.json' with {type:'json'};
test('Reviewed copy preserves event setup and renders matching bilingual pricing without JavaScript',()=>{
 const original=structuredClone(seed);original.events[0].id=launchEventId;
 const base=applyLaunchUpdate(original),updated=applyClientCopy(base);validateState(updated);
 assert.deepEqual(applyClientCopy(updated),updated);assert.deepEqual(updated.content,base.content);
 assert.equal(updated.events[0].eventbriteUrl,base.events[0].eventbriteUrl);
 assert.deepEqual(updated.events[0].ticketPricing,base.events[0].ticketPricing);
 const html=readFileSync(new URL('./lib/pages/index.html',import.meta.url),'utf8');
 for(const lang of ['en','pt']){
  const rendered=renderPublicHTML(html,new Request('https://mova.test/?lang='+lang),publicState(updated,Date.parse('2026-10-30'))).html;
  assert.match(rendered,/MetroWest/);assert.match(rendered,/39.19/);
  assert.ok(rendered.includes(lang==='pt'?'taxas do Eventbrite inclusas':'includes Eventbrite fees'));
  assert.doesNotMatch(rendered,/fee-breakdown|Expected total/);
 }
});
