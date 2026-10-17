import { env } from 'cloudflare:workers';
import { uploadedResponse } from '@/lib/core.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return uploadedResponse(new URL(request.url).pathname.split('/').at(-1)!,env)}
