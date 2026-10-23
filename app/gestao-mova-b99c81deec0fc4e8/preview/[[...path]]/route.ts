import { publicHTML } from '@/lib/html';
import { pageResponse } from '@/lib/core.mjs';
export const dynamic='force-dynamic';
export function GET(){return pageResponse(publicHTML.replace('<body>','<body data-editor-preview="/gestao-mova-b99c81deec0fc4e8/preview"><div class="editor-preview-bar"><strong>PRÉVIA DO RASCUNHO</strong><span>Somente pessoas autorizadas</span><a href="/gestao-mova-b99c81deec0fc4e8">Voltar ao painel</a></div>'))}
