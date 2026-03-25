/* eslint-disable @eslint-react/web-api/no-leaked-event-listener */
import { useEffect, useState } from 'react'
const useAgentLogs = () => {
  const [logOutput, setLogOutput] = useState('')
  useEffect(() => {
    const es = new EventSource('/api/events')
    es.addEventListener('message', e => {
      const data = JSON.parse(String(e.data)) as { formatted: string }
      setLogOutput(prev => `${prev}${data.formatted}\n`)
    })
    return () => {
      es.close()
    }
  }, [])
  return { clearLogs: () => setLogOutput(''), logOutput }
}
export { useAgentLogs }
