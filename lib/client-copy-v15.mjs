const bi=(en,pt)=>({en,pt});
export function applyClientCopy(state){
 const s=structuredClone(state),e=s.events.find(e=>e.id==='event-14fa371d');if(!e)return s;
 e.venue=bi('Outdoor venue in MetroWest, Orlando','Local ao ar livre em MetroWest, Orlando');
 e.locationNotice=bi('Outdoor venue in MetroWest, Orlando. The exact address is private; contact the MOVA team for details.','Local ao ar livre em MetroWest, Orlando. O endereço exato é reservado; entre em contato com a equipe MOVA para mais informações.');
 e.locationPrivate=true;e.address='';e.mapUrl='';
 e.included=bi('A 45-minute functional workout with Ana, light brunch & wellness refreshments, partner experiences, a goodie bag, entry into giveaways and time to connect with other women.','Treino funcional de 45 minutos com Ana, brunch leve e bebidas de bem-estar, experiências dos parceiros, sacola de brindes, participação nos sorteios e momentos para se conectar com outras mulheres.');
 e.description.en=e.description.en.replace('music, brunch, and connection','music, light brunch & wellness refreshments, and connection');
 e.description.pt=e.description.pt.replace('música, brunch e conexão','música, brunch leve e bebidas de bem-estar e conexão');
 for(const card of e.benefits||[]){
  if(card.title.en==='Brunch & Connection'){card.title=bi('Light brunch & wellness refreshments','Brunch leve e bebidas de bem-estar');card.body=bi('Enjoy a light brunch and wellness refreshments while connecting with other women.','Aproveite um brunch leve e bebidas de bem-estar enquanto se conecta com outras mulheres.');}
  if(card.title.en==='Giveaways & Surprises'){card.title=bi('Entry into giveaways','Participação nos sorteios');card.body=bi('Your ticket includes entry into the event’s giveaways.','Seu ingresso inclui a participação nos sorteios do evento.');}
 }
 for(const item of e.schedule){if(item.title.en==='Brunch & Partner Experiences')item.title=bi('Light brunch, wellness refreshments & partner experiences','Brunch leve, bebidas de bem-estar e experiências dos parceiros');if(item.description)item.description=bi('Partner experiences and entry into giveaways.','Experiências dos parceiros e participação nos sorteios.');}
 for(const f of s.faq){
  if(f.question.en==='Where is the event?')f.answer=structuredClone(e.locationNotice);
  if(f.question.en==='What does my ticket include?')f.answer=structuredClone(e.included);
  if(f.question.en==='When is the event?')f.answer=bi('Sunday, November 22, 2026, 9:50 AM–1:00 PM, Orlando local time. Check-in: 9:50 AM. Meet MOVA and our partners: 10:30 AM. Workout with Ana: 11:00–11:45 AM. Brunch and partner experiences: 11:45 AM–1:00 PM.','Domingo, 22 de novembro de 2026, das 9h50 às 13h, no horário de Orlando. Check-in: 9h50. Apresentação do MOVA e dos parceiros: 10h30. Treino com Ana: 11h às 11h45. Brunch e experiências dos parceiros: 11h45 às 13h.');
 }
 return s;
}
