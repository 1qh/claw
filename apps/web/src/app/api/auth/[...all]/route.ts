import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '~/lib/auth'
const { DELETE, GET, PATCH, POST, PUT } = toNextJsHandler(auth)
export { DELETE, GET, PATCH, POST, PUT }
