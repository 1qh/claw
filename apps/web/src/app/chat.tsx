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
import IDEPanel from './file-explorer-monaco'
import { useAgentLogs } from './hooks/use-agent-logs'
import { useChatSession } from './hooks/use-chat'
import SessionSidebar from './session-sidebar'
const emptyStateIcon = <SparklesIcon className='size-8' />,
  textOf = (m: UIMessage) => {
    let t = ''
    for (const p of m.parts) if (p.type === 'text') t += p.text
    return t
  },
  Chat = ({ userId, userName }: { userId: string; userName: string }) => {
    const { activity, logOutput, clearLogs } = useAgentLogs(),
      { fileRefreshKey, isBusy, messages, newChat, sendChat, sessionKey, sessions, switchSession } =
        useChatSession(userId),
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
              <IDEPanel logOutput={logOutput} refreshKey={fileRefreshKey} />
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
                    {messages.map(m => {
                      const text = textOf(m)
                      if (m.role === 'user')
                        return (
                          <Message from='user' key={m.id}>
                            <MessageContent>{text}</MessageContent>
                          </Message>
                        )
                      if (isBusy && !text)
                        return (
                          <Message from='assistant' key={m.id}>
                            <MessageContent>
                              <Shimmer as='p'>{activity || 'Thinking'}</Shimmer>
                            </MessageContent>
                          </Message>
                        )
                      return (
                        <Message from='assistant' key={m.id}>
                          <MessageContent>
                            <MessageResponse>{text}</MessageResponse>
                          </MessageContent>
                        </Message>
                      )
                    })}
                  </ConversationContent>
                  <ConversationScrollButton />
                </Conversation>
                <PromptInput className='p-2' onSubmit={async ({ text }) => sendChat(text)}>
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
          sessions={sessions}
          userName={userName}
        />
      </SidebarProvider>
    )
  }
export default Chat
