import {applyLaunchUpdate} from './launch-v13.mjs';
import refundPolicy from './refund-policy-v12.json' with {type:'json'};
import officialEvent from './official-event-v11.json' with {type:'json'};
import publicCopy from './public-copy-v10.json' with {type:'json'};
import seed from './seed.json' with { type: 'json' };
import homeUpdate from './home-review-v3.json' with { type: 'json' };
import bootstrapConfig from './bootstrap-config.json' with {type:'json'};
import adminPath from './admin-path.json' with {type:'json'};
import {eventbriteCheckout} from './eventbrite.mjs';
import ticketingSetup from './ticketing-setup-v8.json' with {type:'json'};
export const DEVELOPER_CREDIT='Designed by Venancio Neto';

export class Problem extends Error{constructor(status,message){super(message);this.status=status}}
const fail=(condition,message,status=400)=>{if(condition)throw new Problem(status,message)};
const MAX_BODY=2*1024*1024,MAX_UPLOAD=8*1024*1024;
const nowISO=()=>new Date().toISOString();
const random=()=>crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
const hash=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');
const eq=(a,b)=>{a=String(a??'');b=String(b??'');let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0};
const statement=(db,sql,...values)=>db.prepare(sql).bind(...values);
const first=(db,sql,...values)=>statement(db,sql,...values).first();
const run=(db,sql,...values)=>statement(db,sql,...values).run();
const rows=async(db,sql,...values)=>(await statement(db,sql,...values).all()).results;
export const securityHeaders={
 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY',
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
 'Permissions-Policy':'camera=(), microphone=(), geolocation=()'
};
const json=(value,status=200,extra={})=>Response.json(value,{status,headers:{...securityHeaders,...extra}});
export const pageResponse=html=>{
 const headers={...securityHeaders,'Content-Type':'text/html; charset=utf-8'};
 if(!html.includes('/site.js?')||html.includes('data-editor-preview'))headers['X-Robots-Tag']='noindex, nofollow';
 if(html.includes('/site.js?')){
  headers['Referrer-Policy']='origin-when-cross-origin';
  headers['Content-Security-Policy']=securityHeaders['Content-Security-Policy']
   .replace("script-src 'self'", "script-src 'self' https://www.eventbrite.com")
   .replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
   + '; frame-src https://www.eventbrite.com';
 }
 return new Response(html,{headers});
};

