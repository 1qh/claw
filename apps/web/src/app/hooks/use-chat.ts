/* eslint-disable react-hooks/refs, @typescript-eslint/no-unsafe-call */
/* oxlint-disable promise/prefer-await-to-then */
import { useChat } from '@ai-sdk/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SessionEntry } from '../session-sidebar'
import { api } from './api'
const toUiMessages = (data: { content: string; role: string }[], prefix: string) =>
    data.map((m, i) => ({
      id: `${prefix}-${String(i)}`,
      parts: [{ text: m.content, type: 'text' as const }],
      role: m.role as 'assistant' | 'user'
    })),
  useChatSession = (userId: string) => {
    const [sessionKey, setSessionKey] = useState(() => {
        const params = new URLSearchParams(globalThis.location.search)
        return params.get('s') ?? `agent:main:${userId}-${Date.now()}`
      }),
      [sessions, setSessions] = useState<SessionEntry[]>([]),
      [fileRefreshKey, setFileRefreshKey] = useState(0),
      onFinishRef = useRef<() => void>(() => undefined),
      { append, messages, setMessages, status } = useChat({
        api: '/api/chat',
        body: { sessionKey },
        onFinish: () => onFinishRef.current()
      }),
      isBusy = status === 'streaming' || status === 'submitted',
      loadSessions = useCallback(() => {
        api
          .get('api/sessions')
          .json<SessionEntry[]>()
          .then(setSessions)
          .catch(() => undefined)
      }, []),
      loadMessages = useCallback(
        (key: string) => {
          api
            .get(`api/sessions/${encodeURIComponent(key)}/messages`)
            .json<{ content: string; role: string }[]>()
            .then(data => setMessages(toUiMessages(data, key)))
            .catch(() => setMessages([]))
        },
        [setMessages]
      ),
      sendChat = useCallback(
        (text: string) => {
          if (!text.trim() || isBusy) return
          globalThis.history.replaceState(null, '', `/?s=${encodeURIComponent(sessionKey)}`)
          append({ content: text, role: 'user' })
        },
        [append, isBusy, sessionKey]
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
      }, [userId, setMessages])
    onFinishRef.current = () => {
      loadSessions()
      setFileRefreshKey(k => k + 1)
    }
    useEffect(() => {
      loadSessions()
      const params = new URLSearchParams(globalThis.location.search),
        s = params.get('s')
      if (s) loadMessages(s)
    }, [loadSessions, loadMessages])
    return { fileRefreshKey, isBusy, messages, newChat, sendChat, sessionKey, sessions, switchSession }
  }
export { useChatSession }
