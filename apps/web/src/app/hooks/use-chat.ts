/* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect, no-await-in-loop, @typescript-eslint/no-loop-func */
/* oxlint-disable promise/prefer-await-to-then, promise/always-return */
/** biome-ignore-all lint/performance/noAwaitInLoops: sequential stream read */
import type { TextUIPart, UIMessage } from 'ai'
import { useCallback, useEffect, useState } from 'react'
import type { SessionEntry } from '../session-sidebar'
import { api } from './api'
const textPart = (text: string): TextUIPart => ({ text, type: 'text' }),
  toUiMessages = (data: { content: string; role: string }[], prefix: string): UIMessage[] =>
    data.map((m, i) => ({
      id: `${prefix}-${String(i)}`,
      parts: [textPart(m.content)],
      role: m.role as 'assistant' | 'user'
    })),
  updateAssistantText = (prev: UIMessage[], id: string, text: string): UIMessage[] =>
    prev.map(m => (m.id === id ? { ...m, parts: [textPart(text)] } : m)),
  useChatSession = (userId: string) => {
    const [sessionKey, setSessionKey] = useState(() => {
        const params = new URLSearchParams(globalThis.location.search)
        return params.get('s') ?? `agent:main:${userId}-${Date.now()}`
      }),
      [sessions, setSessions] = useState<SessionEntry[]>([]),
      [messages, setMessages] = useState<UIMessage[]>([]),
      [isBusy, setIsBusy] = useState(false),
      [fileRefreshKey, setFileRefreshKey] = useState(0),
      loadSessions = useCallback(() => {
        api
          .get('api/sessions')
          .json<SessionEntry[]>()
          .then(setSessions)
          .catch(() => undefined)
      }, []),
      loadMessages = useCallback((key: string) => {
        api
          .get(`api/sessions/${encodeURIComponent(key)}/messages`)
          .json<{ content: string; role: string }[]>()
          .then(data => setMessages(toUiMessages(data, key)))
          .catch(() => setMessages([]))
      }, []),
      sendChat = useCallback(
        async (text: string) => {
          if (!text.trim() || isBusy) return
          setIsBusy(true)
          globalThis.history.replaceState(null, '', `/?s=${encodeURIComponent(sessionKey)}`)
          const userMsg: UIMessage = {
              id: `user-${Date.now()}`,
              parts: [{ text, type: 'text' }],
              role: 'user'
            },
            assistantId = `assistant-${Date.now()}`,
            allMessages = [...messages, userMsg].map(m => ({
              content: m.parts
                .filter(p => p.type === 'text')
                .map(p => ('text' in p ? p.text : ''))
                .join(''),
              role: m.role
            }))
          setMessages(prev => [
            ...prev,
            userMsg,
            { id: assistantId, parts: [textPart('')], role: 'assistant' } satisfies UIMessage
          ])
          try {
            const res = await fetch('/api/chat', {
              body: JSON.stringify({ messages: allMessages, sessionKey }),
              credentials: 'include',
              headers: { 'content-type': 'application/json' },
              method: 'POST',
              signal: AbortSignal.timeout(90_000)
            })
            if (!res.ok) throw new Error(String(res.status))
            const reader = res.body?.getReader(),
              decoder = new TextDecoder()
            let accumulated = ''
            if (reader)
              for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
                accumulated += decoder.decode(chunk.value, { stream: true })
                setMessages(prev => updateAssistantText(prev, assistantId, accumulated))
              }
            if (!accumulated) setMessages(prev => updateAssistantText(prev, assistantId, 'No response from agent'))
            loadSessions()
            setFileRefreshKey(k => k + 1)
          } catch {
            setMessages(prev => updateAssistantText(prev, assistantId, 'Failed to get response. Please try again.'))
          }
          setIsBusy(false)
        },
        [isBusy, sessionKey, messages, loadSessions]
      ),
      switchSession = useCallback(
        (entry: SessionEntry) => {
          setSessionKey(entry.sessionKey)
          globalThis.history.pushState(null, '', `/?s=${encodeURIComponent(entry.sessionKey)}`)
          loadMessages(entry.sessionKey)
        },
        [loadMessages]
      ),
      newChat = useCallback(() => {
        const key = `agent:main:${userId}-${Date.now()}`
        setSessionKey(key)
        setMessages([])
        globalThis.history.pushState(null, '', '/')
      }, [userId])
    useEffect(() => {
      loadSessions()
      const params = new URLSearchParams(globalThis.location.search),
        s = params.get('s')
      if (s) loadMessages(s)
    }, [loadSessions, loadMessages])
    return { fileRefreshKey, isBusy, messages, newChat, sendChat, sessionKey, sessions, switchSession }
  }
export { useChatSession }
