/** biome-ignore-all lint/style/noProcessEnv: env config */
import { createEnv } from '@t3-oss/env-nextjs'
import { string } from 'zod/v4'

const env = createEnv({
  experimental__runtimeEnv: {},
  server: {
    E2B_API_KEY: string().startsWith('e2b_'),
    WS_PORT: string().default('3001'),
  },
  skipValidation: Boolean(process.env.CI),
})

export { env }
