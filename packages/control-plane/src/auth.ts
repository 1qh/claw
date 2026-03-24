/** biome-ignore-all lint/style/noProcessEnv: env config */
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db'
const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  database: drizzleAdapter(db, {
    provider: 'pg'
  }),
  emailAndPassword: {
    enabled: true
  },
  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret-change-in-production'
})
export { auth }
