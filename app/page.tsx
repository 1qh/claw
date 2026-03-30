'use client'
import { useState, useRef, useEffect } from 'react'

type Event =
  | { type: 'start' }
  | { type: 'end' }
  | { type: 'tool_start'; name: string; args: any }
  | { type: 'tool_end'; name: string; result: string; details?: string }
  | { type: 'text'; text: string }
  | { type: 'done' }
  | { type: 'error'; error: string }

export default function Page() {
  const [input, setInput] = useState('')
  const [events, setEvents] = useState<Event[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight)
  }, [events, text])

  const send = async () => {
    if (!input.trim() || busy) return
    const msg = input.trim()
    setInput('')
    setBusy(true)
    setEvents([])
    setText('')

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: msg })
    })

    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    let buf = ''

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const event = JSON.parse(line.slice(6)) as Event
          if (event.type === 'text') setText(event.text)
          else if (event.type === 'thinking') setEvents(prev => [...prev, event as any])
          else setEvents(prev => [...prev, event])
        }
      }
    }
    setBusy(false)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'monospace', background: '#111', color: '#eee' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #333' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #333', fontWeight: 'bold' }}>Chat</div>
        <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
          {text ? <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{text}</div> : <div style={{ color: '#666' }}>Send a message...</div>}
        </div>
        <div style={{ display: 'flex', padding: 8, gap: 8, borderTop: '1px solid #333' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask anything..."
            disabled={busy}
            style={{ flex: 1, padding: '8px 12px', background: '#222', border: '1px solid #444', borderRadius: 4, color: '#eee', outline: 'none' }}
          />
          <button onClick={send} disabled={busy} style={{ padding: '8px 16px', background: busy ? '#333' : '#555', border: 'none', borderRadius: 4, color: '#eee', cursor: busy ? 'default' : 'pointer' }}>
            {busy ? '...' : 'Send'}
          </button>
        </div>
      </div>
      <div style={{ width: 400, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #333', fontWeight: 'bold' }}>Live Feed</div>
        <div ref={logRef} style={{ flex: 1, padding: 16, overflow: 'auto', fontSize: 12, lineHeight: 1.8 }}>
          {events.map((e, i) => {
            switch (e.type) {
              case 'start': return <div key={i} style={{ color: '#4a4' }}>▶ Agent started</div>
              case 'end': return <div key={i} style={{ color: '#4a4' }}>⏹ Agent finished</div>
              case 'tool_start': return <div key={i} style={{ color: '#fa0' }}>🔧 {e.name} <span style={{ color: '#888' }}>{JSON.stringify(e.args)}</span></div>
              case 'tool_end': return <div key={i}><span style={{ color: '#4a4' }}>✅ {e.name}</span> <pre style={{ margin: '4px 0', padding: 8, background: '#1a1a1a', borderRadius: 4, whiteSpace: 'pre-wrap', fontSize: 11, color: '#aaa', maxHeight: 200, overflow: 'auto' }}>{e.result}</pre></div>
              case 'done': return <div key={i} style={{ color: '#666' }}>— done —</div>
              case 'error': return <div key={i} style={{ color: '#f44' }}>❌ {e.error}</div>
              default: return null
            }
          })}
        </div>
      </div>
    </div>
  )
}
