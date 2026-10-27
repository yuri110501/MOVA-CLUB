import { publicHTML } from '@/lib/html';
import { getEnvSafe } from '@/lib/runtime.mjs';
import { publicPageResponse } from '@/lib/seo.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return publicPageResponse(publicHTML,request,await getEnvSafe())}