import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyLaunchUpdate,launchEventId} from './lib/launch-v13.mjs';
import {validateState,publicState,instant,pageResponse} from './lib/core.mjs';
import {renderPublicHTML,sitemapXML,brandSEO} from './lib/seo.mjs';
import seed from './lib/seed.json' with {type:'json'};
const fixture=()=>{const s=structuredClone(seed);s.events[0].id=launchEventId;return s};
const html=readFileSync(new URL('./lib/pages/index.html',import.meta.url),'utf8');
test('Launch patch matches definitive times, total, inclusions, transfers and confidential location',()=>{
 const s=applyLaunchUpdate(fixture()),e=s.events[0];validateState(s);
 assert.deepEqual(e.schedule.map(s=>[s.start,s.end]),[['09:50','10:30'],['10:30','11:00'],['11:00','11:45'],['11:45','13:00'],['13:00','13:00']]);
 assert.equal(e.mainStart,'10:30');assert.equal(e.doors,'09:50');assert.equal(instant(e),Date.parse('2026-11-22T14:50:00Z'));assert.equal(instant(e,'end'),Date.parse('2026-11-22T18:00:00Z'));
 assert.equal(e.price,39.19);assert.equal(e.ticketPricing.base+e.ticketPricing.fees,39.19);assert.equal(e.capacity,50);assert.equal(e.benefits.length,5);assert.match(e.benefits[3].body.en,/guaranteed/);
 assert.match(s.legal.terms.body.pt,/20 de novembro de 2026/);assert.match(s.legal.terms.body.en,/applicable law/);assert.equal(s.faq.length,6);assert.equal(e.eventbritePromoCode,'');assert.equal(e.address,'');assert.equal(e.mapUrl,'');
 assert.doesNotMatch(JSON.stringify({faq:s.faq,event:e}),/09:45|12:30|7 days|7 dias|Instagram/);
});
test('Launch patch is idempotent and preserves photos, framing and unrelated pending content',()=>{
 const original=fixture();original.content.aboutBody.en='UNPUBLISHED OWNER TEXT';original.events[0].cover='/uploads/12345678901234567890123456789012.jpg';original.events[0].coverFrame={desktop:{x:30,y:40,zoom:2},mobile:{x:45,y:60,zoom:1}};original.faq.push({question:{en:'Independent FAQ',pt:'Dúvida independente'},answer:{en:'Keep',pt:'Preservar'}});
 const after=applyLaunchUpdate(original);assert.deepEqual(applyLaunchUpdate(after),after);assert.deepEqual(after.content,original.content);assert.deepEqual(after.gallery,original.gallery);assert.deepEqual(after.sponsors,original.sponsors);assert.equal(after.events[0].cover,original.events[0].cover);assert.deepEqual(after.events[0].coverFrame,original.events[0].coverFrame);assert.equal(after.faq.at(-1).question.en,'Independent FAQ');
});
test('Only final closing milestone is allowed and invalid pricing is rejected',()=>{
 const s=applyLaunchUpdate(fixture());s.events[0].schedule[1].end=s.events[0].schedule[1].start;assert.throws(()=>validateState(s));
 const bad=applyLaunchUpdate(fixture());bad.events[0].ticketPricing.fees=5;assert.throws(()=>validateState(bad));
});
test('Public JSON strips confidential address and map; event remains available until closing',()=>{
 const s=applyLaunchUpdate(fixture());s.events[0].address='CONFIDENTIAL ADDRESS';s.events[0].mapUrl='https://example.test/secret-map';
 const p=publicState(s,Date.parse('2026-11-22T17:00:00Z'));assert.equal(p.events.length,1);assert.equal(p.events[0].address,'');assert.equal(p.events[0].mapUrl,'');assert.doesNotMatch(JSON.stringify(p),/CONFIDENTIAL ADDRESS|secret-map/);assert.equal(publicState(s,Date.parse('2026-11-22T18:00:00Z')).events.length,0);
});
test('Canonical SEO is bilingual, brand-focused and delivered without JavaScript',()=>{
 const s=publicState(applyLaunchUpdate(fixture()),Date.parse('2026-10-26T00:00:00Z'));
 for(const lang of ['en','pt']){
  const rendered=renderPublicHTML(html,new Request('https://native.example/?lang='+lang),s).html;
  assert.ok(rendered.includes(brandSEO[lang].description));assert.ok(rendered.includes('https://www.movacluborlando.com/'+(lang==='pt'?'?lang=pt':'')));assert.match(rendered,/hreflang="pt-BR"/);assert.match(rendered,/<main id="main">.*MOVA Club Orlando/s);assert.match(rendered,/mova-initial-state/);assert.match(rendered,/mova-share-v11.png/);assert.doesNotMatch(rendered,/content="noindex/);
 }
 const detail=renderPublicHTML(html,new Request('https://native.example/events/'+launchEventId+'?lang=pt'),s);assert.equal(detail.status,200);assert.match(detail.html,/Treino funcional com Ana Maia/);assert.match(detail.html,/13:00/);
 const missing=renderPublicHTML(html,new Request('https://native.example/events/missing'),s);assert.equal(missing.status,404);assert.match(missing.html,/content="noindex,follow"/);
 const xss=structuredClone(s);xss.content.aboutBody.en='</template><script>alert(1)</script>';assert.doesNotMatch(renderPublicHTML(html,new Request('https://native.example/'),xss).html,/<script>alert/);
});
test('Sitemap contains only public canonical EN/PT pages; admin and preview stay noindex',()=>{
 const xml=sitemapXML(publicState(applyLaunchUpdate(fixture()),Date.parse('2026-10-26')));assert.match(xml,/events\/event-14fa371d/);assert.match(xml,/\?lang=pt/);assert.doesNotMatch(xml,/admin|gestao|api\/|preview|address/i);
 assert.equal(pageResponse('<script src="/admin.js?v=13"></script>').headers.get('X-Robots-Tag'),'noindex, nofollow');assert.equal(pageResponse('<body data-editor-preview><script src="/site.js?v=13"></script>').headers.get('X-Robots-Tag'),'noindex, nofollow');
 const robots=readFileSync(new URL('./public/robots.txt',import.meta.url),'utf8');assert.doesNotMatch(robots,/Disallow: \/\s*$/m);assert.match(robots,/Sitemap: https:\/\/www.movacluborlando.com\/sitemap.xml/);
});
