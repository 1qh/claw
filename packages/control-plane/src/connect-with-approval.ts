/** biome-ignore-all lint/performance/noAwaitInLoops: retry loop */
/* eslint-disable no-await-in-loop */
import { exec } from 'node:child_process'
import type { GatewayConnection } from './connect'
import { connectToGateway } from './connect'
const sleep = async (ms: number) =>
    new Promise<void>(resolve => {
      setTimeout(resolve, ms)
    }),
  approveDevice = async () =>
    new Promise<void>(resolve => {
      exec('docker exec -e OPENCLAW_STATE_DIR=/mnt/tigerfs/state claw-gateway-1 openclaw devices approve', () => resolve())
    }),
  connectWithApproval = async (opts: {
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
        await approveDevice()
        await sleep(500)
      }
    return connectToGateway(opts)
  }
export { connectWithApproval }
