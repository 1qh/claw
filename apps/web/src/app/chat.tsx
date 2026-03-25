/* eslint-disable react/iframe-missing-sandbox, @eslint-react/dom/no-unsafe-iframe-sandbox */
'use client'
import type { UIMessage } from 'ai'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton
} from '@a/ui/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '@a/ui/ai-elements/message'
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from '@a/ui/ai-elements/prompt-input'
import { Shimmer } from '@a/ui/ai-elements/shimmer'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@a/ui/resizable'
import { SidebarInset, SidebarProvider } from '@a/ui/sidebar'
import { SparklesIcon } from 'lucide-react'
import { useState } from 'react'
import IDEPanel from './file-explorer'
import { useAgentLogs } from './hooks/use-agent-logs'
import { useChatSend } from './hooks/use-chat'
import { useSessions } from './hooks/use-sessions'
import SessionSidebar from './session-sidebar'
const emptyStateIcon = <SparklesIcon className='size-8' />,
  textOf = (m: UIMessage) => {
    let t = ''
    for (const p of m.parts) if (p.type === 'text') t += p.text
    return t
  },
  Chat = ({ userId, userName }: { userId: string; userName: string }) => {
    const [useVSCode, setUseVSCode] = useState(false),
      { logOutput, clearLogs } = useAgentLogs(),
      { loadSessions, messages, newChat, sessionKey, sessions, setMessages, switchSession } = useSessions(userId),
      { fileRefreshKey, isBusy, sendChat } = useChatSend({ loadSessions, messages, sessionKey, setMessages }),
      handleNewChat = () => {
        newChat()
        clearLogs()
      },
      handleSwitchSession = (entry: { firstMessage: string; sessionKey: string; updatedAt: string }) => {
        switchSession(entry)
        clearLogs()
      }
    return (
      <SidebarProvider>
        <SidebarInset className='h-svh'>
          <ResizablePanelGroup orientation='horizontal'>
            <ResizablePanel defaultSize={50} minSize={20}>
              {useVSCode ? (
                <iframe
                  className='h-full w-full border-none'
                  sandbox='allow-same-origin allow-scripts allow-popups allow-forms'
                  src='http://localhost:3333'
                  title='VS Code'
                />
              ) : (
                <IDEPanel isBusy={isBusy} logOutput={logOutput} onClearLogs={clearLogs} refreshKey={fileRefreshKey} />
              )}
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel className='!overflow-hidden' defaultSize={50} minSize={25}>
              <div className='grid h-full grid-rows-[1fr_auto] overflow-hidden'>
                <Conversation className='min-h-0 overflow-hidden'>
                  <ConversationContent>
                    {messages.length === 0 ? (
                      <ConversationEmptyState
                        description='Send a message to start chatting with the agent'
                        icon={emptyStateIcon}
                        title='Uniclaw Agent'
                      />
                    ) : null}
                    {messages.map(m => (
                      <Message from={m.role} key={m.id}>
                        <MessageContent>
                          {m.role === 'user' ? textOf(m) : <MessageResponse>{textOf(m)}</MessageResponse>}
                        </MessageContent>
                      </Message>
                    ))}
                    {isBusy && messages.at(-1)?.role !== 'assistant' ? (
                      <Message from='assistant'>
                        <MessageContent>
                          <Shimmer as='p'>Thinking...</Shimmer>
                        </MessageContent>
                      </Message>
                    ) : null}
                  </ConversationContent>
                  <ConversationScrollButton />
                </Conversation>
                <PromptInput className='p-2' onSubmit={({ text }) => sendChat(text)}>
                  <PromptInputTextarea disabled={isBusy} placeholder='Ask anything...' />
                  <PromptInputFooter>
                    <div />
                    <PromptInputSubmit status={isBusy ? 'streaming' : 'ready'} />
                  </PromptInputFooter>
                </PromptInput>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </SidebarInset>
        <SessionSidebar
          activeSessionKey={sessionKey}
          onNewChat={handleNewChat}
          onSwitchSession={handleSwitchSession}
          onToggleEditor={() => setUseVSCode(v => !v)}
          sessions={sessions}
          useMonaco={useVSCode}
          userName={userName}
        />
      </SidebarProvider>
    )
  }
export default Chat
