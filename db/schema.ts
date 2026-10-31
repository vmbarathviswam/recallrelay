import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
// One atomic aggregate keeps approvals, capture reservations and the journal consistent.
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(), revision: integer('revision').notNull(),
  snapshot: text('snapshot').notNull(), updatedAt: integer('updated_at').notNull(),
});
export const webhookInbox = sqliteTable('webhook_inbox', {
  id: text('id').primaryKey(), payload: text('payload').notNull(),
  status: text('status').notNull(), receivedAt: integer('received_at').notNull(),
});
