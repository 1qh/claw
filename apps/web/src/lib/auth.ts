import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db'
import { env } from './env'
const normalizeEmail = (email: string): string => {
    const [local, domain] = email.toLowerCase().split('@')
    if (!(local && domain)) return email.toLowerCase()
    const stripped = local.split('+')[0]
    return `${stripped}@${domain}`
  },
  auth = betterAuth({
    database: drizzleAdapter(db, { provider: 'pg' }),
    databaseHooks: {
      user: {
        create: {
          before: user => ({
            data: { ...user, email: normalizeEmail(user.email) }
          })
        }
      }
    },
    emailAndPassword: { enabled: true },
    socialProviders: {
      google: { clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET }
    }
  })
export { auth }
