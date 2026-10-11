import {sqliteTable,text,primaryKey} from 'drizzle-orm/sqlite-core';
export const favorites=sqliteTable('favorites',{userId:text('user_id').notNull(),propId:text('prop_id').notNull(),createdAt:text('created_at').notNull()},t=>[primaryKey({columns:[t.userId,t.propId]})]);
export const providerCache=sqliteTable('provider_cache',{key:text('key').primaryKey(),payload:text('payload').notNull(),expiresAt:text('expires_at').notNull()});
