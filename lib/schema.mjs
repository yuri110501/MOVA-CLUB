// SQLite/libSQL schema. Idempotent: safe to run on every cold start.
export const SCHEMA=[
 `CREATE TABLE IF NOT EXISTS mova_admins (id text PRIMARY KEY NOT NULL, name text NOT NULL, email text NOT NULL, role text NOT NULL, active integer DEFAULT 1 NOT NULL, csrf text NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS mova_documents (id integer PRIMARY KEY NOT NULL, body text NOT NULL, revision integer NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS mova_history (revision integer PRIMARY KEY NOT NULL, body text NOT NULL, actor text, name text, at text NOT NULL, action text NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS mova_invitations (token text PRIMARY KEY NOT NULL, role text NOT NULL, name text NOT NULL, created_by text NOT NULL, expires integer NOT NULL, used_by text, used_at integer, nonce text)`,
 `CREATE TABLE IF NOT EXISTS mova_meta (key text PRIMARY KEY NOT NULL, value text NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS mova_drafts (id integer PRIMARY KEY NOT NULL, body text NOT NULL, revision integer NOT NULL, base_revision integer NOT NULL, updated_at text NOT NULL, updated_by text)`,
 `CREATE TABLE IF NOT EXISTS mova_audit (id integer PRIMARY KEY AUTOINCREMENT, at text NOT NULL, actor text, actor_name text, action text NOT NULL, target text)`
];
