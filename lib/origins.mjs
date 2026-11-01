// Verified production domains belonging to this MOVA Vercel project.
const projectOrigins=[
 'https://www.movacluborlando.com',
 'https://movacluborlando.com',
 'https://mova-club-orlando.vercel.app'
];
export function allowedOrigins(env=process.env){
 const list=[...projectOrigins,...String(env.MOVA_PUBLIC_ORIGIN||'').split(',').map(v=>v.trim().replace(/\/$/,'')).filter(Boolean)];
 for(const key of ['VERCEL_PROJECT_PRODUCTION_URL','VERCEL_BRANCH_URL','VERCEL_URL'])if(env[key])list.push('https://'+env[key]);
 if(!env.VERCEL&&env.NODE_ENV!=='production')list.push('http://localhost:3000','http://127.0.0.1:3000');
 return [...new Set(list)];
}
