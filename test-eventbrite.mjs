import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {pageResponse} from './lib/core.mjs';
import {eventbriteCheckout} from './lib/eventbrite.mjs';
const config=eventbriteCheckout({eventbriteUrl:'https://www.eventbrite.com/e/2003621624214/?discount=teste',eventbriteTestMode:true});

function fixture(){
 const scripts=[],elements=new Map(),widgets=[],events=[];
 const context={setTimeout,clearTimeout,Promise,Error,Object,URL,CustomEvent:class{constructor(type){this.type=type}},document:{
  head:{append:el=>scripts.push(el)},body:{append:el=>elements.set(el.id,el)},getElementById:id=>elements.get(id),
  createElement:tag=>({tag,setAttribute(){},remove(){this.removed=true},click(){this.clicks=(this.clicks||0)+1}})
 }};
 context.window=context;context.dispatchEvent=e=>events.push(e.type);vm.createContext(context);
 vm.runInContext(readFileSync(new URL('./public/eventbrite-checkout.js',import.meta.url),'utf8'),context);
 return {context,scripts,elements,widgets,events,ready(){context.EBWidgets={createWidget:opt=>widgets.push(opt)};scripts.at(-1).onload()}};
}
test('The test checkout uses the official widget, correct event and the automatic full-discount code',async()=>{
 const f=fixture(),p=f.context.MovaTicketing.prepare(config);assert.equal(f.scripts.length,1);assert.equal(f.scripts[0].src,'https://www.eventbrite.com/static/widgets/eb_widgets.js');f.ready();const mount=await p;f.elements.set('test-frame',{});mount('test-frame');
 assert.equal(f.widgets[0].eventId,'2003621624214');assert.equal(f.widgets[0].promoCode,'teste');assert.equal(f.widgets[0].iframeContainerId,'test-frame');assert.equal(f.widgets[0].themeSettings.fontColor,'#3E3E42');
 f.widgets[0].onOrderComplete();assert.deepEqual(f.events,['mova:eventbrite-complete']);
});
test('Repeated checkout openings reuse the same script and widget',async()=>{
 const f=fixture(),a=f.context.MovaTicketing.prepare(config),b=f.context.MovaTicketing.prepare(config);assert.equal(f.scripts.length,1);f.ready();const [one,two]=await Promise.all([a,b]);f.elements.set('test-frame',{});one('test-frame');two('test-frame');assert.equal(f.widgets.length,1);
});
test('A failed widget load can be retried and the fallback retains the coupon',async()=>{
 const f=fixture(),a=f.context.MovaTicketing.prepare(config);f.scripts[0].onerror();await assert.rejects(a);const b=f.context.MovaTicketing.prepare(config);assert.equal(f.scripts.length,2);f.ready();await b;assert.equal(new URL(config.url).searchParams.get('discount'),'teste');assert.equal(f.context.MovaTicketing.supports(config),true);assert.equal(f.context.MovaTicketing.supports(null),false);
});
test('Only public pages allow the Eventbrite frame and script; the Admin stays restricted',()=>{
 const publicResponse=pageResponse('<script src="/site.js?v=6"></script>'),adminResponse=pageResponse('<script src="/admin.js?v=6"></script>');
 assert.ok(publicResponse.headers.get('Content-Security-Policy').includes('frame-src https://www.eventbrite.com'));assert.equal(publicResponse.headers.get('Referrer-Policy'),'origin-when-cross-origin');
 assert.ok(!adminResponse.headers.get('Content-Security-Policy').includes('eventbrite.com'));assert.ok(adminResponse.headers.get('Content-Security-Policy').includes("script-src 'self'"));
});

