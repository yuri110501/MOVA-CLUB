import seed from './seed.json' with { type: 'json' };

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
export const pageResponse=html=>new Response(html,{headers:{...securityHeaders,'Content-Type':'text/html; charset=utf-8'}});

function text(value,max=5000){fail(typeof value!=='string'||value.length>max,'Texto inválido ou longo demais.')}
function bilingual(value,max=5000){fail(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='en,pt','Preencha as versões EN e PT.');text(value.en,max);text(value.pt,max)}
function httpsURL(value,eventbrite=false){text(value,2048);if(!value)return;let u;try{u=new URL(value)}catch{throw new Problem(400,'Use um link HTTPS válido.')};fail(u.protocol!=='https:'||!u.hostname||u.username||u.password,'Use um link HTTPS válido.');if(eventbrite)fail(!['eventbrite.com','eventbrite.com.br'].some(d=>u.hostname===d||u.hostname.endsWith('.'+d)),'Use o link oficial do Eventbrite.')}
function imagePath(value){text(value,200);fail(value&&!/^\/(assets|uploads)\/[a-zA-Z0-9_.-]+\.(png|webp|jpe?g)$/.test(value),'Selecione uma imagem enviada ao painel.')}
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
export function validateState(s){
 fail(!s||Object.keys(s).sort().join(',')!=='content,events,faq,gallery,legal,sponsors','Estrutura de conteúdo inválida.');
 const c=s.content;
 for(const k of ['heroTitle','heroSubtitle','heroAlt','aboutTitle','aboutBody','aboutAlt','anaTitle','anaBody','anaAlt','footerText'])bilingual(c[k]);
 for(const k of ['heroImage','aboutImage','anaImage'])imagePath(c[k]);
 fail(!c.heroImage||!c.aboutImage,'Selecione as imagens do Hero e do About antes de salvar.');
 for(const k of ['heroImageConcept','aboutImageConcept'])fail(typeof c[k]!=='boolean','Marcação da imagem inválida.');
 httpsURL(c.instagram);text(c.contactEmail,254);text(c.credit,200);fail(c.contactEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.contactEmail),'E-mail inválido.');
 for(const [key,max] of [['events',200],['faq',30],['gallery',100],['sponsors',100]])fail(!Array.isArray(s[key])||s[key].length>max,'Quantidade de itens inválida.');
 const ids=new Set();
 for(const e of s.events){
  fail(!/^[a-z0-9-]{1,80}$/.test(e.id)||ids.has(e.id),'Identificador de evento inválido ou repetido.');ids.add(e.id);
  fail(!['draft','published','archived'].includes(e.status),'Status inválido.');fail(typeof e.available!=='boolean'||typeof e.coverConcept!=='boolean','Disponibilidade inválida.');
  for(const k of ['name','venue','description','included'])bilingual(e[k]);
  fail(instant(e,'end')<=instant(e,'start'),'O término deve ser depois do início.');for(const k of ['city','address'])text(e[k],500);
  httpsURL(e.mapUrl);httpsURL(e.eventbriteUrl,true);imagePath(e.cover);
  fail(e.price!==null&&(typeof e.price!=='number'||!Number.isFinite(e.price)||e.price<0||e.price>100000),'Preço inválido.');
  fail(e.capacity!==null&&(!Number.isInteger(e.capacity)||e.capacity<1||e.capacity>100000),'Capacidade inválida.');fail(e.currency!=='USD','Use USD nesta versão.');
  fail(!Array.isArray(e.schedule)||e.schedule.length>60,'Cronograma inválido.');let previous=e.start;
  for(const a of e.schedule){for(const v of [a.start,a.end])fail(typeof v!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(v),'Horário inválido no cronograma.');fail(a.start<e.start||a.end>e.end||a.end<=a.start||a.start<previous,'Cronograma fora de ordem, com sobreposição ou fora do evento.');previous=a.end;bilingual(a.title,500)}
 }
 for(const p of s.gallery){imagePath(p.image);fail(!p.image,'Envie uma fotografia.');bilingual(p.caption,500);fail(typeof p.active!=='boolean','Status inválido.')}
 for(const p of s.sponsors){text(p.name,150);imagePath(p.logo);fail(!p.logo,'Envie uma logo.');httpsURL(p.url);fail(typeof p.active!=='boolean','Status inválido.')}
 for(const f of s.faq){bilingual(f.question,300);bilingual(f.answer)}
 for(const k of ['terms','privacy','image']){bilingual(s.legal[k].title,100);bilingual(s.legal[k].body,20000)}
 fail(JSON.stringify(s).length>MAX_BODY,'O conteúdo ultrapassa o limite permitido.');
}
export function publicState(state,now=Date.now()){
 const s=structuredClone(state);s.events=s.events.filter(e=>e.status==='published'&&e.available&&instant(e)>now).sort((a,b)=>instant(a)-instant(b));
 for(const e of s.events){e.startsAt=new Date(instant(e)).toISOString();e.endsAt=new Date(instant(e,'end')).toISOString()}
 s.gallery=s.gallery.filter(p=>p.active);s.sponsors=s.sponsors.filter(p=>p.active);return s;
}
async function initialized(db){
 await db.batch([
  statement(db,'INSERT OR IGNORE INTO mova_documents(id,body,revision) VALUES(1,?,1)',JSON.stringify(seed)),
  statement(db,'INSERT OR IGNORE INTO mova_history(revision,body,actor,name,at,action) VALUES(1,?,NULL,NULL,?,?)',JSON.stringify(seed),nowISO(),'Initial hosted review')
 ]);
}
async function stateData(db){const row=await first(db,'SELECT body,revision FROM mova_documents WHERE id=1');return {state:JSON.parse(row.body),revision:row.revision}}
async function bootstrap(db,identity,email){
 if(!identity||!email||identity.email.toLowerCase()!==email.toLowerCase())return;
 const flag=await first(db,"SELECT value FROM mova_meta WHERE key='bootstrap_owner'");if(flag)return;
 await db.batch([
  statement(db,"INSERT OR IGNORE INTO mova_meta(key,value) VALUES('bootstrap_owner',?)",identity.userId),
  statement(db,"INSERT OR IGNORE INTO mova_admins(id,name,email,role,active,csrf) SELECT ?,?,?, 'owner',1,? FROM mova_meta WHERE key='bootstrap_owner' AND value=?",identity.userId,identity.displayName||'Venancio Neto',identity.email,random(),identity.userId)
 ]);
}
async function admin(db,identity,{owner=false,csrf=false,request}={}){
 fail(!identity,'Entre com sua conta do ChatGPT para continuar.',401);
 const user=await first(db,'SELECT * FROM mova_admins WHERE id=? AND active=1',identity.userId);fail(!user,'Esta conta não possui acesso administrativo.',403);
 fail(owner&&user.role!=='owner','Apenas a proprietária pode fazer isso.',403);
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
  fail(!env.DB,'Armazenamento temporariamente indisponível.',503);const db=env.DB;await initialized(db);
  const path=new URL(request.url).pathname,method=request.method;
  if(method==='GET'){
   if(path==='/api/public'){const d=await stateData(db);return json({state:publicState(d.state),revision:d.revision,preview:true})}
   if(path==='/api/health')return json({status:'ok',mode:'review',checkout:'demonstration',release:'2026-10-17-v2'});
   if(path==='/api/session'){
    await bootstrap(db,identity,env.MOVA_BOOTSTRAP_OWNER_EMAIL);
    if(!identity)return json({user:null,requiresSignIn:true});
    const user=await first(db,'SELECT * FROM mova_admins WHERE id=? AND active=1',identity.userId);
    if(!user)return json({user:null,requiresSignIn:false,unauthorized:true});
    return json({user:{id:user.id,name:user.name,username:user.email,role:user.role,auth:'chatgpt',twoFactor:null},csrf:user.csrf});
   }
   const u=await admin(db,identity);
   if(path==='/api/admin/state'){const d=await stateData(db);return json({...d,nextEvent:publicState(d.state).events[0]||null})}
   if(path==='/api/admin/users'){fail(u.role!=='owner','Apenas a proprietária pode fazer isso.',403);return json({users:await rows(db,'SELECT id,name,email AS username,role,active FROM mova_admins')})}
   if(path==='/api/admin/history'){fail(u.role!=='owner','Apenas a proprietária pode fazer isso.',403);return json({history:await rows(db,'SELECT revision,at,action,name FROM mova_history ORDER BY revision DESC LIMIT 40')})}
   if(path==='/api/admin/export'){fail(u.role!=='owner','Apenas a proprietária pode fazer isso.',403);return json(await stateData(db),200,{'Content-Disposition':'attachment; filename="mova-content-backup.json"'})}
   throw new Problem(404,'Recurso não encontrado.');
  }
  fail(method!=='POST','Método não permitido.',405);checkOrigin(request,env);
  if(path==='/api/invite/accept'){
   fail(!identity,'Entre com sua conta do ChatGPT antes de aceitar o convite.',401);
   const body=await bodyJSON(request);text(body.token,200);const key=await hash(body.token),now=Date.now();
   const invite=await first(db,'SELECT * FROM mova_invitations WHERE token=? AND used_by IS NULL AND expires>?',key,now);fail(!invite,'Convite inválido, usado ou expirado.');
   const nonce=random(),csrf=random();
   const batch=[statement(db,'UPDATE mova_invitations SET used_by=?,used_at=?,nonce=? WHERE token=? AND used_by IS NULL AND expires>?',identity.userId,now,nonce,key,now)];
   if(invite.role==='owner')batch.push(statement(db,"UPDATE mova_admins SET role='support' WHERE role='owner' AND EXISTS(SELECT 1 FROM mova_invitations WHERE token=? AND nonce=?)",key,nonce));
   batch.push(statement(db,"INSERT INTO mova_admins(id,name,email,role,active,csrf) SELECT ?,?,?,role,1,? FROM mova_invitations WHERE token=? AND nonce=? ON CONFLICT(id) DO UPDATE SET name=excluded.name,email=excluded.email,role=excluded.role,active=1,csrf=excluded.csrf",identity.userId,invite.name||identity.displayName,identity.email,csrf,key,nonce));
   if(invite.role==='owner')batch.push(statement(db,"UPDATE mova_invitations SET expires=0 WHERE role='owner' AND token!=? AND EXISTS(SELECT 1 FROM mova_invitations WHERE token=? AND nonce=?)",key,key,nonce));
   const result=await db.batch(batch);fail(result[0].meta.changes!==1,'Este convite já foi utilizado.',409);return json({ok:true});
  }
  const u=await admin(db,identity,{csrf:true,request});
  if(path==='/api/admin/state'){
   const data=await bodyJSON(request);validateState(data.state);const current=await stateData(db);fail(current.revision!==data.revision,'O conteúdo mudou em outra aba. Recarregue antes de salvar.',409);
   fail(u.role!=='owner'&&JSON.stringify(data.state.legal)!==JSON.stringify(current.state.legal),'Apenas a proprietária pode editar documentos legais.',403);
   return json(await commit(db,data.state,data.revision,u));
  }
  if(path==='/api/admin/upload'){
   fail(!env.BUCKET,'Armazenamento de imagens indisponível.',503);fail(Number(request.headers.get('Content-Length')||0)>MAX_UPLOAD,'Arquivo grande demais.',413);
   const bytes=new Uint8Array(await request.arrayBuffer());fail(bytes.length>MAX_UPLOAD||bytes.length===0,'Arquivo vazio ou grande demais.',413);
   const image=validateImage(bytes,request.headers.get('Content-Type')?.split(';')[0]);const name=crypto.randomUUID().replaceAll('-','')+'.'+image.ext;
   await env.BUCKET.put(name,image.bytes,{httpMetadata:{contentType:image.mime}});return json({url:'/uploads/'+name,width:image.width,height:image.height},201);
  }
  fail(u.role!=='owner','Apenas a proprietária pode fazer isso.',403);
  if(path==='/api/admin/invite'){
   const data=await bodyJSON(request);text(data.name||'',120);fail(!['support','owner'].includes(data.role||'support'),'Perfil inválido.');const token=random();
   await run(db,'INSERT INTO mova_invitations(token,role,name,created_by,expires) VALUES(?,?,?,?,?)',await hash(token),data.role||'support',data.name||'Suporte técnico',u.id,Date.now()+86400000);
   return json({inviteUrl:env.MOVA_PUBLIC_ORIGIN+'/admin/invite#'+token},201);
  }
  if(path==='/api/admin/revoke'){
   const data=await bodyJSON(request);fail(data.id===u.id,'Você não pode revogar o próprio acesso.');
   await db.batch([statement(db,"UPDATE mova_admins SET active=0,csrf=? WHERE id=? AND role!='owner'",random(),data.id),statement(db,'UPDATE mova_invitations SET expires=0 WHERE created_by=? AND used_by IS NULL',data.id)]);return json({ok:true});
  }
  if(path==='/api/admin/restore'){
   const data=await bodyJSON(request);const row=await first(db,'SELECT body FROM mova_history WHERE revision=?',data.target);fail(!row,'Versão não encontrada.',404);return json(await commit(db,JSON.parse(row.body),data.revision,u,'Restored revision '+data.target));
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
