import { integer, jsonb, numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
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
    inputTokens: integer(),
    latencyMs: integer(),
    model: text(),
    outputTokens: integer(),
    provider: text(),
    taskType: text(),
    time: timestamp({ withTimezone: true }).notNull().defaultNow(),
    userId: text().references(() => user.id)
  })
export { cache, gateways, usageEvents, userGateway }
export { account, session, user, verification } from './auth-schema'
