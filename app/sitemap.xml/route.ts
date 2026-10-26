import { env } from 'cloudflare:workers';
import { sitemapResponse } from '@/lib/seo.mjs';
export const dynamic='force-dynamic';
export function GET(request:Request){return sitemapResponse(request,env)}
