import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const documents = sqliteTable("mova_documents", {
  id: integer("id").primaryKey(),
  body: text("body").notNull(),
  revision: integer("revision").notNull(),
});
export const drafts = sqliteTable("mova_drafts", {
  id: integer("id").primaryKey(),
  body: text("body").notNull(),
  revision: integer("revision").notNull(),
  baseRevision: integer("base_revision").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by"),
});
export const history = sqliteTable("mova_history", {
  revision: integer("revision").primaryKey(),
  body: text("body").notNull(),
  actor: text("actor"),
  name: text("name"),
  at: text("at").notNull(),
  action: text("action").notNull(),
});
export const admins = sqliteTable("mova_admins", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  active: integer("active").notNull().default(1),
  csrf: text("csrf").notNull(),
});
export const invitations = sqliteTable("mova_invitations", {
  token: text("token").primaryKey(),
  role: text("role").notNull(),
  name: text("name").notNull(),
  createdBy: text("created_by").notNull(),
  expires: integer("expires").notNull(),
  usedBy: text("used_by"),
  usedAt: integer("used_at"),
  nonce: text("nonce"),
});
export const meta = sqliteTable("mova_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