function text(value,max=5000){fail(typeof value!=='string'||value.length>max,'Texto inválido ou longo demais.')}
function bilingual(value,max=5000){fail(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='en,pt','Preencha as versões EN e PT.');text(value.en,max);text(value.pt,max)}
function httpsURL(value,eventbrite=false){text(value,2048);if(!value)return;let u;try{u=new URL(value)}catch{throw new Problem(400,'Use um link HTTPS válido.')};fail(u.protocol!=='https:'||!u.hostname||u.username||u.password,'Use um link HTTPS válido.');if(eventbrite)fail(!['eventbrite.com','eventbrite.com.br'].some(d=>u.hostname===d||u.hostname.endsWith('.'+d)),'Use o link oficial do Eventbrite.')}
function imagePath(value){text(value,200);fail(value&&!/^\/(assets|uploads)\/[a-zA-Z0-9_.-]+\.(png|webp|jpe?g)$/.test(value),'Selecione uma imagem enviada ao painel.')}
function imageFrame(value){
 if(value===undefined)return;
 fail(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='desktop,mobile','Enquadramento inválido.');
 for(const v of Object.values(value))fail(!v||Object.keys(v).sort().join(',')!=='x,y,zoom'||!Number.isFinite(v.x)||v.x<0||v.x>100||!Number.isFinite(v.y)||v.y<0||v.y>100||!Number.isFinite(v.zoom)||v.zoom<1||v.zoom>3,'Enquadramento inválido.');
}
function zonedParts(ms,tz){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(ms).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00`}
export function instant(event,key='start'){
 try{
  fail(!/^\d{4}-\d{2}-\d{2}$/.test(event.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(event[key]),'Data ou horário inválido.');
  const wall=event.date+'T'+event[key]+':00';const target=Date.parse(wall+'Z');fail(!Number.isFinite(target)||new Date(target).toISOString().slice(0,16)!==wall.slice(0,16),'Data inválida.');
  let candidate=target;for(let i=0;i<4;i++){const offset=Date.parse(zonedParts(candidate,event.timezone)+'Z')-candidate;candidate=target-offset}
  fail(zonedParts(candidate,event.timezone)!==wall,'Horário inexistente na mudança de fuso.');
  for(const step of [-3600000,-1800000,1800000,3600000])fail(zonedParts(candidate+step,event.timezone)===wall,'Horário ambíguo na mudança de fuso. Escolha outro horário.');
  return candidate;
 }catch(e){if(e instanceof Problem)throw e;throw new Problem(400,'Data, hora ou fuso inválido.')}
}
export function validateState(s,{draft=false}={}){
 fail(!s||Object.keys(s).sort().join(',')!=='content,events,faq,gallery,legal,sponsors','Estrutura de conteúdo inválida.');
 const c=s.content;
 for(const k of ['heroTitle','heroSubtitle','heroAlt','aboutTitle','aboutBody','aboutAlt','anaTitle','anaBody','anaAlt','footerText'])bilingual(c[k]);
 for(const k of ['heroImage','aboutImage','anaImage']){imagePath(c[k]);imageFrame(c[k+'Frame'])}
 fail(!draft&&(!c.heroImage||!c.aboutImage),'Selecione as imagens do Hero e do About antes de salvar.');
 for(const k of ['heroImageConcept','aboutImageConcept'])fail(typeof c[k]!=='boolean','Marcação da imagem inválida.');
 httpsURL(c.instagram);text(c.contactEmail,254);text(c.credit,200);fail(c.credit!==DEVELOPER_CREDIT,'O crédito do desenvolvimento é fixo e não pode ser editado pelo painel.',403);fail(c.contactEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.contactEmail),'E-mail inválido.');
 for(const [key,max] of [['events',200],['faq',30],['gallery',100],['sponsors',100]])fail(!Array.isArray(s[key])||s[key].length>max,'Quantidade de itens inválida.');
 const ids=new Set();
 for(const e of s.events){
  fail(!/^[a-z0-9-]{1,80}$/.test(e.id)||ids.has(e.id),'Identificador de evento inválido ou repetido.');ids.add(e.id);
  fail(!['draft','published','archived'].includes(e.status),'Status inválido.');fail(typeof e.available!=='boolean'||typeof e.coverConcept!=='boolean','Disponibilidade inválida.');
  for(const k of ['name','venue','description','included'])bilingual(e[k]);
  if(!draft)fail(instant(e,'end')<=instant(e,'start'),'O término deve ser depois do início.');else{for(const k of ['date','start','end','timezone'])text(e[k],100)}for(const k of ['city','address'])text(e[k],500);
  if(e.doors!==undefined){text(e.doors,5);fail(e.doors!==''&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.doors)||(!draft&&e.doors>e.start)),'A abertura deve ocorrer antes do início.')}
  for(const k of ['agePolicy','refundPolicy'])if(e[k]!==undefined)bilingual(e[k],500);
  for(const k of ['locationNotice','transferPolicy'])if(e[k]!==undefined)bilingual(e[k],1500);
  if(e.mainStart!==undefined){text(e.mainStart,5);fail(e.mainStart!==''&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.mainStart)||!draft&&(e.mainStart<e.start||e.mainStart>e.end)),'Horário da programação principal inválido.')}
  if(e.limitedSpots!==undefined)fail(typeof e.limitedSpots!=='boolean','Disponibilidade de vagas inválida.');
  if(e.locationPrivate!==undefined)fail(typeof e.locationPrivate!=='boolean','Privacidade do local inválida.');
  if(e.ticketPricing!==undefined){const p=e.ticketPricing;fail(!p||Object.keys(p).sort().join(',')!=='base,fees'||[p.base,p.fees].some(v=>!Number.isFinite(v)||v<0||v>100000)||e.price===null||Math.round((p.base+p.fees)*100)!==Math.round(e.price*100),'O ingresso e as taxas devem somar o preço total.');}
  if(e.benefits!==undefined){fail(!Array.isArray(e.benefits)||e.benefits.length>12,'Benefícios inválidos.');for(const benefit of e.benefits){bilingual(benefit.title,150);bilingual(benefit.body,500)}}
  httpsURL(e.mapUrl);httpsURL(e.eventbriteUrl,true);imagePath(e.cover);imageFrame(e.coverFrame);
  if(e.eventbritePromoCode!==undefined)text(e.eventbritePromoCode,100);
  fail(e.eventbriteTestMode!==undefined&&typeof e.eventbriteTestMode!=='boolean','Modo de checkout inválido.');
  try{eventbriteCheckout(e)}catch(error){throw new Problem(400,error.message)}
  fail(e.price!==null&&(typeof e.price!=='number'||!Number.isFinite(e.price)||e.price<0||e.price>100000),'Preço inválido.');
  fail(e.capacity!==null&&(!Number.isInteger(e.capacity)||e.capacity<1||e.capacity>100000),'Capacidade inválida.');fail(e.currency!=='USD','Use USD nesta versão.');
  fail(!Array.isArray(e.schedule)||e.schedule.length>60,'Cronograma inválido.');let previous=e.start;
  for(const [index,a] of e.schedule.entries()){for(const v of [a.start,a.end])fail(typeof v!=='string'||(!draft||v!=='')&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(v),'Horário inválido no cronograma.');const closing=index===e.schedule.length-1&&a.start===a.end&&a.end===e.end;fail(!draft&&(a.start<e.start||a.end>e.end||a.end<a.start||a.end===a.start&&!closing||a.start<previous),'Cronograma fora de ordem, com sobreposição ou fora do evento.');previous=a.end;bilingual(a.title,500);if(a.description!==undefined)bilingual(a.description,500)}
 }
 for(const p of s.gallery){imagePath(p.image);imageFrame(p.imageFrame);fail(!draft&&!p.image,'Envie uma fotografia antes de publicar.');bilingual(p.caption,500);fail(typeof p.active!=='boolean','Status inválido.')}
 for(const p of s.sponsors){text(p.name,150);imagePath(p.logo);fail(!draft&&!p.logo,'Envie uma logo antes de publicar.');httpsURL(p.url);fail(typeof p.active!=='boolean','Status inválido.')}
 for(const f of s.faq){bilingual(f.question,300);bilingual(f.answer)}
 for(const k of ['terms','privacy','image']){bilingual(s.legal[k].title,100);bilingual(s.legal[k].body,20000)}
 fail(JSON.stringify(s).length>MAX_BODY,'O conteúdo ultrapassa o limite permitido.');
}
export function publicState(state,now=Date.now()){
 const s=structuredClone(state);s.content.credit=DEVELOPER_CREDIT;s.events=s.events.filter(e=>e.status==='published'&&e.available&&instant(e,'end')>now).sort((a,b)=>instant(a)-instant(b));
 for(const e of s.events){if(e.locationPrivate){e.address='';e.mapUrl=''}e.startsAt=new Date(instant(e)).toISOString();e.endsAt=new Date(instant(e,'end')).toISOString();try{e.checkout=eventbriteCheckout(e)}catch{e.checkout=null}}
 s.gallery=s.gallery.filter(p=>p.active);s.sponsors=s.sponsors.filter(p=>p.active);return s;
}
async function initialized(db){
 await db.batch([
  statement(db,'INSERT OR IGNORE INTO mova_documents(id,body,revision) VALUES(1,?,1)',JSON.stringify(seed)),
  statement(db,'INSERT OR IGNORE INTO mova_history(revision,body,actor,name,at,action) VALUES(1,?,NULL,NULL,?,?)',JSON.stringify(seed),nowISO(),'Initial content')
 ]);
}
async function upgradeHome(db){
 const marker='home_review_v3';
 if(await first(db,'SELECT value FROM mova_meta WHERE key=?',marker))return;
 const d=await stateData(db),s=d.state;
 Object.assign(s.content,homeUpdate.content);
 for(const p of homeUpdate.sponsors){const i=s.sponsors.findIndex(x=>x.name.toLowerCase()===p.name.toLowerCase());if(i<0)s.sponsors.push(p);else s.sponsors[i]={...s.sponsors[i],...p}}
 if(!s.gallery.length)s.gallery=structuredClone(homeUpdate.gallery);
 s.legal.privacy.body=homeUpdate.privacy;
 validateState(s);const body=JSON.stringify(s);
 const current=await first(db,'SELECT body FROM mova_documents WHERE id=1');
 if(current.body===body){await run(db,'INSERT OR IGNORE INTO mova_meta(key,value) VALUES(?,?)',marker,'complete');return}
 await db.batch([
  statement(db,'UPDATE mova_documents SET body=?,revision=revision+1 WHERE id=1 AND revision=?',body,d.revision),
  statement(db,'INSERT OR IGNORE INTO mova_history(revision,body,actor,name,at,action) SELECT revision,body,NULL,?,?,? FROM mova_documents WHERE id=1 AND revision=? AND body=?','MOVA website update',nowISO(),'Founders, sponsors and gallery review',d.revision+1,body),
  statement(db,'INSERT OR IGNORE INTO mova_meta(key,value) SELECT ?,? FROM mova_documents WHERE id=1 AND revision=? AND body=?',marker,'complete',d.revision+1,body)
 ]);
}
// One-time, authorized checkout setup. Rebase only these fields, preserving pending content.
async function upgradeTicketing(db){
 const marker='ticketing_setup_v8';if(await first(db,'SELECT value FROM mova_meta WHERE key=?',marker))return;
 const live=await stateData(db),state=structuredClone(live.state),event=state.events.find(e=>e.id===ticketingSetup.movaEventId);
 if(!event){await run(db,'INSERT OR IGNORE INTO mova_meta(key,value) VALUES(?,?)',marker,nowISO());return}
 const keys=['eventbriteUrl','eventbritePromoCode','eventbriteTestMode'];
 const oldEvent=live.state.events.find(e=>e.id===event.id);
 for(const key of keys)event[key]=ticketingSetup[key];
 const body=JSON.stringify(state),nextRevision=live.revision+1;
 const draft=await first(db,'SELECT * FROM mova_drafts WHERE id=1');
 const statements=[
  statement(db,'UPDATE mova_documents SET body=?,revision=? WHERE id=1 AND revision=? AND body=? AND NOT EXISTS(SELECT 1 FROM mova_meta WHERE key=?)',body,nextRevision,live.revision,JSON.stringify(live.state),marker),
  statement(db,'INSERT OR IGNORE INTO mova_history(revision,body,actor,name,at,action) SELECT revision,body,NULL,NULL,?,? FROM mova_documents WHERE id=1 AND revision=? AND body=?',nowISO(),'Authorized Eventbrite checkout setup',nextRevision,body)
 ];
 if(draft&&draft.base_revision===live.revision){
  const draftState=JSON.parse(draft.body),draftEvent=draftState.events.find(e=>e.id===event.id);
  if(draftEvent){
   const checkoutChanged=keys.some(key=>JSON.stringify(draftEvent[key])!==JSON.stringify(oldEvent[key]));
   if(!checkoutChanged){for(const key of keys)draftEvent[key]=ticketingSetup[key]}
   else{
    let sameEvent=false;try{sameEvent=eventbriteCheckout(draftEvent)?.eventId===eventbriteCheckout(event).eventId}catch{}
    if(sameEvent)for(const key of keys.slice(1))if(draftEvent[key]===undefined)draftEvent[key]=ticketingSetup[key];
   }
  }
  statements.push(statement(db,'UPDATE mova_drafts SET body=?,revision=revision+1,base_revision=?,updated_at=? WHERE id=1 AND revision=? AND base_revision=? AND EXISTS(SELECT 1 FROM mova_documents WHERE id=1 AND revision=? AND body=?)',JSON.stringify(draftState),nextRevision,nowISO(),draft.revision,live.revision,nextRevision,body));
 }
 statements.push(statement(db,'INSERT OR IGNORE INTO mova_meta(key,value) SELECT ?,? FROM mova_documents WHERE id=1 AND revision=? AND body=?',marker,nowISO(),nextRevision,body));
 const results=await db.batch(statements);
 fail(results[0].meta.changes!==1&&!await first(db,'SELECT value FROM mova_meta WHERE key=?',marker),'Outra atualização ocorreu ao conectar o checkout. Tente novamente.',409);
}
export function cleanLegacyCopy(state){
 const s=structuredClone(state);
 for(const key of ['terms','privacy','image'])for(const lang of ['en','pt']){
  if(s.legal[key].body[lang]===seed.legal[key].body[lang]||(key==='privacy'&&s.legal[key].body[lang]===homeUpdate.privacy[lang]))s.legal[key].body[lang]=publicCopy.legal[key][lang];
 }
 for(const f of s.faq)for(const lang of ['en','pt'])if(/This preview offers a demonstration only|Esta prévia oferece apenas uma demonstração/.test(f.answer[lang]))f.answer[lang]=publicCopy.faqAnswer[lang];
 return s;
}
async function upgradePublicCopy(db){
 const marker='public_copy_v10';if(await first(db,'SELECT value FROM mova_meta WHERE key=?',marker))return;
 const live=await stateData(db),s=cleanLegacyCopy(live.state),body=JSON.stringify(s),next=live.revision+1;
 const draft=await first(db,'SELECT body FROM mova_drafts WHERE id=1');
 const batch=[statement(db,'UPDATE mova_documents SET body=?,revision=? WHERE id=1 AND revision=?',body,next,live.revision)];
 batch.push(statement(db,'INSERT OR IGNORE INTO mova_history(revision,body,actor,name,at,action) SELECT revision,body,NULL,NULL,?,? FROM mova_documents WHERE id=1 AND revision=? AND body=?',nowISO(),'Public content update',next,body));
 if(draft)batch.push(statement(db,'UPDATE mova_drafts SET body=?,revision=revision+1,base_revision=?,updated_at=? WHERE id=1 AND body=? AND EXISTS(SELECT 1 FROM mova_documents WHERE id=1 AND revision=? AND body=?)',JSON.stringify(cleanLegacyCopy(JSON.parse(draft.body))),next,nowISO(),draft.body,next,body));
 batch.push(statement(db,'INSERT OR IGNORE INTO mova_meta(key,value) SELECT ?,? FROM mova_documents WHERE id=1 AND revision=? AND body=?',marker,nowISO(),next,body));
 await db.batch(batch);
 fail(!await first(db,'SELECT value FROM mova_meta WHERE key=?',marker),'Outra edição ocorreu. Atualize a página.',409);
}
export function applyOfficialEvent(state){
 const s=structuredClone(state),e=s.events.find(e=>e.id===officialEvent.targetId);
 if(!e)return s;
 Object.assign(e,structuredClone(officialEvent.fields));
 for(const f of s.faq){
  if(f.question.en==='Where is the event?')f.answer={en:'The MOVA Experience takes place in Orlando. The venue and full address will be announced.',pt:'A MOVA Experience acontece em Orlando. O local e o endereço completo serão anunciados.'};
  if(f.question.en==='What should I bring?')f.answer={en:'Wear comfortable workout clothes and come ready to move and connect. All fitness levels are welcome, and you can come solo.',pt:'Use uma roupa confortável para treinar e venha se movimentar e fazer novas conexões. Todos os níveis são bem-vindos, e você pode vir sozinha.'};
  if(f.question.en==='How do tickets and cancellations work?')f.answer=structuredClone(refundPolicy.faq);
 }
 return s;
}
async function upgradeOfficialEvent(db){
 const marker='official_event_v11';if(await first(db,'SELECT value FROM mova_meta WHERE key=?',marker))return;
 const live=await stateData(db),s=applyOfficialEvent(live.state);
 fail(!s.events.some(e=>e.id===officialEvent.targetId),'O evento a atualizar não foi encontrado.',409);
 validateState(s);const body=JSON.stringify(s),next=live.revision+1,draft=await first(db,'SELECT body FROM mova_drafts WHERE id=1');
 const batch=[statement(db,'UPDATE mova_documents SET body=?,revision=? WHERE id=1 AND revision=?',body,next,live.revision)];
 batch.push(statement(db,'INSERT OR IGNORE INTO mova_history(revision,body,actor,name,at,action) SELECT revision,body,NULL,NULL,?,? FROM mova_documents WHERE id=1 AND revision=? AND body=?',nowISO(),'Official MOVA Experience event',next,body));
 if(draft)batch.push(statement(db,'UPDATE mova_drafts SET body=?,revision=revision+1,base_revision=?,updated_at=? WHERE id=1 AND body=? AND EXISTS(SELECT 1 FROM mova_documents WHERE id=1 AND revision=? AND body=?)',JSON.stringify(applyOfficialEvent(JSON.parse(draft.body))),next,nowISO(),draft.body,next,body));
 batch.push(statement(db,'INSERT OR IGNORE INTO mova_meta(key,value) SELECT ?,? FROM mova_documents WHERE id=1 AND revision=? AND body=?',marker,nowISO(),next,body));
 await db.batch(batch);fail(!await first(db,'SELECT value FROM mova_meta WHERE key=?',marker),'Outra edição ocorreu. Atualize a página.',409);
}
export function applyRefundPolicy(state){
 const s=structuredClone(state);
 for(const e of s.events)if(e.id===officialEvent.targetId)e.refundPolicy=structuredClone(refundPolicy.summary);
 for(const f of s.faq)if(f.question.en==='How do tickets and cancellations work?')f.answer=structuredClone(refundPolicy.faq);
 for(const lang of ['en','pt'])if(!s.legal.terms.body[lang].includes(refundPolicy.heading[lang]))s.legal.terms.body[lang]+='\n\n'+refundPolicy.heading[lang]+'\n\n'+refundPolicy.body[lang];
 return s;
}
async function upgradeRefundPolicy(db){
 const marker='refund_policy_v12';if(await first(db,'SELECT value FROM mova_meta WHERE key=?',marker))return;
 const live=await stateData(db),s=applyRefundPolicy(live.state),body=JSON.stringify(s),next=live.revision+1;
 validateState(s);
 const draft=await first(db,'SELECT body FROM mova_drafts WHERE id=1');
 const batch=[statement(db,'UPDATE mova_documents SET body=?,revision=? WHERE id=1 AND revision=?',body,next,live.revision)];
 batch.push(statement(db,'INSERT OR IGNORE INTO mova_history(revision,body,actor,name,at,action) SELECT revision,body,NULL,NULL,?,? FROM mova_documents WHERE id=1 AND revision=? AND body=?',nowISO(),'Refund policy aligned with Eventbrite',next,body));
 if(draft)batch.push(statement(db,'UPDATE mova_drafts SET body=?,revision=revision+1,base_revision=?,updated_at=? WHERE id=1 AND body=? AND EXISTS(SELECT 1 FROM mova_documents WHERE id=1 AND revision=? AND body=?)',JSON.stringify(applyRefundPolicy(JSON.parse(draft.body))),next,nowISO(),draft.body,next,body));
 batch.push(statement(db,'INSERT OR IGNORE INTO mova_meta(key,value) SELECT ?,? FROM mova_documents WHERE id=1 AND revision=? AND body=?',marker,nowISO(),next,body));
 await db.batch(batch);fail(!await first(db,'SELECT value FROM mova_meta WHERE key=?',marker),'Outra edição ocorreu. Atualize a página.',409);
}
async function stateData(db){const row=await first(db,'SELECT body,revision FROM mova_documents WHERE id=1');return {state:JSON.parse(row.body),revision:row.revision}}
// Applied only on approved deployment. Preserve photos, independent draft edits and history.
async function upgradeLaunch(db){
 const marker='launch_v13';if(await first(db,'SELECT value FROM mova_meta WHERE key=?',marker))return;
 const live=await stateData(db),s=applyLaunchUpdate(live.state);validateState(s);
 const body=JSON.stringify(s),next=live.revision+1,draft=await first(db,'SELECT body,revision,base_revision FROM mova_drafts WHERE id=1');
 const batch=[statement(db,'UPDATE mova_documents SET body=?,revision=? WHERE id=1 AND revision=? AND body=?',body,next,live.revision,JSON.stringify(live.state))];
 batch.push(statement(db,'INSERT OR IGNORE INTO mova_history(revision,body,actor,name,at,action) SELECT revision,body,NULL,NULL,?,? FROM mova_documents WHERE id=1 AND revision=? AND body=?',nowISO(),'Launch schedule, ticket benefits and policies',next,body));
 if(draft){const changed=applyLaunchUpdate(JSON.parse(draft.body));validateState(changed,{draft:true});batch.push(statement(db,'UPDATE mova_drafts SET body=?,revision=revision+1,base_revision=?,updated_at=? WHERE id=1 AND body=? AND revision=? AND base_revision=? AND EXISTS(SELECT 1 FROM mova_documents WHERE id=1 AND revision=? AND body=?)',JSON.stringify(changed),next,nowISO(),draft.body,draft.revision,draft.base_revision,next,body));}
 batch.push(statement(db,'INSERT OR IGNORE INTO mova_meta(key,value) SELECT ?,? FROM mova_documents WHERE id=1 AND revision=? AND body=?',marker,nowISO(),next,body));
 await db.batch(batch);fail(!await first(db,'SELECT value FROM mova_meta WHERE key=?',marker),'Outra edição ocorreu. Atualize a página.',409);
}
async function bootstrap(db,identity,email){
 if(!identity||!email||identity.email.toLowerCase()!==email.toLowerCase())return;
 const flag=await first(db,"SELECT value FROM mova_meta WHERE key='bootstrap_owner'");if(flag)return;
 await db.batch([
  statement(db,"INSERT OR IGNORE INTO mova_meta(key,value) VALUES('bootstrap_owner',?)",identity.userId),
  statement(db,"INSERT OR IGNORE INTO mova_admins(id,name,email,role,active,csrf) SELECT ?,?,?, 'owner',1,? FROM mova_meta WHERE key='bootstrap_owner' AND value=?",identity.userId,identity.displayName||'Administração MOVA',identity.email,random(),identity.userId)
 ]);
}
async function admin(db,identity,{owner=false,csrf=false,request}={}){
 fail(!identity,'Entre com sua conta do ChatGPT para continuar.',401);
 const user=await first(db,'SELECT * FROM mova_admins WHERE id=? AND active=1',identity.userId);fail(!user,'Esta conta não possui acesso administrativo.',403);
 fail(owner&&user.role!=='owner','Apenas administradoras podem fazer isso.',403);
 fail(csrf&&!eq(request.headers.get('X-CSRF-Token'),user.csrf),'Recarregue o painel e tente novamente.',403);return user;
}
function checkOrigin(request,env){
 const expected=env.MOVA_PUBLIC_ORIGIN;
 fail(!expected||request.headers.get('Origin')!==expected,'Origem não permitida.',403);
}
async function bodyJSON(request){
 fail(!request.headers.get('Content-Type')?.startsWith('application/json'),'Use JSON.',415);
 const length=Number(request.headers.get('Content-Length')||0);fail(length>MAX_BODY,'Requisição grande demais.',413);
 const raw=await request.text();fail(raw.length>MAX_BODY,'Requisição grande demais.',413);
 try{const value=JSON.parse(raw);fail(!value||typeof value!=='object'||Array.isArray(value),'Requisição inválida.');return value}catch(e){if(e instanceof Problem)throw e;throw new Problem(400,'JSON inválido.')}
}
async function commit(db,state,revision,actor,action='Content saved'){
 validateState(state);const body=JSON.stringify(state);
 const results=await db.batch([
  statement(db,'UPDATE mova_documents SET body=?,revision=revision+1 WHERE id=1 AND revision=?',body,revision),
  statement(db,'INSERT OR IGNORE INTO mova_history(revision,body,actor,name,at,action) SELECT revision,body,?,?,?,? FROM mova_documents WHERE id=1 AND revision=? AND body=?',actor.id,actor.name,nowISO(),action,revision+1,body)
 ]);
 fail(results[0].meta.changes!==1,'O conteúdo mudou em outra aba. Recarregue antes de salvar.',409);
 const upcoming=publicState(state).events;return {ok:true,revision:revision+1,nextEvent:upcoming[0]||null};
}

// Drafts are independent of the published document; only publishDraft writes live content.
async function draftData(db){
 await run(db,'INSERT OR IGNORE INTO mova_drafts(id,body,revision,base_revision,updated_at) SELECT 1,body,1,revision,? FROM mova_documents WHERE id=1',nowISO());
 const d=await first(db,'SELECT * FROM mova_drafts WHERE id=1'),live=await stateData(db);
 return {state:JSON.parse(d.body),revision:d.revision,baseRevision:d.base_revision,publishedRevision:live.revision,hasDraft:d.body!==JSON.stringify(live.state),updatedAt:d.updated_at};
}
function previewState(state){
 const s=structuredClone(state);
 s.gallery=s.gallery.filter(p=>p.image);s.sponsors=s.sponsors.filter(p=>p.logo);
 s.events=s.events.filter(e=>{try{return instant(e,'end')>instant(e,'start')}catch{return false}});
 return publicState(s);
}
async function reviewed(db,user,d){return (await first(db,'SELECT value FROM mova_meta WHERE key=?','review:'+user.id))?.value===JSON.stringify([d.revision,d.baseRevision])}
async function saveDraft(db,state,revision,user){
 validateState(state,{draft:true});const current=await draftData(db);
 fail(current.revision!==revision,'O rascunho mudou em outra aba. Recarregue antes de salvar.',409);
 fail(user.role!=='owner'&&JSON.stringify(state.legal)!==JSON.stringify(current.state.legal),'Apenas administradoras podem editar documentos legais.',403);
 const result=await run(db,'UPDATE mova_drafts SET body=?,revision=revision+1,updated_at=?,updated_by=? WHERE id=1 AND revision=?',JSON.stringify(state),nowISO(),user.id,revision);
 fail(result.meta.changes!==1,'O rascunho mudou em outra aba. Recarregue antes de salvar.',409);
 const d=await draftData(db);return {ok:true,...d,reviewed:false,nextEvent:previewState(state).events[0]||null};
}
async function publishDraft(db,revision,publishedRevision,user){
 const d=await draftData(db),live=await stateData(db);
 fail(d.revision!==revision||live.revision!==publishedRevision||d.baseRevision!==live.revision,'O conteúdo mudou. Recarregue o painel e confirme a versão que deseja publicar.',409);
 fail(!d.hasDraft,'O rascunho já está igual ao site público.');
 fail(user.role!=='owner'&&JSON.stringify(d.state.legal)!==JSON.stringify(live.state.legal),'Uma administradora precisa publicar alterações nos documentos legais.',403);
 validateState(d.state);const body=JSON.stringify(d.state);
 const out=await db.batch([
  statement(db,'UPDATE mova_documents SET body=?,revision=revision+1 WHERE id=1 AND revision=? AND EXISTS(SELECT 1 FROM mova_drafts WHERE id=1 AND revision=? AND base_revision=?)',body,live.revision,revision,live.revision),
  statement(db,'INSERT OR IGNORE INTO mova_history(revision,body,actor,name,at,action) SELECT revision,body,?,?,?,? FROM mova_documents WHERE id=1 AND revision=? AND body=?',user.id,user.name,nowISO(),'Draft published',live.revision+1,body),
  statement(db,'UPDATE mova_drafts SET base_revision=? WHERE id=1 AND revision=? AND EXISTS(SELECT 1 FROM mova_documents WHERE id=1 AND revision=? AND body=?)',live.revision+1,revision,live.revision+1,body)
 ]);
 fail(out[0].meta.changes!==1,'O rascunho mudou durante a publicação. Recarregue o painel antes de tentar novamente.',409);
 return {ok:true,...await draftData(db),reviewed:false,nextEvent:publicState(d.state).events[0]||null};
}

// Strict image containers, size bounds and metadata removal; no executable formats.
const u32=(a,i,little=false)=>new DataView(a.buffer,a.byteOffset,a.byteLength).getUint32(i,little);
const ascii=(a,i,n)=>String.fromCharCode(...a.subarray(i,i+n));
const join=parts=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let i=0;for(const p of parts){out.set(p,i);i+=p.length}return out};
export function validateImage(bytes,declared){
 let width=0,height=0,ext='',mime='',clean;
 if(bytes.length>=33&&ascii(bytes,1,3)==='PNG'&&bytes[0]===137&&ascii(bytes,12,4)==='IHDR'){
  ext='png';mime='image/png';width=u32(bytes,16);height=u32(bytes,20);const parts=[bytes.subarray(0,8)];let offset=8,ended=false,hasData=false;
  while(offset+12<=bytes.length){const n=u32(bytes,offset),type=ascii(bytes,offset+4,4);fail(n>bytes.length-offset-12,'PNG inválido.');if(['IHDR','PLTE','IDAT','IEND','tRNS'].includes(type))parts.push(bytes.subarray(offset,offset+12+n));if(type==='IDAT')hasData=true;offset+=n+12;if(type==='IEND'){ended=true;break}}
  fail(!ended||!hasData||offset!==bytes.length,'PNG inválido.');clean=join(parts);
 }else if(bytes.length>20&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255){
  ext='jpg';mime='image/jpeg';const parts=[bytes.subarray(0,2)];let offset=2,sawScan=false;
  while(offset+4<=bytes.length){fail(bytes[offset]!==255,'JPEG inválido.');const marker=bytes[offset+1];if(marker===0xDA){parts.push(bytes.subarray(offset));sawScan=true;break}const n=(bytes[offset+2]<<8)|bytes[offset+3];fail(n<2||offset+2+n>bytes.length,'JPEG inválido.');if([0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF].includes(marker)){height=(bytes[offset+5]<<8)|bytes[offset+6];width=(bytes[offset+7]<<8)|bytes[offset+8]}
   if(![0xE1,0xED,0xFE].includes(marker))parts.push(bytes.subarray(offset,offset+2+n));offset+=n+2;
  }
  fail(!sawScan||bytes.at(-2)!==255||bytes.at(-1)!==217,'JPEG inválido.');clean=join(parts);
 }else if(bytes.length>=30&&ascii(bytes,0,4)==='RIFF'&&ascii(bytes,8,4)==='WEBP'){
  ext='webp';mime='image/webp';fail(u32(bytes,4,true)+8!==bytes.length,'WebP inválido.');const parts=[];let offset=12,hasData=false;
  while(offset+8<=bytes.length){const type=ascii(bytes,offset,4),n=u32(bytes,offset+4,true),end=offset+8+n+(n%2);fail(end>bytes.length,'WebP inválido.');
   if(type==='VP8X'){fail(n<10,'WebP inválido.');width=1+(bytes[offset+12]|bytes[offset+13]<<8|bytes[offset+14]<<16);height=1+(bytes[offset+15]|bytes[offset+16]<<8|bytes[offset+17]<<16);const chunk=bytes.slice(offset,end);chunk[8]&=~(8|4);parts.push(chunk)}
   else if(type==='VP8 '){fail(n<10||ascii(bytes,offset+11,3)!=='\x9d\x01\x2a','WebP inválido.');if(!width){width=(bytes[offset+14]|bytes[offset+15]<<8)&0x3fff;height=(bytes[offset+16]|bytes[offset+17]<<8)&0x3fff}hasData=true;parts.push(bytes.subarray(offset,end))}
   else if(type==='VP8L'){fail(n<5||bytes[offset+8]!==0x2f,'WebP inválido.');if(!width){const bits=u32(bytes,offset+9,true);width=(bits&0x3fff)+1;height=((bits>>>14)&0x3fff)+1}hasData=true;parts.push(bytes.subarray(offset,end))}
   else if(!['EXIF','XMP ','ANIM','ANMF'].includes(type))parts.push(bytes.subarray(offset,end));offset=end;
  }
  fail(!hasData||offset!==bytes.length,'Use uma imagem WebP estática válida.');const rest=join(parts),header=bytes.slice(0,12);new DataView(header.buffer).setUint32(4,rest.length+4,true);clean=join([header,rest]);
 }else throw new Problem(415,'Envie uma imagem PNG, JPEG ou WebP válida.');
 fail(mime!==declared,'O tipo declarado não corresponde ao arquivo.',415);fail(width<32||height<32||width*height>16000000,'A imagem deve ter pelo menos 32 pixels e no máximo 16 megapixels.');return {bytes:clean,width,height,mime,ext};
}

export async function handleAPI(request,env,identity=null){
 try{
  fail(!env.DB,'Armazenamento temporariamente indisponível.',503);const db=env.DB;await initialized(db);if(!bootstrapConfig.portable){await upgradeHome(db);await upgradeTicketing(db);}
  if(bootstrapConfig.publicCopyUpdate&&env.MOVA_SKIP_COPY_UPDATE!=='1')await upgradePublicCopy(db);
  if(bootstrapConfig.officialEventUpdate&&env.MOVA_SKIP_OFFICIAL_UPDATE!=='1')await upgradeOfficialEvent(db);
  if(bootstrapConfig.refundPolicyUpdate&&env.MOVA_SKIP_REFUND_UPDATE!=='1')await upgradeRefundPolicy(db);
  if(bootstrapConfig.launchUpdate&&env.MOVA_SKIP_LAUNCH_UPDATE!=='1')await upgradeLaunch(db);
  const path=new URL(request.url).pathname,method=request.method;
  if(method==='GET'){
   if(path==='/api/public'){const d=await stateData(db);return json({state:publicState(d.state),revision:d.revision})}
   if(path==='/api/health')return json({status:'ok',mode:'public',checkout:'eventbrite',release:'2026-10-26-v13'});
   if(path==='/api/session'){
    await bootstrap(db,identity,env.MOVA_BOOTSTRAP_OWNER_EMAIL);
    if(!identity)return json({user:null,requiresSignIn:true});
    const user=await first(db,'SELECT * FROM mova_admins WHERE id=? AND active=1',identity.userId);
    if(!user)return json({user:null,requiresSignIn:false,unauthorized:true});
    return json({user:{id:user.id,name:user.name,username:user.email,role:user.role,auth:'chatgpt',twoFactor:null},csrf:user.csrf});
   }
   const u=await admin(db,identity);
   if(path==='/api/admin/state'){const d=await draftData(db);return json({...d,reviewed:await reviewed(db,u,d),nextEvent:previewState(d.state).events[0]||null})}
   if(path==='/api/admin/preview-state'){const d=await draftData(db);await run(db,'INSERT INTO mova_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','review:'+u.id,JSON.stringify([d.revision,d.baseRevision]));return json({state:previewState(d.state),revision:d.revision,editorPreview:true})}
   if(path==='/api/admin/users'){fail(u.role!=='owner','Apenas administradoras podem fazer isso.',403);return json({users:await rows(db,'SELECT id,name,email AS username,role,active FROM mova_admins')})}
   if(path==='/api/admin/history'){fail(u.role!=='owner','Apenas administradoras podem fazer isso.',403);return json({history:await rows(db,'SELECT revision,at,action,name FROM mova_history ORDER BY revision DESC LIMIT 40')})}
   if(path==='/api/admin/backup'){
    fail(u.role!=='owner','Apenas administradoras podem exportar a entrega.',403);
    const live=await stateData(db),draft=await draftData(db);
    return json({format:'mova-portable-v1',exportedAt:nowISO(),published:live,draft:{state:draft.state,hasDraft:draft.hasDraft},history:(await rows(db,'SELECT revision,body,at,action FROM mova_history ORDER BY revision')).map(h=>({revision:h.revision,state:JSON.parse(h.body),at:h.at,action:h.action}))},200,new URL(request.url).searchParams.has('inline')?{}:{'Content-Disposition':'attachment; filename="mova-backup.json"'});
   }
   if(path==='/api/admin/export'){fail(u.role!=='owner','Apenas administradoras podem fazer isso.',403);return json(await stateData(db),200,{'Content-Disposition':'attachment; filename="mova-content-backup.json"'})}
   throw new Problem(404,'Recurso não encontrado.');
  }
  fail(method!=='POST','Método não permitido.',405);checkOrigin(request,env);
  if(path==='/api/invite/accept'){
   fail(!identity,'Entre com sua conta do ChatGPT antes de aceitar o convite.',401);
   const body=await bodyJSON(request);text(body.token,200);const key=await hash(body.token),now=Date.now();
   const invite=await first(db,'SELECT * FROM mova_invitations WHERE token=? AND used_by IS NULL AND expires>?',key,now);fail(!invite,'Convite inválido, usado ou expirado.');
   const nonce=random(),csrf=random();
   const batch=[statement(db,'UPDATE mova_invitations SET used_by=?,used_at=?,nonce=? WHERE token=? AND used_by IS NULL AND expires>?',identity.userId,now,nonce,key,now)];
   batch.push(statement(db,"INSERT INTO mova_admins(id,name,email,role,active,csrf) SELECT ?,?,?,role,1,? FROM mova_invitations WHERE token=? AND nonce=? ON CONFLICT(id) DO UPDATE SET name=excluded.name,email=excluded.email,role=CASE WHEN mova_admins.active=1 AND mova_admins.role='owner' THEN 'owner' ELSE excluded.role END,active=1,csrf=excluded.csrf",identity.userId,invite.name||identity.displayName,identity.email,csrf,key,nonce));
   const result=await db.batch(batch);fail(result[0].meta.changes!==1,'Este convite já foi utilizado.',409);return json({ok:true});
  }
  const u=await admin(db,identity,{csrf:true,request});
  if(path==='/api/admin/state'){const data=await bodyJSON(request);return json(await saveDraft(db,data.state,data.revision,u))}
  if(path==='/api/admin/publish'){const data=await bodyJSON(request);return json(await publishDraft(db,data.revision,data.publishedRevision,u))}
  if(path==='/api/admin/upload'){
   fail(!env.BUCKET,'Armazenamento de imagens indisponível.',503);fail(Number(request.headers.get('Content-Length')||0)>MAX_UPLOAD,'Arquivo grande demais.',413);
   const bytes=new Uint8Array(await request.arrayBuffer());fail(bytes.length>MAX_UPLOAD||bytes.length===0,'Arquivo vazio ou grande demais.',413);
   const image=validateImage(bytes,request.headers.get('Content-Type')?.split(';')[0]);const name=crypto.randomUUID().replaceAll('-','')+'.'+image.ext;
   await env.BUCKET.put(name,image.bytes,{httpMetadata:{contentType:image.mime}});return json({url:'/uploads/'+name,width:image.width,height:image.height},201);
  }
  fail(u.role!=='owner','Apenas administradoras podem fazer isso.',403);
  if(path==='/api/admin/invite'){
   const data=await bodyJSON(request);text(data.name||'',120);fail(!['support','owner'].includes(data.role||'support'),'Perfil inválido.');const token=random();
   await run(db,'INSERT INTO mova_invitations(token,role,name,created_by,expires) VALUES(?,?,?,?,?)',await hash(token),data.role||'support',data.name||'Editor',u.id,Date.now()+86400000);
   return json({inviteUrl:env.MOVA_PUBLIC_ORIGIN+adminPath+'/invite#'+token},201);
  }
  if(path==='/api/admin/revoke'){
   const data=await bodyJSON(request);fail(data.id===u.id,'Você não pode revogar o próprio acesso.');
   await db.batch([statement(db,"UPDATE mova_admins SET active=0,csrf=? WHERE id=? AND id!=? AND EXISTS(SELECT 1 FROM mova_admins WHERE id=? AND active=1 AND role='owner')",random(),data.id,u.id,u.id),statement(db,'UPDATE mova_invitations SET expires=0 WHERE created_by=? AND used_by IS NULL',data.id)]);return json({ok:true});
  }
  if(path==='/api/admin/restore'){
   const data=await bodyJSON(request);const row=await first(db,'SELECT body FROM mova_history WHERE revision=?',data.target);fail(!row,'Versão não encontrada.',404);return json(await saveDraft(db,JSON.parse(row.body),data.revision,u));
  }
  throw new Problem(404,'Recurso não encontrado.');
 }catch(e){if(e instanceof Problem)return json({error:e.message},e.status);return json({error:'Não foi possível concluir. O conteúdo anterior foi preservado.'},500)}
}
export async function uploadedResponse(name,env){
 if(!/^[a-f0-9]{32}\.(png|jpg|webp)$/.test(name)||!env.BUCKET)return json({error:'Imagem não encontrada.'},404);
 const object=await env.BUCKET.get(name);if(!object)return json({error:'Imagem não encontrada.'},404);
 const mime=name.endsWith('.png')?'image/png':name.endsWith('.jpg')?'image/jpeg':'image/webp';
 return new Response(object.body,{headers:{...securityHeaders,'Content-Type':mime,'Cache-Control':'public, max-age=86400','Content-Disposition':'inline'}});
}
