/* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
/* oxlint-disable promise/prefer-await-to-then */
import type { UIMessage } from 'ai'
import { useCallback, useEffect, useState } from 'react'
import type { SessionEntry } from '../session-sidebar'
import { api } from './api'
const toUiMessages = (data: { content: string; role: string }[], prefix: string): UIMessage[] =>
    data.map((m, i) => ({
      id: `${prefix}-${String(i)}`,
      parts: [{ text: m.content, type: 'text' as const }],
      role: m.role as 'assistant' | 'user'
    })),
  useSessions = (userId: string) => {
    const [sessions, setSessions] = useState<SessionEntry[]>([]),
      [sessionKey, setSessionKey] = useState(() => {
        const params = new URLSearchParams(globalThis.location.search)
        return params.get('s') ?? `agent:main:${userId}-${Date.now()}`
      }),
      [messages, setMessages] = useState<UIMessage[]>([]),
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
    return { loadSessions, messages, newChat, sessionKey, sessions, setMessages, switchSession }
  }
export { useSessions }
