/** biome-ignore-all lint/style/noProcessEnv: env config */
import { defineConfig } from 'drizzle-kit'
const config = defineConfig({
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://uniclaw:uniclaw@localhost:5433/uniclaw'
  },
  dialect: 'postgresql',
  out: './drizzle',
  schema: ['./packages/control-plane/src/db/auth-schema.ts', './packages/control-plane/src/db/schema.ts']
})
export default config
