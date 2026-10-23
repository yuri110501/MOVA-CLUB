export const dynamic='force-dynamic';
export function GET(){return new Response('Página não encontrada.',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}})}
