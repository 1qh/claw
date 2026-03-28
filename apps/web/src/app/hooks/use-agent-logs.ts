/* eslint-disable @eslint-react/web-api/no-leaked-event-listener */
import { useEffect, useState } from 'react'
import { stringify } from 'yaml'
const useAgentLogs = () => {
  const [logOutput, setLogOutput] = useState(''),
    [activity, setActivity] = useState('')
  useEffect(() => {
    const es = new EventSource('/api/events')
    es.addEventListener('message', e => {
      const data = JSON.parse(String(e.data)) as { event?: string; payload?: unknown; status?: string }
      setLogOutput(prev => `${prev}# ${data.event ?? '?'}\n${stringify(data.payload)}---\n`)
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
