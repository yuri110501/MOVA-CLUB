import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { handleAPI } from '@/lib/core.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleAPI(request,env,await getChatGPTUser())}
export async function POST(request:Request){return handleAPI(request,env,await getChatGPTUser())}
