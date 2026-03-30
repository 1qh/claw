'use client'

import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { useEffect, useRef } from 'react'

const TerminalView = ({ wsUrl }: { wsUrl: string }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
      theme: {
        background: '#000000',
        cursor: '#e0e0e0',
        foreground: '#e0e0e0',
        selectionBackground: '#ffffff30',
      },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(el)
    fit.fit()

    const ws = new WebSocket(wsUrl)
    ws.binaryType = 'arraybuffer'

    ws.addEventListener('open', () => {
      term.writeln('\x1b[2m Connecting to sandbox...\x1b[0m')
    })

    ws.addEventListener('message', (e) => {
      if (e.data instanceof ArrayBuffer) term.write(new Uint8Array(e.data))
      else {
        try {
          const parsed = JSON.parse(String(e.data)) as { message?: string; type: string }
          if (parsed.type === 'status') term.writeln(`\x1b[2m ${parsed.message ?? ''}\x1b[0m`)
          else if (parsed.type === 'error') term.writeln(`\x1b[31m ${parsed.message ?? 'Error'}\x1b[0m`)
        } catch {
          term.write(String(e.data))
        }
      }
    })

    ws.addEventListener('close', () => {
      term.writeln('\x1b[2m Disconnected.\x1b[0m')
    })

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data)
    })

    term.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: 'resize', cols, rows }))
    })

    const observer = new ResizeObserver(() => fit.fit())
    observer.observe(el)

    return () => {
      observer.disconnect()
      ws.close()
      term.dispose()
    }
  }, [wsUrl])

  return <div ref={containerRef} className='h-full w-full' />
}

export { TerminalView }
