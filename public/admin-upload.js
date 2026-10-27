/* Files remain local until selected for upload. Progress comes from XMLHttpRequest. */
const imageUploadJobs=new Map();
function imageTarget(path){const keys=path.split('.'),key=keys.pop();return {target:keys.reduce((v,k)=>v?.[k],state),key}}
function imageJob(path){const slot=imageTarget(path);return [...imageUploadJobs.values()].find(j=>j.target===slot.target&&j.key===slot.key)}
function imageJobPath(job){
 if(job.target===state.content)return 'content.'+job.key;
 for(const group of ['events','gallery','sponsors']){const i=state[group].indexOf(job.target);if(i>=0)return group+'.'+i+'.'+job.key}
 return null;
}
function uploadsRunning(){return [...imageUploadJobs.values()].some(j=>['preparing','uploading','finishing'].includes(j.status))}
function disposeImageJob(job){job.cancelled=true;job.xhr?.abort();if(job.preview)URL.revokeObjectURL(job.preview);imageUploadJobs.delete(job.id)}
function cleanImageJobs(){for(const job of imageUploadJobs.values())if(!imageJobPath(job))disposeImageJob(job)}
function renderImageField(path,label){
 const value=pathGet(path),job=imageJob(path),pending=job&&job.status!=='success',preview=pending?job.preview:value;
 const active=job&&['preparing','uploading','finishing'].includes(job.status);
 const message=job?({preparing:'Preparando a imagem…',uploading:job.progress===null?'Enviando a imagem…':'Enviando · '+job.progress+'%',finishing:'Envio concluído. Confirmando o arquivo…',success:'Imagem enviada. Salve o rascunho para guardar a alteração.',error:job.error}[job.status]):'';
 return `<div class="image-field ${job?.status==='error'?'has-upload-error':''}" data-image-field="${path}" data-image-label="${esc(label)}"><div class="image-preview-wrap">${preview?`<img class="image-preview" src="${esc(preview)}" alt="${esc(label)}"><span class="preview-fallback">Prévia indisponível neste formato</span>`:'<div class="image-placeholder">Nenhuma imagem</div>'}${pending?'<span class="selected-image-badge">Selecionada</span>':''}</div><div class="image-upload-controls"><label tabindex="0">${esc(label)}<input type="file" accept="image/*" data-upload="${path}" ${active?'disabled':''}></label><p>Fotos de até 30 MB. A imagem será redimensionada (até 4 MB) antes do envio.<br>PNG, JPEG e WebP; outros formatos dependem do navegador.</p>${job?`<div class="upload-state ${job.status}" ${job.status==='error'?'role="alert"':'role="status"'}><strong>${esc(message)}</strong><small>${esc(job.file.name)}</small>${active?`<progress max="100" ${job.status==='uploading'&&job.progress!==null?`value="${job.progress}"`:''} aria-label="Progresso do envio"></progress>`:''}${job.status==='error'?`<div class="row-actions"><button class="mini-button" data-retry-upload="${job.id}">Tentar novamente</button><button class="mini-button" data-cancel-upload="${job.id}">Descartar seleção</button></div>`:active?`<button class="mini-button" data-cancel-upload="${job.id}">Cancelar envio</button>`:''}</div>`:''}${value&&!['content.heroImage','content.aboutImage'].includes(path)?`<button class="mini-button" data-clear-image="${path}" ${active?'disabled':''}>Remover imagem</button>`:''}${value&&!path.startsWith('sponsors.')?`<button type="button" class="mini-button" data-frame="${path}">Ajustar enquadramento</button>`:''}</div></div>`;
}
function refreshImageJob(job){
 const path=imageJobPath(job);if(!path){disposeImageJob(job);return}
 const el=[...document.querySelectorAll('[data-image-field]')].find(e=>e.dataset.imageField===path);
 if(el){const label=el.dataset.imageLabel;el.outerHTML=renderImageField(path,label);const fresh=[...document.querySelectorAll('[data-image-field]')].find(e=>e.dataset.imageField===path);bindImageFields(fresh)}
 updateWorkflowControls();
}
function sendImageFile(file,job){return new Promise((resolve,reject)=>{
 const xhr=new XMLHttpRequest();job.xhr=xhr;xhr.open('POST','/api/admin/upload');xhr.timeout=90000;xhr.setRequestHeader('Content-Type',file.type);xhr.setRequestHeader('X-CSRF-Token',csrf);
 xhr.upload.onprogress=e=>{job.status=e.lengthComputable&&e.loaded===e.total?'finishing':'uploading';job.progress=e.lengthComputable?Math.round(e.loaded/e.total*100):null;refreshImageJob(job)};
 xhr.onload=()=>{let data;try{data=JSON.parse(xhr.responseText)}catch{return reject(Error('O servidor não confirmou o envio. Tente novamente.'))}if(xhr.status>=200&&xhr.status<300)return resolve(data);reject(Error(data.error||'Não foi possível enviar a imagem.'))};
 xhr.onerror=()=>reject(Error('O envio falhou. Confira sua conexão e tente novamente.'));
 xhr.ontimeout=()=>reject(Error('O envio demorou mais que o esperado. Tente novamente.'));
 xhr.onabort=()=>reject(Error('Envio cancelado.'));xhr.send(file);
})}
async function startImageUpload(job){
 job.status='preparing';job.error='';job.progress=null;job.cancelled=false;refreshImageJob(job);
 try{
  if(job.file.size>30*1024*1024)throw Error('Selecione uma imagem de até 30 MB.');
  const file=await prepareUploadFile(job.file);if(job.cancelled||!imageUploadJobs.has(job.id))return;
  job.status='uploading';job.progress=0;refreshImageJob(job);
  const result=await sendImageFile(file,job);if(job.cancelled||!imageUploadJobs.has(job.id))return;
  const path=imageJobPath(job);if(!path)return disposeImageJob(job);
  pathSet(path,result.url);job.status='success';if(job.preview){URL.revokeObjectURL(job.preview);job.preview=''}refreshImageJob(job);
 }catch(error){if(job.cancelled||!imageUploadJobs.has(job.id))return;job.status='error';job.error=error.message||'Não foi possível enviar a imagem.';refreshImageJob(job)}
}
function bindImageFields(root=document){
 root.querySelectorAll('[data-frame]').forEach(b=>b.onclick=()=>openPhotoFrame(b.dataset.frame));
 root.querySelectorAll('[data-upload]').forEach(input=>input.onchange=()=>{
  const file=input.files?.[0];if(!file)return;const path=input.dataset.upload,prior=imageJob(path);if(prior)disposeImageJob(prior);
  const slot=imageTarget(path),job={...slot,id:crypto.randomUUID(),file,preview:URL.createObjectURL(file),status:'preparing',progress:null,error:'',cancelled:false};imageUploadJobs.set(job.id,job);startImageUpload(job);
 });
 root.querySelectorAll('[data-retry-upload]').forEach(button=>button.onclick=()=>{const job=imageUploadJobs.get(button.dataset.retryUpload);if(job)startImageUpload(job)});
 root.querySelectorAll('[data-cancel-upload]').forEach(button=>button.onclick=()=>{const job=imageUploadJobs.get(button.dataset.cancelUpload);if(!job)return;const path=imageJobPath(job),label=[...document.querySelectorAll('[data-image-field]')].find(e=>e.dataset.imageField===path)?.dataset.imageLabel;disposeImageJob(job);const el=[...document.querySelectorAll('[data-image-field]')].find(e=>e.dataset.imageField===path);if(el&&label){el.outerHTML=renderImageField(path,label);bindImageFields([...document.querySelectorAll('[data-image-field]')].find(e=>e.dataset.imageField===path))}updateWorkflowControls()});
 root.querySelectorAll('[data-clear-image]').forEach(button=>button.onclick=()=>{const job=imageJob(button.dataset.clearImage);if(job)disposeImageJob(job);pathSet(button.dataset.clearImage,'');render()});
 root.querySelectorAll('.image-preview').forEach(img=>img.onerror=()=>img.closest('.image-preview-wrap').classList.add('preview-unavailable'));
}
