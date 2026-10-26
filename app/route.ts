import { publicHTML } from '@/lib/html';
import { env } from 'cloudflare:workers';
import { publicPageResponse } from '@/lib/seo.mjs';
export const dynamic='force-dynamic';
export function GET(request:Request){return publicPageResponse(publicHTML,request,env)}
