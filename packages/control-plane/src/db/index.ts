/** biome-ignore-all lint/style/noProcessEnv: env config */
/** biome-ignore-all lint/performance/noNamespaceImport: drizzle requires namespace import */
/* oxlint-disable import/no-namespace */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://uniclaw:uniclaw@localhost:5433/uniclaw',
  client = postgres(DATABASE_URL),
  db = drizzle(client, { casing: 'snake_case', schema })
export { db }
