/** biome-ignore-all lint/style/noProcessEnv: env config */
import { defineConfig } from 'drizzle-kit'
const config = defineConfig({
  casing: 'snake_case',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      (() => {
        throw new Error('DATABASE_URL is required')
      })()
  },
  dialect: 'postgresql',
  out: './drizzle',
  schema: ['./apps/web/src/lib/auth-schema.ts', './apps/web/src/lib/db-schema.ts'],
  tablesFilter: ['!_state', '!_state_history', '!_workspace', '!_workspace_history']
})
export default config
