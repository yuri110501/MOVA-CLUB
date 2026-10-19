import { publicHTML } from '@/lib/html';
import { pageResponse } from '@/lib/core.mjs';
export const dynamic='force-dynamic';
export function GET(){return pageResponse(publicHTML.replace('<body>','<body data-editor-preview><div class="editor-preview-bar"><strong>PRÉVIA DO RASCUNHO</strong><span>Somente pessoas autorizadas</span><a href="/admin">Voltar ao painel</a></div>'))}
