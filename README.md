# MOVA Club Orlando

Site institucional, página de eventos, checkout oficial incorporado do Eventbrite e painel administrativo bilíngue (EN/PT) do **MOVA Club Orlando**, preparado para rodar nativamente na **Vercel** com **Next.js 16**, **Auth.js (Google OAuth)**, **Turso / libSQL** e **Vercel Blob**.

## Arquitetura

- **Runtime:** Next.js 16 (App Router / Route Handlers em Node.js) na Vercel.
- **Autenticação do painel:** Google OAuth 2.0 via `next-auth` ([`auth.ts`](file:///C:/Users/Yuri/Desktop/MOVA%20Club%20Orlando/auth.ts)). Entrar com o Google apenas identifica a conta; todas as permissões continuam sendo verificadas no servidor na tabela `mova_admins`.
- **Banco de dados:** Turso / libSQL ([`lib/runtime.mjs`](file:///C:/Users/Yuri/Desktop/MOVA%20Club%20Orlando/lib/runtime.mjs), schema idempotente em [`lib/schema.mjs`](file:///C:/Users/Yuri/Desktop/MOVA%20Club%20Orlando/lib/schema.mjs)). Em desenvolvimento local, sem variáveis do Turso, usa automaticamente `.data/mova.db`.
- **Armazenamento de fotos:** Vercel Blob (`@vercel/blob`), servido em `/uploads/[name]` com validação binária de container (PNG, JPEG, WebP), remoção de metadados EXIF/XMP e cache imutável na CDN. Em desenvolvimento local, sem `BLOB_READ_WRITE_TOKEN`, grava em `.data/uploads/`.

## Como rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET e MOVA_BOOTSTRAP_OWNER_EMAIL
npm run dev                  # http://localhost:3000
```

Comandos úteis:

```bash
npm test        # 73 testes automatizados (segurança, CMS, checkout, SEO e uploads)
npm run lint    # ESLint
npm run build   # Build de produção do Next.js
```

## Como publicar na Vercel

1. **Importe o repositório na Vercel** (Framework Preset: *Next.js*, comandos padrão).
2. **Crie o banco no Turso** (ou instale a integração **Turso** no Vercel Marketplace) e copie `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`. As tabelas e o conteúdo inicial são criados automaticamente na primeira requisição.
3. **Crie um Vercel Blob Store** na aba **Storage** do projeto na Vercel (isso injeta `BLOB_READ_WRITE_TOKEN` automaticamente).
4. **Configure o Google OAuth** no [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Crie um *OAuth 2.0 Client ID* (tipo *Web application*).
   - Em **Authorized JavaScript origins**, adicione `https://www.movacluborlando.com` (e `http://localhost:3000` se quiser testar localmente).
   - Em **Authorized redirect URIs**, adicione:
     - `https://www.movacluborlando.com/api/auth/callback/google`
     - `http://localhost:3000/api/auth/callback/google`
5. **Cadastre as variáveis de ambiente na Vercel** (*Project Settings → Environment Variables*):
   - `MOVA_PUBLIC_ORIGIN` = `https://www.movacluborlando.com`
   - `MOVA_BOOTSTRAP_OWNER_EMAIL` = e-mail Google da administradora principal
   - `AUTH_SECRET` = string aleatória de 32+ bytes (`npx auth secret`)
   - `AUTH_GOOGLE_ID` = Client ID do Google
   - `AUTH_GOOGLE_SECRET` = Client Secret do Google
   - `TURSO_DATABASE_URL` = `libsql://...`
   - `TURSO_AUTH_TOKEN` = token do banco Turso
   - `BLOB_READ_WRITE_TOKEN` = token do Vercel Blob
6. Faça o deploy e acesse `/gestao-mova-b99c81deec0fc4e8` entrando com a conta Google definida em `MOVA_BOOTSTRAP_OWNER_EMAIL`. A partir da aba **Usuários e acessos**, gere convites individuais de uso único para outras administradoras ou editoras.
