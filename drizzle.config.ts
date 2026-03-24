/** biome-ignore-all lint/style/noProcessEnv: env config */
import { defineConfig } from 'drizzle-kit'
const config = defineConfig({
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://uniclaw:uniclaw@localhost:5433/uniclaw'
  },
  dialect: 'postgresql',
  out: './drizzle',
  schema: ['./apps/web/src/lib/auth-schema.ts', './apps/web/src/lib/db-schema.ts']
})
export default config
