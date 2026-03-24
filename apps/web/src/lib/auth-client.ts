/** biome-ignore-all lint/style/noProcessEnv: env config */
import { createAuthClient } from 'better-auth/react'
const authClient = createAuthClient({
  baseURL: ''
})
export { authClient }
