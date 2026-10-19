import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./public/admin-upload.js',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('function sendImageFile('),source.indexOf('async function startImageUpload('));
function harness(status=201,body='{"url":"/uploads/test.webp"}'){
 let request;const events=[];
 class XHR{upload={};headers={};constructor(){request=this}open(method,url){this.method=method;this.url=url}setRequestHeader(k,v){this.headers[k]=v}send(file){this.file=file}}
 const scope=vm.createContext({XMLHttpRequest:XHR,csrf:'test-csrf',Promise,Error,JSON,Math,refreshImageJob:job=>events.push({status:job.status,progress:job.progress})});vm.runInContext(fn,scope);
 const job={};const pending=vm.runInContext('sendImageFile',scope)({type:'image/webp'},job);return {request,events,job,pending,finish(){request.status=status;request.responseText=body;request.onload()}};
}
test('Upload progress uses measured bytes and waits for server confirmation',async()=>{const q=harness();assert.equal(q.request.headers['X-CSRF-Token'],'test-csrf');q.request.upload.onprogress({lengthComputable:true,loaded:25,total:100});assert.equal(q.events.at(-1).progress,25);q.request.upload.onprogress({lengthComputable:true,loaded:100,total:100});assert.equal(q.events.at(-1).status,'finishing');q.finish();assert.equal((await q.pending).url,'/uploads/test.webp')});
test('An upload without a known total stays indeterminate',async()=>{const q=harness();q.request.upload.onprogress({lengthComputable:false,loaded:30,total:0});assert.equal(q.events.at(-1).progress,null);q.finish();await q.pending});
test('Server errors are preserved for the retry UI',async()=>{const q=harness(413,'{"error":"Arquivo grande demais."}');q.finish();await assert.rejects(q.pending,/Arquivo grande demais/)});
test('Connection failures give an actionable retry message',async()=>{const q=harness();q.request.onerror();await assert.rejects(q.pending,/conexão.*tente novamente/)});
