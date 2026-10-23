import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {handleAPI,instant,publicState,validateImage,uploadedResponse,validateState} from './lib/core.mjs';
import seed from './lib/seed.json' with {type:'json'};

class Query{
 constructor(db,sql,values=[]){this.db=db;this.sql=sql;this.values=values}
 bind(...values){return new Query(this.db,this.sql,values)}
 async first(){return this.db.prepare(this.sql).get(...this.values)||null}
 async all(){return {results:this.db.prepare(this.sql).all(...this.values)}}
 async run(){const result=this.db.prepare(this.sql).run(...this.values);return {success:true,meta:{changes:Number(result.changes)}}}
}
class DB{
 constructor(){this.raw=new DatabaseSync(':memory:');for(const file of readdirSync(new URL('./drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')))this.raw.exec(readFileSync(new URL('./drizzle/'+file,import.meta.url),'utf8'))}
 prepare(sql){return new Query(this.raw,sql)}
 async batch(statements){this.raw.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());this.raw.exec('COMMIT');return results}catch(e){this.raw.exec('ROLLBACK');throw e}}
 close(){this.raw.close()}
}
class Bucket{map=new Map();async put(name,body,options){this.map.set(name,{body,options})}async get(name){return this.map.get(name)||null}}
let env,db,csrf;
const host={userId:'site-scoped-host',email:'host@example.test',displayName:'QA host'};
const ana={userId:'site-scoped-ana',email:'ana@example.test',displayName:'QA Ana'};
const support={userId:'site-scoped-support',email:'support@example.test',displayName:'QA support'};
async function call(path,{user=host,data,headers={},raw,csrfToken=csrf}={}){
 const options={headers:{Origin:'https://mova.test',...headers}};
 if(data!==undefined||raw!==undefined){options.method='POST';options.headers['X-CSRF-Token']=csrfToken||'';options.headers['Content-Type']??=raw?'image/png':'application/json';options.body=raw??JSON.stringify(data)}
 const response=await handleAPI(new Request('https://mova.test'+path,options),env,user);return {status:response.status,data:await response.json(),headers:response.headers};
}
async function doc(user=host){return (await call('/api/admin/state',{user})).data}
async function publishCurrent(user=host,csrfToken=csrf){const d=await doc(user);await call('/api/admin/preview-state',{user});return call('/api/admin/publish',{user,csrfToken,data:{revision:d.revision,publishedRevision:d.publishedRevision}})}
async function invite(role='support',name='QA support'){const r=await call('/api/admin/invite',{data:{role,name}});assert.equal(r.status,201);return r.data.inviteUrl.split('#')[1]}
beforeEach(async()=>{db=new DB();env={MOVA_SKIP_COPY_UPDATE:'1',DB:db,BUCKET:new Bucket(),MOVA_PUBLIC_ORIGIN:'https://mova.test',MOVA_BOOTSTRAP_OWNER_EMAIL:host.email};const session=await call('/api/session');assert.equal(session.status,200);csrf=session.data.csrf});
afterEach(()=>db.close());
test('Public site works anonymously; private data is excluded',async()=>{const r=await call('/api/public',{user:null});assert.equal(r.status,200);assert.equal(r.data.state.events[0].name.en,'The First Move');assert.equal(r.data.state.sponsors.length,2);assert.equal(r.data.state.gallery.length,4);assert.ok(r.data.state.content.anaBody.en.includes('Bianca Marte'));assert.ok(!JSON.stringify(r.data).includes(host.email))});
test('Missing identity cannot read or write admin state',async()=>{assert.equal((await call('/api/admin/state',{user:null})).status,401);assert.equal((await call('/api/admin/state',{user:null,data:{}})).status,401)});
test('Another signed-in account cannot become an admin',async()=>{const r=await call('/api/session',{user:ana});assert.equal(r.data.user,null);assert.equal(r.data.unauthorized,true);assert.equal((await call('/api/admin/state',{user:ana})).status,403)});
test('Only configured hosting owner can bootstrap, once',async()=>{const r=await call('/api/session');assert.equal(r.data.user.role,'owner');assert.equal((await db.prepare('SELECT count(*) AS n FROM mova_admins').first()).n,1)});
test('CSRF token and exact origin are enforced',async()=>{const d=await doc();assert.equal((await call('/api/admin/state',{data:d,csrfToken:''})).status,403);assert.equal((await call('/api/admin/state',{data:d,headers:{Origin:'https://evil.test'}})).status,403)});
test('Saved changes persist and stale revisions conflict',async()=>{const d=await doc();d.state.events[0].address='QA address';assert.equal((await call('/api/admin/state',{data:d})).status,200);assert.equal((await call('/api/admin/state',{data:d})).status,409);assert.equal((await doc()).state.events[0].address,'QA address')});
test('Overlapping schedules can be saved in a draft but cannot be published',async()=>{const d=await doc();d.state.events[0].schedule[1].start='09:10';assert.equal((await call('/api/admin/state',{data:d})).status,200);assert.equal((await publishCurrent()).status,400);assert.equal((await call('/api/public',{user:null})).data.state.events[0].schedule[1].start,'09:30')});
test('All event eligibility and exact start boundaries',()=>{const s=structuredClone(seed),now=Date.parse('2026-10-17T12:00:00Z');assert.equal(instant(s.events[0]),Date.parse('2026-11-22T14:00:00Z'));for(const [key,value] of [['status','draft'],['status','archived'],['available',false]]){const a=structuredClone(s);a.events[0][key]=value;assert.equal(publicState(a,now).events.length,0)}assert.equal(publicState(s,Date.parse('2026-11-22T14:00:00Z')).events.length,0)});
test('No-event and no-sponsor public state is empty',async()=>{const d=await doc();d.state.events=[];d.state.sponsors=[];assert.equal((await call('/api/admin/state',{data:d})).status,200);assert.equal((await publishCurrent()).status,200);const p=(await call('/api/public',{user:null})).data.state;assert.deepEqual(p.events,[]);assert.deepEqual(p.sponsors,[])});
test('Nonexistent and ambiguous DST times are rejected',()=>{const e=structuredClone(seed.events[0]);e.date='2027-03-14';e.start='02:30';assert.throws(()=>instant(e));e.date='2026-11-01';e.start='01:30';assert.throws(()=>instant(e))});
test('Support invitations require individual identity and are single use',async()=>{const token=await invite();assert.equal((await call('/api/invite/accept',{user:null,data:{token}})).status,401);assert.equal((await call('/api/invite/accept',{user:support,data:{token}})).status,200);assert.equal((await call('/api/invite/accept',{user:support,data:{token}})).status,400);const s=await call('/api/session',{user:support});assert.equal(s.data.user.role,'support')});
test('Support can edit content but cannot edit legal or users',async()=>{const token=await invite();await call('/api/invite/accept',{user:support,data:{token}});const session=(await call('/api/session',{user:support})).data;const d=await doc(support);d.state.content.aboutBody.pt='QA edit';assert.equal((await call('/api/admin/state',{user:support,data:d,csrfToken:session.csrf})).status,200);const legal=await doc(support);legal.state.legal.image.body.pt='QA forbidden edit';assert.equal((await call('/api/admin/state',{user:support,data:legal,csrfToken:session.csrf})).status,403);assert.equal((await call('/api/admin/users',{user:support})).status,403)});
test('Additional administrators retain equal management access; revocation cannot rebootstrap',async()=>{const token=await invite('owner','QA Ana');assert.equal((await call('/api/invite/accept',{user:ana,data:{token}})).status,200);const a=(await call('/api/session',{user:ana})).data;assert.equal(a.user.role,'owner');assert.equal((await call('/api/session')).data.user.role,'owner');assert.equal((await call('/api/admin/revoke',{user:ana,data:{id:host.userId},csrfToken:a.csrf})).status,200);assert.equal((await call('/api/session')).data.user,null);assert.equal((await call('/api/admin/state')).status,403)});
test('Ana and Bianca can both accept separate administrator invitations',async()=>{const one=await invite('owner','QA Ana'),two=await invite('owner','QA other');await call('/api/invite/accept',{user:ana,data:{token:one}});assert.equal((await call('/api/invite/accept',{user:support,data:{token:two}})).status,200);assert.equal((await call('/api/session',{user:ana})).data.user.role,'owner');assert.equal((await call('/api/session',{user:support})).data.user.role,'owner')});
test('Expired invitation grants no access',async()=>{const token=await invite();db.raw.exec('UPDATE mova_invitations SET expires=0');assert.equal((await call('/api/invite/accept',{user:support,data:{token}})).status,400);assert.equal((await call('/api/session',{user:support})).data.user,null)});
test('Valid uploaded PNG survives in file storage and correct MIME',async()=>{const png=readFileSync(new URL('./public/assets/logo-header-pink.png',import.meta.url));const r=await call('/api/admin/upload',{raw:png});assert.equal(r.status,201);const response=await uploadedResponse(r.data.url.split('/').at(-1),env);assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'image/png');assert.ok((await response.arrayBuffer()).byteLength>100)});
test('WebP dimensions and metadata parsing',()=>{const webp=readFileSync(new URL('./public/assets/fitness-concept.webp',import.meta.url));const r=validateImage(webp,'image/webp');assert.equal(r.width,704);assert.equal(r.height,340)});
test('Executable, fake, oversized and mismatched uploads are rejected',async()=>{assert.equal((await call('/api/admin/upload',{raw:new TextEncoder().encode('<svg onload="alert(1)">'),headers:{'Content-Type':'image/svg+xml'}})).status,415);assert.equal((await call('/api/admin/upload',{raw:new Uint8Array(9*1024*1024)})).status,413);const png=readFileSync(new URL('./public/assets/logo-header-pink.png',import.meta.url));assert.throws(()=>validateImage(png,'image/jpeg'))});
test('Restore preserves full history; export omits access records',async()=>{const d=await doc();d.state.content.aboutTitle.en='QA changed';await call('/api/admin/state',{data:d});assert.equal((await call('/api/admin/restore',{data:{target:1,revision:2}})).status,200);assert.equal((await doc()).state.content.aboutTitle.en,seed.content.aboutTitle.en);const e=(await call('/api/admin/export')).data;assert.deepEqual(Object.keys(e).sort(),['revision','state']);assert.ok(!JSON.stringify(e).includes(host.email))});
test('Unsafe draft links are rejected and missing required images block publication',async()=>{const d=await doc();d.state.content.instagram='javascript:alert(1)';assert.equal((await call('/api/admin/state',{data:d})).status,400);const a=await doc();a.state.content.heroImage='';assert.equal((await call('/api/admin/state',{data:a})).status,200);assert.equal((await publishCurrent()).status,400)});
test('Draft image release reflects mandatory demonstration consent',()=>{assert.match(seed.legal.image.body.en,/required/);assert.match(seed.legal.image.body.pt,/obrigatório/);validateState(seed)});
test('Security headers and safe errors',async()=>{const r=await call('/api/health',{user:null});assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');assert.ok(r.headers.get('Content-Security-Policy').includes("frame-ancestors 'none'"));const bad=await call('/api/admin/state',{raw:'{broken',headers:{'Content-Type':'application/json'}});assert.equal(bad.status,400);assert.ok(!JSON.stringify(bad.data).includes('stack'))});

test('Home migration preserves edited events and uploads, adds approved partners once',async()=>{
 const d=await doc();d.state.content.anaTitle={en:'The woman',pt:'A mulher'};d.state.content.anaBody={en:'Ana',pt:'Ana'};d.state.events[0].address='Preserved venue';d.state.content.heroImage='/uploads/12345678901234567890123456789012.jpg';d.state.gallery=[];d.state.sponsors=[{name:'Existing partner',logo:'/assets/favicon.png',url:'https://example.com',active:true}];
 db.raw.prepare('UPDATE mova_documents SET body=?,revision=7 WHERE id=1').run(JSON.stringify(d.state));db.raw.prepare('DELETE FROM mova_meta WHERE key=?').run('home_review_v3');
 const r=(await call('/api/public',{user:null})).data;assert.equal(r.revision,8);assert.equal(r.state.events[0].address,'Preserved venue');assert.ok(r.state.content.heroImage.startsWith('/uploads/'));assert.equal(r.state.sponsors.length,3);assert.equal(r.state.gallery.length,4);assert.ok(r.state.content.anaBody.pt.includes('Bianca Marte'));
 assert.equal((await call('/api/public',{user:null})).data.revision,8);
 const h=(await call('/api/admin/history')).data.history;assert.ok(h.some(x=>x.revision===8));
});

test('Home migration leaves an existing real gallery intact',async()=>{
 const d=await doc();d.state.gallery=[{image:'/assets/favicon.png',caption:{en:'Our event',pt:'Nosso evento'},active:true}];db.raw.prepare('UPDATE mova_documents SET body=? WHERE id=1').run(JSON.stringify(d.state));db.raw.prepare('DELETE FROM mova_meta WHERE key=?').run('home_review_v3');
 const r=(await call('/api/public',{user:null})).data.state;assert.equal(r.gallery.length,1);assert.equal(r.gallery[0].caption.en,'Our event');
});

test('Draft saves never change the public version; direct confirmed publishing does',async()=>{
 const before=(await call('/api/public',{user:null})).data;const d=await doc();d.state.content.aboutTitle.en='QA DRAFT ONLY';
 const saved=await call('/api/admin/state',{data:d});assert.equal(saved.status,200);assert.equal(saved.data.hasDraft,true);
 const live=(await call('/api/public',{user:null})).data;assert.equal(live.revision,before.revision);assert.notEqual(live.state.content.aboutTitle.en,'QA DRAFT ONLY');
 assert.equal((await call('/api/admin/publish',{data:{revision:saved.data.revision,publishedRevision:saved.data.publishedRevision}})).status,200);const after=(await call('/api/public',{user:null})).data;assert.equal(after.state.content.aboutTitle.en,'QA DRAFT ONLY');assert.equal(after.revision,before.revision+1);
});
test('Private draft previews require an active administrative account',async()=>{
 assert.equal((await call('/api/admin/preview-state',{user:null})).status,401);assert.equal((await call('/api/admin/preview-state',{user:ana})).status,403);
 const d=await doc();d.state.content.aboutTitle.en='PRIVATE PREVIEW';await call('/api/admin/state',{data:d});const preview=await call('/api/admin/preview-state');assert.equal(preview.data.state.content.aboutTitle.en,'PRIVATE PREVIEW');assert.equal(preview.data.editorPreview,true);assert.equal(preview.headers.get('Cache-Control'),'no-store');
});
test('Preview remains optional after a later draft save',async()=>{
 const d=await doc();d.state.content.aboutTitle.en='First draft';await call('/api/admin/state',{data:d});await call('/api/admin/preview-state');const a=await doc();a.state.content.aboutTitle.en='Changed after preview';await call('/api/admin/state',{data:a});const current=await doc();assert.equal(current.reviewed,false);assert.equal((await call('/api/admin/publish',{data:{revision:current.revision,publishedRevision:current.publishedRevision}})).status,200);
});
test('Incomplete gallery entries remain saved in drafts and are omitted from preview',async()=>{
 const d=await doc();d.state.gallery.push({image:'',caption:{en:'',pt:''},active:true});assert.equal((await call('/api/admin/state',{data:d})).status,200);assert.equal((await doc()).state.gallery.length,d.state.gallery.length);const p=await call('/api/admin/preview-state');assert.equal(p.data.state.gallery.length,d.state.gallery.length-1);assert.equal((await publishCurrent()).status,400);
});
test('Publishing a stale or duplicate request does not overwrite a newer public version',async()=>{
 const d=await doc();d.state.content.aboutTitle.en='Version A';await call('/api/admin/state',{data:d});await call('/api/admin/preview-state');const ready=await doc();const body={revision:ready.revision,publishedRevision:ready.publishedRevision};assert.equal((await call('/api/admin/publish',{data:body})).status,200);assert.equal((await call('/api/admin/publish',{data:body})).status,409);assert.equal((await call('/api/public',{user:null})).data.state.content.aboutTitle.en,'Version A');
});
test('Restoring history modifies the draft and leaves the public version intact',async()=>{
 const d=await doc();d.state.content.aboutTitle.en='Published B';await call('/api/admin/state',{data:d});await publishCurrent();const latest=await doc();assert.equal((await call('/api/admin/restore',{data:{target:1,revision:latest.revision}})).status,200);assert.equal((await doc()).state.content.aboutTitle.en,seed.content.aboutTitle.en);assert.equal((await call('/api/public',{user:null})).data.state.content.aboutTitle.en,'Published B');
});
test('Support cannot publish legal changes left in a shared draft by the owner',async()=>{
 const d=await doc();d.state.legal.terms.body.en+=' QA LEGAL DRAFT';await call('/api/admin/state',{data:d});const token=await invite();await call('/api/invite/accept',{user:support,data:{token}});const session=(await call('/api/session',{user:support})).data;assert.equal((await publishCurrent(support,session.csrf)).status,403);
});

test('The development credit cannot be replaced through the CMS API',async()=>{
 const d=await doc();d.state.content.credit='Unapproved replacement';assert.equal((await call('/api/admin/state',{data:d})).status,403);
 const s=structuredClone(seed);s.content.credit='Historical replacement';assert.equal(publicState(s).content.credit,'Designed by Venancio Neto');
});
test('Direct publishing still requires authentication and CSRF',async()=>{
 const d=await doc();d.state.content.aboutTitle.en='Direct publish';const saved=(await call('/api/admin/state',{data:d})).data;const data={revision:saved.revision,publishedRevision:saved.publishedRevision};
 assert.equal((await call('/api/admin/publish',{user:null,data})).status,401);assert.equal((await call('/api/admin/publish',{data,csrfToken:''})).status,403);
 assert.equal((await call('/api/public',{user:null})).data.state.content.aboutTitle.en,seed.content.aboutTitle.en);
});

test('Eventbrite URLs saved in the Admin connect the matching public event after publication',async()=>{
 const d=await doc();d.state.events[0].eventbriteUrl='https://www.eventbrite.com/e/2003621624214/';d.state.events[0].eventbritePromoCode='teste';d.state.events[0].eventbriteTestMode=true;
 const second=structuredClone(d.state.events[0]);second.id='second-event';second.date='2030-01-01';second.eventbriteUrl='https://www.eventbrite.com/e/1234567890123/';second.eventbritePromoCode='';second.eventbriteTestMode=false;d.state.events.push(second);
 assert.equal((await call('/api/admin/state',{data:d})).status,200);assert.equal((await publishCurrent()).status,200);
 const events=(await call('/api/public',{user:null})).data.state.events;assert.equal(events[0].checkout.eventId,'2003621624214');assert.equal(events[0].checkout.promoCode,'teste');assert.equal(events[0].checkout.testMode,true);assert.equal(events[1].checkout.eventId,'1234567890123');assert.equal(events[1].checkout.promoCode,'');assert.equal(events[1].checkout.testMode,false);
});
test('Malformed Eventbrite links cannot be saved, and old invalid links do not break the public site',async()=>{
 const d=await doc();d.state.events[0].eventbriteUrl='https://www.eventbrite.com/';assert.equal((await call('/api/admin/state',{data:d})).status,400);
 assert.equal(publicState(d.state).events[0].checkout,null);
});

test('Removing the automatic coupon preserves pending draft text and does not publish it',async()=>{
 const live=JSON.parse(db.raw.prepare('SELECT body FROM mova_documents WHERE id=1').get().body);live.events[0].eventbriteUrl='https://www.eventbrite.com/e/2003621624214/?discount=teste';live.events[0].eventbritePromoCode='teste';live.events[0].eventbriteTestMode=true;
 const d=await doc();d.state=structuredClone(live);d.state.content.aboutTitle.en='UNPUBLISHED PRIVATE CONTENT';
 db.raw.prepare('UPDATE mova_documents SET body=? WHERE id=1').run(JSON.stringify(live));db.raw.prepare('UPDATE mova_drafts SET body=? WHERE id=1').run(JSON.stringify(d.state));db.raw.prepare('DELETE FROM mova_meta WHERE key=?').run('ticketing_setup_v8');
 const before=d.publishedRevision,publicResult=(await call('/api/public',{user:null})).data,after=await doc();
 assert.equal(publicResult.revision,before+1);assert.notEqual(publicResult.state.content.aboutTitle.en,'UNPUBLISHED PRIVATE CONTENT');assert.equal(publicResult.state.events[0].checkout.eventId,'2003621624214');
 assert.equal(after.state.content.aboutTitle.en,'UNPUBLISHED PRIVATE CONTENT');assert.equal(after.hasDraft,true);assert.equal(after.baseRevision,publicResult.revision);assert.equal(after.state.events[0].eventbritePromoCode,'');
 assert.equal(publicResult.state.events[0].checkout.promoCode,'');assert.equal(new URL(publicResult.state.events[0].checkout.url).searchParams.has('discount'),false);assert.equal(after.state.events[0].eventbriteUrl,'https://www.eventbrite.com/e/2003621624214/');
 assert.equal((await call('/api/public',{user:null})).data.revision,publicResult.revision);
});
test('Checkout setup retains a separately edited Eventbrite link in the pending draft',async()=>{
 const live=JSON.parse(db.raw.prepare('SELECT body FROM mova_documents WHERE id=1').get().body);live.events[0].eventbriteUrl='';delete live.events[0].eventbritePromoCode;delete live.events[0].eventbriteTestMode;
 const d=await doc();d.state=structuredClone(live);d.state.events[0].eventbriteUrl='https://www.eventbrite.com/e/1234567890123/';d.state.events[0].eventbritePromoCode='OTHER';d.state.events[0].eventbriteTestMode=false;
 db.raw.prepare('UPDATE mova_documents SET body=? WHERE id=1').run(JSON.stringify(live));db.raw.prepare('UPDATE mova_drafts SET body=? WHERE id=1').run(JSON.stringify(d.state));db.raw.prepare('DELETE FROM mova_meta WHERE key=?').run('ticketing_setup_v8');
 assert.equal((await call('/api/public',{user:null})).data.state.events[0].checkout.eventId,'2003621624214');const after=await doc();assert.equal(after.state.events[0].eventbriteUrl,'https://www.eventbrite.com/e/1234567890123/');assert.equal(after.state.events[0].eventbritePromoCode,'OTHER');assert.equal(after.state.events[0].eventbriteTestMode,false);
});

test('Administrators cannot revoke themselves or lose admin rights by accepting an editor invitation',async()=>{
 assert.equal((await call('/api/admin/revoke',{data:{id:host.userId}})).status,400);
 const token=await invite('support','Existing admin');await call('/api/invite/accept',{data:{token}});
 assert.equal((await call('/api/session')).data.user.role,'owner');
});
test('Photo framing persists separately for desktop and phone and rejects unsafe metadata',async()=>{
 const d=await doc();d.state.content.heroImageFrame={desktop:{x:30,y:80,zoom:1.6},mobile:{x:70,y:40,zoom:2}};
 assert.equal((await call('/api/admin/state',{data:d})).status,200);assert.equal((await publishCurrent()).status,200);
 assert.deepEqual((await call('/api/public',{user:null})).data.state.content.heroImageFrame,d.state.content.heroImageFrame);
 for(const value of [-1,101,'50; color:red']){const a=await doc();a.state.content.heroImageFrame.desktop.x=value;assert.equal((await call('/api/admin/state',{data:a})).status,400)}
 const a=await doc();a.state.content.heroImageFrame.mobile.zoom=4;assert.equal((await call('/api/admin/state',{data:a})).status,400);
});
test('Portable content backup preserves published and pending content without identities or tokens',async()=>{
 const d=await doc();d.state.content.aboutTitle.en='Unpublished text';await call('/api/admin/state',{data:d});
 const backup=await call('/api/admin/backup');assert.equal(backup.status,200);assert.equal(backup.data.format,'mova-portable-v1');assert.equal(backup.data.draft.state.content.aboutTitle.en,'Unpublished text');assert.notEqual(backup.data.published.state.content.aboutTitle.en,'Unpublished text');
 assert.ok(!JSON.stringify(backup.data).includes(host.email));assert.ok(!JSON.stringify(backup.data).includes(csrf));assert.equal((await call('/api/admin/backup',{user:null})).status,401);
 const token=await invite();await call('/api/invite/accept',{user:support,data:{token}});assert.equal((await call('/api/admin/backup',{user:support})).status,403);
});

test('Public cleanup updates only legacy copy and preserves every pending photo and edit',async()=>{
 const original=await doc();original.state.content.heroImage='/uploads/12345678901234567890123456789012.jpg';original.state.content.aboutTitle.pt='Texto preservado';await call('/api/admin/state',{data:original});
 delete env.MOVA_SKIP_COPY_UPDATE;const live=(await call('/api/public',{user:null})).data;
 assert.ok(!live.state.legal.terms.body.en.includes('DRAFT FOR REVIEW'));
 assert.ok(live.state.legal.privacy.body.en.includes('Eventbrite'));
 const draft=await doc();assert.equal(draft.state.content.heroImage,original.state.content.heroImage);assert.equal(draft.state.content.aboutTitle.pt,'Texto preservado');assert.equal(draft.baseRevision,live.revision);
 assert.equal((await call('/api/public',{user:null})).data.revision,live.revision);
});
