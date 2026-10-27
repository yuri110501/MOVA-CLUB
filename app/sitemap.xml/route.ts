import { getEnvSafe } from '@/lib/runtime.mjs';
import { sitemapResponse } from '@/lib/seo.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return sitemapResponse(request,await getEnvSafe())}