// Resolves ordinary public event URLs; never scrapes attendee or payment data.
export function eventbriteCheckout(event){
 const value=event.eventbriteUrl||'';
 if(!value)return null;
 let url;
 try{url=new URL(value)}catch{throw Error('Cole o link público completo do evento no Eventbrite.')}
 if(url.protocol!=='https:'||url.username||url.password||url.port||!['eventbrite.com','www.eventbrite.com','eventbrite.com.br','www.eventbrite.com.br'].includes(url.hostname))throw Error('Use um link HTTPS oficial do Eventbrite.');
 const match=url.pathname.match(/^\/e\/(?:[^/]*-)?(\d{6,24})\/?$/);
 if(!match)throw Error('Abra a página pública do evento no Eventbrite e copie o link completo, com /e/ e o número do evento.');
 const promoCode=String(event.eventbritePromoCode||url.searchParams.get('discount')||'').trim();
 if(promoCode.length>100||/[\x00-\x1f\x7f]/.test(promoCode))throw Error('Cupom inválido ou longo demais.');
 if(promoCode)url.searchParams.set('discount',promoCode);else url.searchParams.delete('discount');
 url.hash='';
 return {eventId:match[1],promoCode,url:url.toString(),testMode:event.eventbriteTestMode===true};
}
