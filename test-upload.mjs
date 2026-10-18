import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('./public/admin.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('async function prepareUploadFile('),source.indexOf('async function logout()'));
function setup({bitmapFails=false,outputType='image/webp',unsupported=false}={}){
 const observed={revoked:0,closed:0};
 class FakeImage{width=8064;height=6048;set src(v){queueMicrotask(()=>unsupported?this.onerror():this.onload())}}
 const canvas={width:0,height:0,getContext:()=>({drawImage:()=>{}}),toBlob:cb=>cb(new Blob(['prepared'],{type:outputType}))};
 const ctx=vm.createContext({File,Blob,Image:FakeImage,Error,Math,Promise,queueMicrotask,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:()=>observed.revoked++},document:{createElement:()=>canvas},createImageBitmap:async()=>{if(bitmapFails)throw Error('Unsupported API');return {width:8064,height:6048,close:()=>observed.closed++}}});
 vm.runInContext(code,ctx);return {convert:vm.runInContext('prepareUploadFile',ctx),canvas,observed};
}
test('A high resolution phone photo is resized before upload',async()=>{const q=setup();const out=await q.convert(new File(['input'],'phone.jpg',{type:'image/jpeg'}));assert.equal(q.canvas.width,2400);assert.equal(q.canvas.height,1800);assert.equal(out.type,'image/webp');assert.equal(q.observed.closed,1)});
test('Safari image fallback works when createImageBitmap rejects a photo',async()=>{const q=setup({bitmapFails:true,outputType:'image/png'});const out=await q.convert(new File(['input'],'phone.jpg',{type:''}));assert.equal(out.type,'image/png');assert.equal(out.name,'mova-upload.png');assert.equal(q.observed.revoked,1)});
test('An undecodable phone format gives a useful error and releases the URL',async()=>{const q=setup({bitmapFails:true,unsupported:true});await assert.rejects(q.convert(new File(['input'],'phone.heic')),/JPEG|Fototeca/);assert.equal(q.observed.revoked,1)});
