import { getIdentity } from '@/auth';
import { getEnvSafe } from '@/lib/runtime.mjs';
import { handleAPI } from '@/lib/core.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleAPI(request,await getEnvSafe(),await getIdentity())}
export async function POST(request:Request){return handleAPI(request,await getEnvSafe(),await getIdentity())}