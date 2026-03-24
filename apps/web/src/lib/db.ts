/** biome-ignore-all lint/performance/noNamespaceImport: drizzle requires namespace import */
/* oxlint-disable import/no-namespace */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './db-schema'
import { env } from './env'
const client = postgres(env.DATABASE_URL),
  db = drizzle(client, { casing: 'snake_case', schema })
export { db }
