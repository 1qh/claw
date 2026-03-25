/** biome-ignore-all lint/suspicious/useAwait: lintmax adds async to then callbacks */
/** biome-ignore-all lint/nursery/noNestedPromises: streaming pump pattern */
/* oxlint-disable promise/prefer-await-to-then, promise/always-return, promise/no-nesting */
import type { UIMessage } from 'ai'
import { useCallback, useState } from 'react'
import { api } from './api'
const useChatSend = ({
  loadSessions,
  messages,
  sessionKey,
  setMessages
}: {
  loadSessions: () => void
  messages: UIMessage[]
  sessionKey: string
  setMessages: React.Dispatch<React.SetStateAction<UIMessage[]>>
}) => {
  const [isBusy, setIsBusy] = useState(false),
    [fileRefreshKey, setFileRefreshKey] = useState(0),
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
          allMessages = [...messages, userMsg].map(m => ({
            parts: m.parts.filter(p => p.type === 'text').map(p => ({ text: 'text' in p ? p.text : '', type: 'text' })),
            role: m.role
          }))
        setMessages(prev => [...prev, userMsg])
        const assistantId = `assistant-${Date.now()}`
        setMessages(prev => [
          ...prev,
          { id: assistantId, parts: [{ text: '', type: 'text' as const }], role: 'assistant' as const }
        ])
        api
          .post('api/chat', { json: { messages: allMessages, sessionKey } })
          .then(async res => {
            if (!res.body) throw new Error('No response body')
            const reader = res.body.getReader(),
              decoder = new TextDecoder()
            let accumulated = ''
            const pump = async (): Promise<void> =>
              reader.read().then(async ({ done, value }) => {
                if (done) {
                  setIsBusy(false)
                  loadSessions()
                  setFileRefreshKey(k => k + 1)
                  return
                }
                accumulated += decoder.decode(value, { stream: true })
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantId ? { ...m, parts: [{ text: accumulated, type: 'text' as const }] } : m
                  )
                )
                return pump()
              })
            return pump()
          })
          .catch(() => {
            setIsBusy(false)
          })
      },
      [isBusy, sessionKey, loadSessions, messages, setMessages]
    )
  return { fileRefreshKey, isBusy, sendChat }
}
export { useChatSend }
