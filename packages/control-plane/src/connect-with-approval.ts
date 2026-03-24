/** biome-ignore-all lint/performance/noAwaitInLoops: retry loop */
/* eslint-disable no-await-in-loop */
import { $, sleep } from 'bun'
import type { GatewayConnection } from './connect'
import { connectToGateway } from './connect'
const connectWithApproval = async (opts: {
  host?: string
  password: string
  port?: number
  retries?: number
}): Promise<GatewayConnection> => {
  const maxRetries = opts.retries ?? 3
  for (let attempt = 0; attempt < maxRetries; attempt += 1)
    try {
      return await connectToGateway(opts)
    } catch (connectError) {
      const msg = connectError instanceof Error ? connectError.message : ''
      if (!(msg.includes('PAIRING_REQUIRED') || msg.includes('NOT_PAIRED'))) throw connectError
      await $`docker exec claw-gateway-1 openclaw devices approve`.quiet().nothrow()
      await sleep(500)
    }
  return connectToGateway(opts)
}
export { connectWithApproval }
