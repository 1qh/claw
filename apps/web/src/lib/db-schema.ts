import { integer, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { user } from './auth-schema'
const gateways = pgTable('gateways', {
    agentCount: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    host: text().notNull(),
    id: text().primaryKey(),
    maxAgents: integer().notNull().default(10),
    port: integer().notNull(),
    status: text().notNull().default('active')
  }),
  userGateway = pgTable('user_gateway', {
    agentId: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    gatewayId: text()
      .notNull()
      .references(() => gateways.id),
    status: text().notNull().default('active'),
    userId: text()
      .notNull()
      .references(() => user.id),
    workspacePath: text().notNull()
  }),
  cache = pgTable('cache', {
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    key: text().primaryKey(),
    ttl: timestamp({ withTimezone: true }),
    value: jsonb()
  }),
  usageEvents = pgTable('usage_events', {
    costUsd: numeric(),
    gatewayId: text().references(() => gateways.id),
    id: text().primaryKey(),
    inputTokens: integer(),
    latencyMs: integer(),
    model: text(),
    outputTokens: integer(),
    provider: text(),
    taskType: text(),
    time: timestamp({ withTimezone: true }).notNull().defaultNow(),
    userId: text().references(() => user.id)
  }),
  chatMessages = pgTable('chat_messages', {
    content: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuid().primaryKey().defaultRandom(),
    role: text().notNull(),
    sessionKey: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id)
  }),
  tigerfsWorkspace = pgTable('_workspace', {
    body: text(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    encoding: text().notNull().default('utf8'),
    filename: text().notNull(),
    filetype: text().notNull().default('file'),
    headers: jsonb().default({}),
    id: uuid().primaryKey().defaultRandom(),
    modifiedAt: timestamp('modified_at', { withTimezone: true }).notNull().defaultNow()
  }),
  tigerfsState = pgTable('_state', {
    body: text(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    encoding: text().notNull().default('utf8'),
    filename: text().notNull(),
    filetype: text().notNull().default('file'),
    headers: jsonb().default({}),
    id: uuid().primaryKey().defaultRandom(),
    modifiedAt: timestamp('modified_at', { withTimezone: true }).notNull().defaultNow()
  })
export { cache, chatMessages, gateways, tigerfsState, tigerfsWorkspace, usageEvents, userGateway }
export { account, session, user, verification } from './auth-schema'
