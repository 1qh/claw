/* eslint-disable @eslint-react/web-api/no-leaked-event-listener */
import { useEffect, useState } from 'react'
const useAgentLogs = () => {
  const [logOutput, setLogOutput] = useState(''),
    [activity, setActivity] = useState('')
  useEffect(() => {
    const es = new EventSource('/api/events')
    es.addEventListener('message', e => {
      const data = JSON.parse(String(e.data)) as { event?: string; payload?: unknown; status?: string }
      setLogOutput(prev => `${prev}[${data.event ?? '?'}] ${JSON.stringify(data.payload, null, 2)}\n\n`)
      if (data.status) setActivity(data.status)
    })
    return () => {
      es.close()
    }
  }, [])
  return {
    activity,
    clearLogs: () => {
      setLogOutput('')
      setActivity('')
    },
    logOutput
  }
}
export { useAgentLogs }
