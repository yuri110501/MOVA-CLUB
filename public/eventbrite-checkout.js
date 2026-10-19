/* Official Eventbrite checkout integration. No attendee or card data reaches MOVA. */
(()=>{
 const scriptURL='https://www.eventbrite.com/static/widgets/eb_widgets.js';
 let loading=null;
 const mounted=new WeakSet();
 function load(){
  if(window.EBWidgets?.createWidget)return Promise.resolve();
  if(loading)return loading;
  loading=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src=scriptURL;script.async=true;
   const timer=setTimeout(()=>finish(false),15000);
   function finish(ok){clearTimeout(timer);script.onload=null;script.onerror=null;if(ok&&window.EBWidgets?.createWidget)resolve();else{script.remove();loading=null;reject(Error('Eventbrite unavailable'))}}
   script.onload=()=>finish(true);script.onerror=()=>finish(false);document.head.append(script);
  });
  return loading;
 }
 async function prepare(config){
  if(!supports(config))throw Error('No Eventbrite event configured');
  const eventId=config.eventId,promoCode=config.promoCode||'';
  await load();
  return containerId=>{
   const container=document.getElementById(containerId);
   if(!container)throw Error('Checkout container unavailable');
   if(mounted.has(container))return;
   window.EBWidgets.createWidget({widgetType:'checkout',eventId,...(promoCode?{promoCode}:{}),
    themeSettings:{brandColor:'#B14F70',fontColor:'#3E3E42',background:'#FFFFFF'},
    iframeContainerId:containerId,iframeContainerHeight:540,
    onOrderComplete:()=>window.dispatchEvent(new CustomEvent('mova:eventbrite-complete'))});
   mounted.add(container);
  };
 }
 const supports=config=>!!config&&typeof config.eventId==='string'&&/^\d{6,24}$/.test(config.eventId);
 function withPromoCode(config,value){
  if(!supports(config)||typeof value!=='string')throw Error('Invalid checkout configuration');
  const promoCode=value.trim();
  if(promoCode.length>100||/[\x00-\x1f\x7f]/.test(promoCode))throw Error('Invalid promo code');
  const url=new URL(config.url);
  if(promoCode)url.searchParams.set('discount',promoCode);else url.searchParams.delete('discount');
  return {...config,promoCode,url:url.toString()};
 }
 window.MovaTicketing=Object.freeze({supports,prepare,withPromoCode});
})();
