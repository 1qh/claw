/* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
/* oxlint-disable promise/prefer-await-to-then, promise/always-return */
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
        (text: string) => {
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
            { id: assistantId, parts: [{ text: '', type: 'text' as const }], role: 'assistant' as const }
          ])
          api
            .post('api/chat', { json: { messages: allMessages, sessionKey }, timeout: 90_000 })
            .text()
            .then(responseText => {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, parts: [{ text: responseText || 'No response from agent', type: 'text' as const }] }
                    : m
                )
              )
              setIsBusy(false)
              loadSessions()
              setFileRefreshKey(k => k + 1)
            })
            .catch(() => {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, parts: [{ text: 'Failed to get response. Please try again.', type: 'text' as const }] }
                    : m
                )
              )
              setIsBusy(false)
            })
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
