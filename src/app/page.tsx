'use client'

import { useCallback, useState } from 'react'
import { TerminalView } from '~/components/terminal'

type Agent = 'codex' | 'pi'

const WS_PORT = 3001

const Page = () => {
  const [agent, setAgent] = useState<Agent>('pi')
  const [connected, setConnected] = useState(false)
  const [wsUrl, setWsUrl] = useState('')

  const connect = useCallback(() => {
    const token = prompt(
      agent === 'pi'
        ? 'Paste your Anthropic OAuth access token:'
        : 'Paste your Codex auth.json content:'
    )
    if (!token) return
    const url = `ws://localhost:${String(WS_PORT)}/terminal?agent=${agent}&token=${encodeURIComponent(token)}`
    setWsUrl(url)
    setConnected(true)
  }, [agent])

  if (connected && wsUrl)
    return (
      <div className='flex h-screen flex-col'>
        <div className='flex items-center gap-2 border-b border-border px-4 py-2'>
          <span className='text-sm font-medium'>Claw</span>
          <span className='text-xs text-muted-foreground'>
            {agent === 'pi' ? 'Pi (Claude Haiku)' : 'Codex (GPT 5.4)'}
          </span>
          <button
            className='ml-auto text-xs text-muted-foreground hover:text-foreground'
            onClick={() => {
              setConnected(false)
              setWsUrl('')
            }}
            type='button'>
            Disconnect
          </button>
        </div>
        <div className='flex-1'>
          <TerminalView wsUrl={wsUrl} />
        </div>
      </div>
    )

  return (
    <div className='flex h-screen items-center justify-center'>
      <div className='flex flex-col items-center gap-6'>
        <h1 className='text-2xl font-bold'>Claw</h1>
        <div className='flex gap-2'>
          <button
            className={`rounded-md px-4 py-2 text-sm ${agent === 'pi' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            onClick={() => setAgent('pi')}
            type='button'>
            Pi (Claude)
          </button>
          <button
            className={`rounded-md px-4 py-2 text-sm ${agent === 'codex' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            onClick={() => setAgent('codex')}
            type='button'>
            Codex (GPT)
          </button>
        </div>
        <button
          className='rounded-md bg-primary px-6 py-2 text-sm text-primary-foreground hover:opacity-90'
          onClick={connect}
          type='button'>
          Connect
        </button>
      </div>
    </div>
  )
}

export default Page