test('Ordinary public event links resolve their own event IDs and retain optional coupons',()=>{
 for(const link of ['https://www.eventbrite.com/e/teste-tickets-2003621624214?aff=creator','https://www.eventbrite.com/e/2003621624214/','https://www.eventbrite.com.br/e/mova-ingressos-2003621624214'])assert.equal(eventbriteCheckout({eventbriteUrl:link}).eventId,'2003621624214');
 assert.equal(eventbriteCheckout({eventbriteUrl:'https://www.eventbrite.com/e/2003621624214/?discount=teste'}).promoCode,'teste');
 const other=eventbriteCheckout({eventbriteUrl:'https://www.eventbrite.com/e/1234567890123',eventbritePromoCode:'MOVA10'});assert.equal(other.eventId,'1234567890123');assert.equal(new URL(other.url).searchParams.get('discount'),'MOVA10');assert.equal(other.testMode,false);
});
test('Unsafe links, missing event IDs and control characters in coupons are rejected',()=>{
 for(const link of ['javascript:alert(1)','http://www.eventbrite.com/e/1234567890123','https://eventbrite.com.evil.test/e/1234567890123','https://user:password@www.eventbrite.com/e/1234567890123','https://www.eventbrite.com/','https://www.eventbrite.com/e/not-an-id'])assert.throws(()=>eventbriteCheckout({eventbriteUrl:link}));
 assert.throws(()=>eventbriteCheckout({eventbriteUrl:'https://www.eventbrite.com/e/1234567890123',eventbritePromoCode:'test\ncode'}));assert.equal(eventbriteCheckout({eventbriteUrl:''}),null);
});
test('Each event opens its own widget without inheriting another event coupon',async()=>{
 const f=fixture(),first=f.context.MovaTicketing.prepare(config);f.ready();const mount=await first;f.elements.set('frame-a',{});mount('frame-a');
 const live=eventbriteCheckout({eventbriteUrl:'https://www.eventbrite.com/e/1234567890123'});const mountOther=await f.context.MovaTicketing.prepare(live);f.elements.set('frame-b',{});mountOther('frame-b');
 assert.equal(f.widgets[0].eventId,'2003621624214');assert.equal(f.widgets[0].promoCode,'teste');assert.equal(f.widgets[1].eventId,'1234567890123');assert.equal(f.widgets[1].promoCode,undefined);assert.equal(f.scripts.length,1);
});
test('An event without a valid checkout configuration does not load third-party code',async()=>{
 const f=fixture();await assert.rejects(f.context.MovaTicketing.prepare(null));assert.equal(f.scripts.length,0);
});

test('A visitor coupon reaches the widget and fallback without changing the event configuration',async()=>{
 const f=fixture(),original=eventbriteCheckout({eventbriteUrl:'https://www.eventbrite.com/e/2003621624214/?aff=mova'});
 const chosen=f.context.MovaTicketing.withPromoCode(original,'  teste  ');
 assert.equal(chosen.promoCode,'teste');assert.equal(new URL(chosen.url).searchParams.get('discount'),'teste');assert.equal(new URL(chosen.url).searchParams.get('aff'),'mova');assert.equal(original.promoCode,'');assert.equal(new URL(original.url).searchParams.has('discount'),false);
 const loading=f.context.MovaTicketing.prepare(chosen);f.ready();const mount=await loading;f.elements.set('visitor-frame',{});mount('visitor-frame');assert.equal(f.widgets[0].promoCode,'teste');
});

test('A blank visitor coupon removes a prefilled discount from both widget and fallback',async()=>{
 const f=fixture(),chosen=f.context.MovaTicketing.withPromoCode(config,'   ');
 assert.equal(chosen.promoCode,'');assert.equal(new URL(chosen.url).searchParams.has('discount'),false);assert.equal(config.promoCode,'teste');
 const loading=f.context.MovaTicketing.prepare(chosen);f.ready();const mount=await loading;f.elements.set('full-price-frame',{});mount('full-price-frame');assert.equal(f.widgets[0].promoCode,undefined);
});

test('Visitor coupon validation rejects control characters and oversized codes',()=>{
 const f=fixture();assert.throws(()=>f.context.MovaTicketing.withPromoCode(config,'a'.repeat(101)));assert.throws(()=>f.context.MovaTicketing.withPromoCode(config,'test\ncode'));assert.throws(()=>f.context.MovaTicketing.withPromoCode(null,'teste'));
 const chosen=f.context.MovaTicketing.withPromoCode(config,'A&B #1');assert.equal(new URL(chosen.url).searchParams.get('discount'),'A&B #1');
});
