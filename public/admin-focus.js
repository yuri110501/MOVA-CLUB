function openPhotoFrame(path){
 const source=pathGet(path);if(!source)return;
 const framePath=path+'Frame',frame=structuredClone(pathGet(framePath)||MovaFraming.defaults());
 let device='desktop';
 const hero=path==='content.heroImage',gallery=path.startsWith('gallery.'),cover=path.endsWith('.cover'),about=path==='content.aboutImage';
 dialog(`<h2>Ajustar enquadramento</h2><p>Toque na imagem para escolher o foco. Ajuste o zoom de cada tela; a imagem original será preservada.</p><div class="focus-layout"><div><div class="focus-source" id="focus-source"><img src="${esc(source)}" alt="Escolha o ponto de foco"><span class="focus-crosshair" aria-hidden="true"></span></div><div class="focus-devices" role="group" aria-label="Tela a ajustar"><button class="mini-button" data-focus-device="desktop" aria-pressed="true">Computador</button><button class="mini-button" data-focus-device="mobile" aria-pressed="false">Celular</button></div>${[['x','Posição horizontal',0,100,1],['y','Posição vertical',0,100,1],['zoom','Zoom',1,3,.05]].map(([key,label,min,max,step])=>`<label class="field"><span>${label} <output id="focus-value-${key}"></output></span><input id="focus-${key}" type="range" min="${min}" max="${max}" step="${step}"></label>`).join('')}</div><div class="focus-previews"><h3>Como vai aparecer</h3><p>Computador</p><div class="focus-crop ${hero?'hero-desktop':gallery?'gallery-crop':cover?'cover-desktop':about?'about-desktop':'photo-desktop'}"><img data-focus-preview="desktop" src="${esc(source)}" alt="Enquadramento no computador"></div><p>Celular</p><div class="focus-crop ${hero?'hero-mobile':gallery?'gallery-crop':cover?'cover-mobile':'photo-mobile'}"><img data-focus-preview="mobile" src="${esc(source)}" alt="Enquadramento no celular"></div></div></div><div class="admin-dialog-actions"><button class="mini-button" id="focus-reset">Redefinir esta tela</button><button class="mini-button" id="focus-cancel">Cancelar</button><button class="btn small" id="focus-save">Salvar enquadramento</button></div>`);
 const modal=$('#admin-dialog');modal.classList.add('focus-dialog');
 const clean=()=>modal.classList.remove('focus-dialog');modal.addEventListener('close',clean,{once:true});
 function refresh(){
  for(const key of ['x','y','zoom']){$('#focus-'+key).value=frame[device][key];$('#focus-value-'+key).textContent=key==='zoom'?frame[device][key].toFixed(2)+'×':Math.round(frame[device][key])+'%'}
  $$('[data-focus-device]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.focusDevice===device)));
  const cross=$('.focus-crosshair');cross.style.left=frame[device].x+'%';cross.style.top=frame[device].y+'%';
  $$('[data-focus-preview]').forEach(img=>MovaFraming.apply(img,frame,img.dataset.focusPreview));
 }
 for(const key of ['x','y','zoom'])$('#focus-'+key).oninput=e=>{frame[device][key]=Number(e.target.value);refresh()};
 $$('[data-focus-device]').forEach(b=>b.onclick=()=>{device=b.dataset.focusDevice;refresh()});
 const stage=$('#focus-source');
 function point(e){const r=stage.getBoundingClientRect();frame[device].x=Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100));frame[device].y=Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100));refresh()}
 stage.onpointerdown=e=>{e.preventDefault();stage.setPointerCapture(e.pointerId);point(e)};
 stage.onpointermove=e=>{if(stage.hasPointerCapture(e.pointerId))point(e)};
 $('#focus-reset').onclick=()=>{frame[device]={x:50,y:50,zoom:1};refresh()};
 $('#focus-cancel').onclick=()=>modal.close();
 $('#focus-save').onclick=()=>{pathSet(framePath,frame);modal.close();toast('Enquadramento ajustado. Salve ou publique para aplicar ao site.')};
 refresh();
}
