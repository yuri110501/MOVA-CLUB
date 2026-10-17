import { publicHTML } from '@/lib/html';
import { pageResponse } from '@/lib/core.mjs';
export const dynamic='force-dynamic';
export function GET(){return pageResponse(publicHTML)}
