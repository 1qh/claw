'use client'
import { Terminal, TerminalContent, TerminalHeader, TerminalTitle } from '@a/ui/ai-elements/terminal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@a/ui/tabs'
import FileExplorer from './file-explorer'
const RightPanel = ({
  isBusy,
  logOutput,
  onClearLogs,
  refreshKey
}: {
  isBusy: boolean
  logOutput: string
  onClearLogs: () => void
  refreshKey: number
}) => (
  <Tabs className='flex h-full flex-col' defaultValue='files'>
    <TabsList className='w-full justify-start rounded-none border-b bg-transparent px-2'>
      <TabsTrigger value='files'>Files</TabsTrigger>
      <TabsTrigger value='logs'>Logs</TabsTrigger>
    </TabsList>
    <TabsContent className='flex-1 overflow-hidden' value='files'>
      <FileExplorer refreshKey={refreshKey} />
    </TabsContent>
    <TabsContent className='flex-1 overflow-hidden' value='logs'>
      <Terminal
        className='flex h-full flex-col rounded-none border-0'
        isStreaming={isBusy}
        onClear={onClearLogs}
        output={logOutput}>
        <TerminalHeader>
          <TerminalTitle>Agent Logs</TerminalTitle>
        </TerminalHeader>
        <TerminalContent className='max-h-none flex-1' />
      </Terminal>
    </TabsContent>
  </Tabs>
)
export default RightPanel
