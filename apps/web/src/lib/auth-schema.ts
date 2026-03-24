import { relations } from 'drizzle-orm'
import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
const user = pgTable('user', {
    createdAt: timestamp('created_at').defaultNow().notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    id: text('id').primaryKey(),
    image: text('image'),
    name: text('name').notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull()
  }),
  session = pgTable(
    'session',
    {
      createdAt: timestamp('created_at').defaultNow().notNull(),
      expiresAt: timestamp('expires_at').notNull(),
      id: text('id').primaryKey(),
      ipAddress: text('ip_address'),
      token: text('token').notNull().unique(),
      updatedAt: timestamp('updated_at')
        .$onUpdate(() => new Date())
        .notNull(),
      userAgent: text('user_agent'),
      userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' })
    },
    t => [index('session_userId_idx').on(t.userId)]
  ),
  account = pgTable(
    'account',
    {
      accessToken: text('access_token'),
      accessTokenExpiresAt: timestamp('access_token_expires_at'),
      accountId: text('account_id').notNull(),
      createdAt: timestamp('created_at').defaultNow().notNull(),
      id: text('id').primaryKey(),
      idToken: text('id_token'),
      password: text('password'),
      providerId: text('provider_id').notNull(),
      refreshToken: text('refresh_token'),
      refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
      scope: text('scope'),
      updatedAt: timestamp('updated_at')
        .$onUpdate(() => new Date())
        .notNull(),
      userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' })
    },
    t => [index('account_userId_idx').on(t.userId)]
  ),
  verification = pgTable(
    'verification',
    {
      createdAt: timestamp('created_at').defaultNow().notNull(),
      expiresAt: timestamp('expires_at').notNull(),
      id: text('id').primaryKey(),
      identifier: text('identifier').notNull(),
      updatedAt: timestamp('updated_at')
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
      value: text('value').notNull()
    },
    t => [index('verification_identifier_idx').on(t.identifier)]
  ),
  userRelations = relations(user, ({ many }) => ({
    accounts: many(account),
    sessions: many(session)
  })),
  sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
      fields: [session.userId],
      references: [user.id]
    })
  })),
  accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
      fields: [account.userId],
      references: [user.id]
    })
  }))
export { account, accountRelations, session, sessionRelations, user, userRelations, verification }
