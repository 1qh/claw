import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
const createApp = () => new Elysia().use(cors()).get('/health', () => ({ ok: true, status: 'live' }))
export { createApp }
