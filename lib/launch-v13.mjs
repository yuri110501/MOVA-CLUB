import previousRefundPolicy from './refund-policy-v12.json' with {type:'json'};
// Approved launch content. This patch never replaces photographs or unrelated edits.
export const launchEventId='event-14fa371d';
const bi=(en,pt)=>({en,pt});
export const secretLocation=bi('Secret Location — The exact address will be shared exclusively with ticket holders via email before the event.','Local Secreto — O endereço será enviado exclusivamente por e-mail aos participantes que adquirirem ingresso, antes do evento.');
export const transferPolicy=bi('Tickets may be transferred to another person until November 20, 2026. Contact the MOVA team to arrange the change and provide the new attendee’s name and email.','Os ingressos podem ser transferidos para outra pessoa até 20 de novembro de 2026. Entre em contato com a equipe MOVA para organizar a alteração e informar o nome e o e-mail da nova participante.');
export const refundBody=bi('Tickets are non-refundable for personal cancellation, changes of plans, late arrival or non-attendance, as funds are committed to brunch, goodie bags and event preparations. This does not affect refunds required by applicable law or Eventbrite’s rules, including cancellation by the organizer.','Os ingressos não são reembolsáveis por desistência pessoal, mudança de planos, atraso ou ausência, pois os valores são utilizados nos preparativos, incluindo brunch, brindes e organização. Esta regra não elimina os reembolsos obrigatórios previstos na legislação aplicável ou nas regras do Eventbrite, inclusive em caso de cancelamento pela organização.');
export const benefits=[
 {title:bi('Functional Workout','Treino funcional'),body:bi('45 minutes of movement with Ana Maia.','45 minutos de treino com Ana Maia.')},
 {title:bi('Brunch & Connection','Brunch e conexão'),body:bi('Enjoy brunch and make meaningful connections.','Saboreie o brunch e faça novas conexões.')},
 {title:bi('Partner Experiences','Experiências dos parceiros'),body:bi('Discover our partner brands and their experiences.','Conheça as marcas parceiras e suas experiências.')},
 {title:bi('Goodie Bag','Sacola de brindes'),body:bi('A goodie bag guaranteed for every participant.','Uma sacola de brindes garantida para cada participante.')},
 {title:bi('Giveaways & Surprises','Sorteios e surpresas'),body:bi('Prize drawings and special surprises throughout the event.','Sorteios e surpresas especiais durante o evento.')}
];
export const launchFAQs=[
 {question:bi('When is the event?','Quando será o evento?'),answer:bi('Sunday, November 22, 2026, in Orlando local time. Check-in & Welcome starts at 9:50 AM; the main program begins at 10:30 AM and the event closes at 1:00 PM.','Domingo, 22 de novembro de 2026, no horário de Orlando. Check-in e boas-vindas às 9h50; programação principal a partir das 10h30 e encerramento às 13h.')},
 {question:bi('Where is the event?','Onde será o evento?'),answer:secretLocation},
 {question:bi('What does my ticket include?','O que está incluído no ingresso?'),answer:bi('A 45-minute functional workout with Ana Maia, brunch, connections, partner experiences, a goodie bag for every participant, and entry into giveaways and surprises. All fitness levels are welcome.','Treino funcional de 45 minutos com Ana Maia, brunch, conexões, experiências dos parceiros, sacola de brindes para cada participante e participação nos sorteios e surpresas. Todos os níveis de condicionamento físico são bem-vindos.')},
 {question:bi('What should I bring?','O que devo levar?'),answer:bi('Wear suitable workout clothes and comfortable sneakers, and bring a water bottle.','Use roupas adequadas para exercício e tênis confortável, e leve uma garrafinha de água.')},
 {question:bi('How much is a ticket?','Quanto custa o ingresso?'),answer:bi('The expected total is $39.19, including a $35.00 ticket and $4.19 in Eventbrite fees. Confirm the final total in the official checkout before completing your purchase.','O total previsto é de US$ 39,19, incluindo o ingresso de US$ 35,00 e US$ 4,19 em taxas do Eventbrite. Confira o total final no checkout oficial antes de concluir a compra.')},
 {question:bi('Can I get a refund or transfer my ticket?','Posso solicitar reembolso ou transferir meu ingresso?'),answer:bi(refundBody.en+' '+transferPolicy.en,refundBody.pt+' '+transferPolicy.pt)}
];
export function applyLaunchUpdate(state){
 const s=structuredClone(state);
 let e=s.events.find(e=>e.id===launchEventId);
 if(!e){
  e=s.events.find(e=>e.id==='the-first-move');
  if(e)e.id=launchEventId;
 }
 if(!e)return s;
 Object.assign(e,{
  name:bi('MOVA Experience — The First Move','MOVA Experience — The First Move'),date:'2026-11-22',start:'09:50',end:'13:00',doors:'09:50',mainStart:'10:30',timezone:'America/New_York',
  venue:bi('Secret Location','Local Secreto'),locationNotice:secretLocation,locationPrivate:true,address:'',mapUrl:'',city:'Orlando, Florida, USA',
  price:39.19,ticketPricing:{base:35,fees:4.19},capacity:50,limitedSpots:true,
  eventbriteUrl:'https://www.eventbrite.com/e/2003831016512?aff=oddtdtcreator',eventbritePromoCode:'',eventbriteTestMode:false,
  benefits:structuredClone(benefits),transferPolicy:structuredClone(transferPolicy),
  refundPolicy:bi('Non-refundable tickets · mandatory rights preserved','Ingressos não reembolsáveis · direitos obrigatórios preservados'),
  included:bi('Workout, brunch, partner experiences, a guaranteed goodie bag and giveaways.','Treino, brunch, experiências dos parceiros, sacola de brindes garantida e sorteios.'),
  schedule:[
   {start:'09:50',end:'10:30',title:bi('Check-in & Welcome','Check-in e boas-vindas')},
   {start:'10:30',end:'11:00',title:bi('Meet MOVA & Our Partners','Conheça o MOVA e nossos parceiros')},
   {start:'11:00',end:'11:45',title:bi('Functional Workout with Ana Maia','Treino funcional com Ana Maia')},
   {start:'11:45',end:'13:00',title:bi('Brunch & Partner Experiences','Brunch e experiências dos parceiros'),description:bi('Partner experiences, giveaways and surprises.','Experiências dos parceiros, sorteios e surpresas.')},
   {start:'13:00',end:'13:00',title:bi('Closing','Encerramento')}
  ]
 });
 // Keep the existing introduction and invitation, while the benefit cards carry detail.
 for(const lang of ['en','pt']){
  const text=e.description[lang],begin=text.indexOf(lang==='en'?'What to expect:':'O que esperar:'),end=text.indexOf(lang==='en'?'All fitness levels':'Todos os níveis');
  if(begin>=0&&end>begin)e.description[lang]=text.slice(0,begin)+text.slice(end);
 }
 // Replace this event's old FAQs; retain any independently added questions.
 const replaced=new Set(['Can I come on my own?','Where is the event?','What should I bring?','How do tickets and cancellations work?',...launchFAQs.map(f=>f.question.en)]);
 s.faq=[...structuredClone(launchFAQs),...s.faq.filter(f=>!replaced.has(f.question.en))];
 for(const lang of ['en','pt']){
  const heading=lang==='en'?'Cancellation and refunds — MOVA Experience':'Cancelamentos e reembolsos — MOVA Experience';
  const old=s.legal.terms.body[lang];
  const nextHeading=lang==='en'?'Tickets, refunds and transfers — MOVA Experience':'Ingressos, reembolsos e transferências — MOVA Experience';
  const replacement=nextHeading+'\n\n'+refundBody[lang]+'\n\n'+transferPolicy[lang]+'\n\n'+(lang==='en'?'For help, use MOVA’s contact link or Contact the organizer on Eventbrite. Include your order number. We will provide an initial response within five business days.':'Para ajuda, use o contato do MOVA neste site ou Entrar em contato com o organizador no Eventbrite. Informe o número do pedido. A primeira resposta será enviada em até cinco dias úteis.');
  const previous=heading+'\n\n'+previousRefundPolicy.body[lang];
  if(old.includes(previous))s.legal.terms.body[lang]=old.replace(previous,replacement);
  else if(!old.includes(nextHeading))s.legal.terms.body[lang]=old.trim()+'\n\n'+replacement;
 }
 return s;
}
