// Vercel runtime bindings: libSQL/Turso database and Vercel Blob storage, exposed
// with the small D1/R2-shaped interface that lib/core.mjs expects.
import {createClient} from '@libsql/client';
import {put,head,BlobNotFoundError} from '@vercel/blob';
import {SCHEMA} from './schema.mjs';

const plainRows=rs=>rs.rows.map(row=>Object.fromEntries(rs.columns.map((column,i)=>{const v=row[i];return [column,typeof v==='bigint'?Number(v):v]})));
class Statement{
 constructor(client,sql,args=[]){this.client=client;this.sql=sql;this.args=args}
 bind(...args){return new Statement(this.client,this.sql,args.map(v=>v===undefined?null:v))}
 async first(){return plainRows(await this.client.execute({sql:this.sql,args:this.args}))[0]??null}
 async all(){return {results:plainRows(await this.client.execute({sql:this.sql,args:this.args}))}}
 async run(){const rs=await this.client.execute({sql:this.sql,args:this.args});return {success:true,meta:{changes:rs.rowsAffected}}}
}
export class LibsqlDatabase{
 constructor(client){this.client=client}
 prepare(sql){return new Statement(this.client,sql)}
 // Atomic like D1 batches: libSQL runs the statements in one write transaction.
 async batch(statements){const out=await this.client.batch(statements.map(s=>({sql:s.sql,args:s.args})),'write');return out.map(rs=>({success:true,results:plainRows(rs),meta:{changes:rs.rowsAffected}}))}
 async migrate(){await this.client.batch(SCHEMA,'write')}
}

class BlobBucket{
 constructor(token){this.token=token}
 async put(name,bytes,{httpMetadata}={}){
  await put('uploads/'+name,Buffer.from(bytes),{access:'public',contentType:httpMetadata?.contentType,addRandomSuffix:false,allowOverwrite:false,token:this.token});
 }
 async get(name){
  try{const meta=await head('uploads/'+name,{token:this.token});const response=await fetch(meta.url);return response.ok?{body:response.body}:null}
  catch(error){if(error instanceof BlobNotFoundError)return null;throw error}
 }
}
// Local development only (never on Vercel): keep uploads in ./.data/uploads.
class LocalBucket{
 async put(name,bytes){const fs=await import('node:fs/promises');await fs.mkdir('.data/uploads',{recursive:true});await fs.writeFile('.data/uploads/'+name,bytes,{flag:'wx'})}
 async get(name){const fs=await import('node:fs/promises');try{return {body:await fs.readFile('.data/uploads/'+name)}}catch{return null}}
}

function allowedOrigins(){
 const list=String(process.env.MOVA_PUBLIC_ORIGIN||'').split(',').map(v=>v.trim().replace(/\/$/,'')).filter(Boolean);
 for(const key of ['VERCEL_PROJECT_PRODUCTION_URL','VERCEL_BRANCH_URL','VERCEL_URL'])if(process.env[key])list.push('https://'+process.env[key]);
 if(!process.env.VERCEL&&process.env.NODE_ENV!=='production')list.push('http://localhost:3000','http://127.0.0.1:3000');
 return [...new Set(list)];
}

let pending=null;
async function create(){
 const onVercel=Boolean(process.env.VERCEL);
 const url=process.env.TURSO_DATABASE_URL||(onVercel?'':'file:.data/mova.db');
 let DB;
 if(url){
  if(url.startsWith('file:')){const fs=await import('node:fs/promises');await fs.mkdir('.data',{recursive:true})}
  DB=new LibsqlDatabase(createClient({url,authToken:process.env.TURSO_AUTH_TOKEN}));
  await DB.migrate();
 }
 const token=process.env.BLOB_READ_WRITE_TOKEN;
 const BUCKET=token?new BlobBucket(token):onVercel?undefined:new LocalBucket();
 return {
  DB,BUCKET,
  MOVA_PUBLIC_ORIGINS:allowedOrigins(),
  MOVA_BOOTSTRAP_OWNER_EMAIL:process.env.MOVA_BOOTSTRAP_OWNER_EMAIL,
  MOVA_SKIP_COPY_UPDATE:process.env.MOVA_SKIP_COPY_UPDATE,
  MOVA_SKIP_OFFICIAL_UPDATE:process.env.MOVA_SKIP_OFFICIAL_UPDATE,
  MOVA_SKIP_REFUND_UPDATE:process.env.MOVA_SKIP_REFUND_UPDATE,
  MOVA_SKIP_LAUNCH_UPDATE:process.env.MOVA_SKIP_LAUNCH_UPDATE
 };
}
/** One set of bindings per server instance; retried if initialization fails. */
export function getEnv(){
 pending??=create().catch(error=>{pending=null;throw error});
 return pending;
}
/** Never throws: without bindings, handlers answer 503 instead of crashing. */
export async function getEnvSafe(){
 try{return await getEnv()}catch(error){console.error('MOVA runtime unavailable:',error?.message);return {MOVA_PUBLIC_ORIGINS:allowedOrigins()}}
}
