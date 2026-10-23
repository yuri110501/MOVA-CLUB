/* Non-destructive crop: the source image stays untouched. */
window.MovaFraming={
 defaults(){return {desktop:{x:50,y:50,zoom:1},mobile:{x:50,y:50,zoom:1}}},
 apply(img,frame,device){
  const v=frame?.[device]||{x:50,y:50,zoom:1};
  img.style.objectPosition=`${v.x}% ${v.y}%`;
  img.style.transformOrigin=`${v.x}% ${v.y}%`;
  img.style.transform=`scale(${v.zoom})`;
 },
 applyAll(){document.querySelectorAll('[data-photo-frame]').forEach(img=>{try{this.apply(img,JSON.parse(img.dataset.photoFrame),matchMedia('(max-width:800px)').matches?'mobile':'desktop')}catch{}})}
};
matchMedia('(max-width:800px)').addEventListener('change',()=>MovaFraming.applyAll());
