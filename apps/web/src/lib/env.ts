/** biome-ignore-all lint/style/noProcessEnv: env validation entrypoint */
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'
const env = createEnv({
  runtimeEnv: process.env,
  server: {
    AUTH_GOOGLE_ID: z.string().min(1),
    AUTH_GOOGLE_SECRET: z.string().min(1),
    DATABASE_URL: z.url(),
    GATEWAY_HOST: z.string().default('localhost'),
    GATEWAY_PASSWORD: z.string().min(1),
    GATEWAY_PORT: z.string().default('18789'),
    OPENCLAW_MODEL: z.string().min(1),
    VERBOSE_LOGS: z.enum(['true', 'false']).default('false')
  }
})
export { env }
