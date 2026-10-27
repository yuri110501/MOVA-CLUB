import {handleAPI,pageResponse} from './core.mjs';
export const canonicalOrigin='https://www.movacluborlando.com';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const brandSEO={
 en:{title:'MOVA Club Orlando | Fitness & Wellness Experiences',description:'MOVA Club brings movement, fitness, and community together in Orlando. Discover our experiences, meet the team, and reserve your spot for the next event.'},
 pt:{title:'MOVA Club Orlando | Experiências de Fitness e Bem-estar',description:'O MOVA Club reúne movimento, fitness e comunidade em Orlando. Descubra nossas experiências, conheça as fundadoras e garanta sua vaga no próximo evento.'}
};
const href=(path,lang)=>canonicalOrigin+path+(lang==='pt'?'?lang=pt':'');
const local=(value,lang)=>esc(value?.[lang]??value?.en??'');
function basicContent(state,path,lang){
 const pt=lang==='pt',e=state.events.find(e=>e.id===path.split('/')[2])||state.events[0];
 if(path.startsWith('/legal/')){const doc=state.legal[path.split('/')[2]];return doc?`<article class="wrap legal-page"><h1>${local(doc.title,lang)}</h1><div class="legal-body">${local(doc.body,lang)}</div></article>`:'';}
 const summary=e?`<section id="events" class="event-section"><p class="eyebrow">MOVA EXPERIENCE</p><h${path==='/'?'2':'1'}>${local(e.name,lang)}</h${path==='/'?'2':'1'}><p>${esc(e.date)} · ${esc(e.start)}–${esc(e.end)} · Orlando</p><p>${local(e.locationNotice||e.venue,lang)}</p><p>${local(e.included,lang)}</p><p class="event-price">$${e.price?.toFixed(2)??''}${e.ticketPricing?(pt?' — taxas incluídas':' — fees included'):''}</p>${e.ticketPricing?`<p class="fee-breakdown">$${e.ticketPricing.base.toFixed(2)} + $${e.ticketPricing.fees.toFixed(2)} ${pt?'em taxas. Total previsto; confirme no checkout.':'in fees. Expected total; confirm at checkout.'}</p>`:''}<a class="btn" href="${esc(e.checkout?.url||e.eventbriteUrl)}">${pt?'Garanta sua vaga':'Reserve My Spot'}</a>${e.benefits?.length?`<h2>${pt?'Muito mais que um treino':'More Than Just a Workout'}</h2><div class="benefits-grid">${e.benefits.map(b=>`<article><h3>${local(b.title,lang)}</h3><p>${local(b.body,lang)}</p></article>`).join('')}</div>`:''}${path.startsWith('/events/')?`<h2>${pt?'Programação':'The schedule'}</h2><ol class="timeline">${e.schedule.map(s=>`<li><time>${esc(s.start)}${s.start!==s.end?'–'+esc(s.end):''}</time><h3>${local(s.title,lang)}</h3>${s.description?`<p>${local(s.description,lang)}</p>`:''}</li>`).join('')}</ol>`:''}</section>`:'';
 return `<div class="wrap detail-top">${path==='/'?`<section id="about" class="about-copy"><h1>MOVA Club Orlando</h1><p>${local(state.content.aboutBody,lang)}</p><p>${local(state.content.anaBody,lang)}</p></section>`:''}${summary}<section id="faq" class="faq-list">${state.faq.map(f=>`<details><summary>${local(f.question,lang)}</summary><p>${local(f.answer,lang)}</p></details>`).join('')}</section></div>`;
}
export function renderPublicHTML(html,request,state){
 const url=new URL(request.url),lang=url.searchParams.get('lang')==='pt'?'pt':'en',path=url.pathname;
 const event=path.startsWith('/events/')?state.events.find(e=>e.id===path.split('/')[2]):null;
 const legal=path.startsWith('/legal/')?state.legal[path.split('/')[2]]:null;
 const found=path==='/'||Boolean(event)||Boolean(legal);
 const title=event?(event.name[lang]||event.name.en)+' | MOVA Club Orlando':legal?(legal.title[lang]||legal.title.en)+' | MOVA Club Orlando':brandSEO[lang].title;
 const description=event?(event.included[lang]||event.included.en)+' '+event.date+'. '+(event.locationNotice?.[lang]||event.venue[lang]):brandSEO[lang].description;
 html=html.replace('<html lang="en">',`<html lang="${lang==='pt'?'pt-BR':'en'}">`).replace(/<title>.*?<\/title>/,`<title>${esc(title)}</title>`);
 for(const [kind,key,value] of [['name','description',description],['property','og:title',title],['property','og:description',description],['property','og:image',canonicalOrigin+'/assets/mova-share-vector.png'],['property','og:image:secure_url',canonicalOrigin+'/assets/mova-share-vector.png'],['name','twitter:image',canonicalOrigin+'/assets/mova-share-vector.png']])html=html.replace(new RegExp(`<meta ${kind}="${key}" content="[^"]*">`),`<meta ${kind}="${key}" content="${esc(value)}">`);
 html=html.replace('</head>',`<link rel="canonical" href="${esc(href(path,lang))}"><link rel="alternate" hreflang="en" href="${esc(href(path,'en'))}"><link rel="alternate" hreflang="pt-BR" href="${esc(href(path,'pt'))}"><link rel="alternate" hreflang="x-default" href="${esc(href(path,'en'))}"><meta property="og:url" content="${esc(href(path,lang))}"><meta property="og:locale" content="${lang==='pt'?'pt_BR':'en_US'}"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"></head>`);
 if(!found)html=html.replace('content="index,follow"','content="noindex,follow"');
 const initial=`<template id="mova-initial-state">${esc(JSON.stringify(state))}</template>`;
 const content=found?basicContent(state,path,lang):`<div class="wrap empty-page"><h1>${lang==='pt'?'Esta experiência não está disponível.':'This experience is not available.'}</h1><a href="/">MOVA Club</a></div>`;
 html=html.replace(/<main id="main">[\s\S]*?<\/main>/,`<main id="main">${content}</main>`).replace('</body>',initial+'</body>');
 return {html,status:found?200:404};
}
export async function publicPageResponse(html,request,env){
 const response=await handleAPI(new Request(new URL('/api/public',request.url)),env);
 if(!response.ok)return new Response('MOVA Club — temporarily unavailable. Please try again.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Retry-After':'60','X-Robots-Tag':'noindex'}});
 const {state}=await response.json(),rendered=renderPublicHTML(html,request,state),result=pageResponse(rendered.html);
 return new Response(result.body,{status:rendered.status,headers:result.headers});
}
export function sitemapXML(state){
 const paths=['/',...state.events.map(e=>'/events/'+e.id),...['terms','privacy','image'].map(k=>'/legal/'+k)];
 return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'+paths.flatMap(path=>['en','pt'].map(lang=>`<url><loc>${esc(href(path,lang))}</loc><xhtml:link rel="alternate" hreflang="en" href="${esc(href(path,'en'))}"/><xhtml:link rel="alternate" hreflang="pt-BR" href="${esc(href(path,'pt'))}"/><xhtml:link rel="alternate" hreflang="x-default" href="${esc(href(path,'en'))}"/></url>`)).join('')+'</urlset>';
}
export async function sitemapResponse(request,env){
 const response=await handleAPI(new Request(new URL('/api/public',request.url)),env);
 if(!response.ok)return new Response('Temporarily unavailable',{status:503,headers:{'Retry-After':'60'}});
 return new Response(sitemapXML((await response.json()).state),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300'}});
}
