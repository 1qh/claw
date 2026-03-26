/** biome-ignore-all lint/style/noProcessEnv: env validation entrypoint */
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'
const env = createEnv({
  runtimeEnv: process.env,
  server: {
    AUTH_GOOGLE_ID: z.string().min(1),
    AUTH_GOOGLE_SECRET: z.string().min(1),
    DATABASE_URL: z.url(),
    GATEWAY_CONTAINER: z.string().min(1),
    GATEWAY_HOST: z.string().min(1),
    GATEWAY_PASSWORD: z.string().min(1),
    GATEWAY_PORT: z.string().min(1),
    OPENCLAW_MODEL: z.string().min(1),
    TIMESCALEDB_CONTAINER: z.string().min(1),
    VERBOSE_LOGS: z.enum(['true', 'false'])
  }
})
export { env }
