/* eslint-disable @typescript-eslint/no-deprecated, @typescript-eslint/strict-void-return, @eslint-react/web-api/no-leaked-event-listener */
/* oxlint-disable promise/prefer-await-to-then */
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
import { Terminal, TerminalContent, TerminalHeader, TerminalTitle } from '@a/ui/ai-elements/terminal'
import { Button } from '@a/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@a/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@a/ui/dropdown-menu'
import { Input } from '@a/ui/input'
import { Label } from '@a/ui/label'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@a/ui/resizable'
import { Separator } from '@a/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from '@a/ui/sidebar'
import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport } from 'ai'
import { ChevronUpIcon, LogOutIcon, LogsIcon, MessageCircleIcon, MessageSquarePlusIcon, SparklesIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useState } from 'react'
import { authClient } from '~/lib/auth-client'
const chatTransport = new TextStreamChatTransport({ api: '/api/chat', credentials: 'include' })
interface SessionEntry {
  key: string
  sessionId: string
  updatedAt: number
}
const emptyStateIcon = <SparklesIcon className='size-8' />,
  textOf = (m: UIMessage) => {
    let t = ''
    for (const p of m.parts) if (p.type === 'text') t += p.text
    return t
  },
  signInGoogle = async () => {
    await authClient.signIn.social({ callbackURL: '/', provider: 'google' })
  },
  signOut = async () => {
    await authClient.signOut()
    globalThis.location.reload()
  },
  AuthForm = () => {
    const [mode, setMode] = useState<'login' | 'signup'>('signup'),
      [email, setEmail] = useState(''),
      [password, setPassword] = useState(''),
      [name, setName] = useState(''),
      [authError, setAuthError] = useState(''),
      [loading, setLoading] = useState(false),
      formId = useId(),
      submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setAuthError('')
        setLoading(true)
        if (mode === 'signup') {
          const { error } = await authClient.signUp.email({ email, name, password })
          if (error) {
            setAuthError(error.message ?? 'Sign up failed')
            setLoading(false)
          }
        } else {
          const { error } = await authClient.signIn.email({ email, password })
          if (error) {
            setAuthError(error.message ?? 'Sign in failed')
            setLoading(false)
          }
        }
      }
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <Card className='w-96'>
          <CardHeader>
            <CardTitle className='text-2xl'>Uniclaw</CardTitle>
            <CardDescription>
              {mode === 'signup' ? 'Create an account to get started' : 'Sign in to your account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className='flex flex-col gap-4' onSubmit={submit}>
              {mode === 'signup' && (
                <div className='flex flex-col gap-2'>
                  <Label htmlFor={`${formId}-name`}>Name</Label>
                  <Input
                    id={`${formId}-name`}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    placeholder='Your name'
                    required
                    value={name}
                  />
                </div>
              )}
              <div className='flex flex-col gap-2'>
                <Label htmlFor={`${formId}-email`}>Email</Label>
                <Input
                  id={`${formId}-email`}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  placeholder='you@example.com'
                  required
                  type='email'
                  value={email}
                />
              </div>
              <div className='flex flex-col gap-2'>
                <Label htmlFor={`${formId}-password`}>Password</Label>
                <Input
                  id={`${formId}-password`}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  placeholder='Password'
                  required
                  type='password'
                  value={password}
                />
              </div>
              {authError ? <p className='text-sm text-destructive'>{authError}</p> : null}
              <Button disabled={loading} type='submit'>
                {loading ? 'Loading...' : mode === 'signup' ? 'Sign Up' : 'Sign In'}
              </Button>
              <Separator />
              <Button className='gap-2' disabled={loading} onClick={signInGoogle} type='button' variant='outline'>
                Continue with Google
              </Button>
              <button
                className='text-sm text-muted-foreground hover:text-foreground'
                onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
                type='button'>
                {mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  },
  Chat = ({ userName }: { userName: string }) => {
    const [logOutput, setLogOutput] = useState(''),
      [showLogs, setShowLogs] = useState(true),
      [sessions, setSessions] = useState<SessionEntry[]>([]),
      [activeSessionKey, setActiveSessionKey] = useState(() => `agent:main:new-${Date.now()}`),
      [activeSessionId, setActiveSessionId] = useState<null | string>(null),
      { sendMessage, messages, status, stop, setMessages } = useChat({ transport: chatTransport }),
      isBusy = status === 'streaming' || status === 'submitted',
      loadSessions = useCallback(() => {
        fetch('/api/sessions', { credentials: 'include' })
          .then(async res => res.json() as Promise<SessionEntry[]>)
          .then(setSessions)
          .catch(() => undefined)
      }, []),
      switchSession = useCallback(
        (entry: SessionEntry) => {
          setActiveSessionKey(entry.key)
          setActiveSessionId(entry.sessionId)
          fetch(`/api/sessions/${entry.sessionId}/messages`, { credentials: 'include' })
            .then(async res => res.json() as Promise<{ content: string; role: string }[]>)
            .then(data =>
              setMessages(
                data.map((m, i) => ({
                  id: `${entry.sessionId}-${String(i)}`,
                  parts: [{ text: m.content, type: 'text' as const }],
                  role: m.role as 'assistant' | 'user'
                }))
              )
            )
            .catch(() => setMessages([]))
        },
        [setMessages]
      ),
      newChat = useCallback(() => {
        setActiveSessionKey(`agent:main:new-${Date.now()}`)
        setActiveSessionId(null)
        setMessages([])
      }, [setMessages])
    useEffect(() => {
      loadSessions()
    }, [loadSessions])
    useEffect(() => {
      if (status === 'ready' && messages.length > 0) loadSessions()
    }, [status, messages.length, loadSessions])
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
    const handleSubmit = ({ text }: { text: string }) => {
      if (!text.trim() || isBusy) return
      sendMessage({
        body: { sessionKey: activeSessionKey },
        parts: [{ text, type: 'text' }],
        role: 'user'
      })
    }
    return (
      <SidebarProvider>
        <Sidebar collapsible='icon' side='left'>
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={newChat}>
                  <MessageSquarePlusIcon className='size-4' />
                  <span>New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent className='overflow-y-auto px-2'>
            <SidebarMenu>
              {sessions.map(s => (
                <SidebarMenuItem key={s.key}>
                  <SidebarMenuButton
                    isActive={s.key === activeSessionKey || s.sessionId === activeSessionId}
                    onClick={() => switchSession(s)}>
                    <MessageCircleIcon className='size-4' />
                    <span className='truncate text-xs'>{s.key.replace('agent:main:', '').slice(0, 20)}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton>
                      <SparklesIcon className='size-4' />
                      <span className='truncate'>{userName}</span>
                      <ChevronUpIcon className='ml-auto size-4' />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='start' className='w-56' side='top'>
                    <DropdownMenuItem onClick={() => setShowLogs(p => !p)}>
                      <LogsIcon className='mr-2 size-4' />
                      {showLogs ? 'Hide' : 'Show'} Agent Logs
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={signOut}>
                      <LogOutIcon className='mr-2 size-4' />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className='h-screen'>
          <ResizablePanelGroup direction='horizontal'>
            <ResizablePanel defaultSize={showLogs ? 65 : 100} minSize={30}>
              <div className='flex h-full flex-col'>
                <Conversation className='flex-1'>
                  <SidebarTrigger className='absolute left-2 top-2 z-10' />
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
                <PromptInput className='mx-auto max-w-3xl p-4' onSubmit={handleSubmit}>
                  <PromptInputTextarea disabled={isBusy} placeholder='Ask anything...' />
                  <PromptInputFooter>
                    <div />
                    <PromptInputSubmit onClick={isBusy ? stop : undefined} status={isBusy ? 'streaming' : 'ready'} />
                  </PromptInputFooter>
                </PromptInput>
              </div>
            </ResizablePanel>
            {showLogs ? (
              <>
                <ResizableHandle />
                <ResizablePanel defaultSize={35} minSize={20}>
                  <Terminal
                    className='flex h-full flex-col rounded-none border-0'
                    isStreaming={isBusy}
                    onClear={() => setLogOutput('')}
                    output={logOutput}>
                    <TerminalHeader>
                      <TerminalTitle>Agent Logs</TerminalTitle>
                    </TerminalHeader>
                    <TerminalContent className='max-h-none flex-1' />
                  </Terminal>
                </ResizablePanel>
              </>
            ) : null}
          </ResizablePanelGroup>
        </SidebarInset>
      </SidebarProvider>
    )
  },
  Page = () => {
    const { data: session, isPending } = authClient.useSession()
    if (isPending)
      return (
        <div className='flex min-h-screen items-center justify-center'>
          <p className='text-muted-foreground'>Loading...</p>
        </div>
      )
    if (!session) return <AuthForm />
    return <Chat userName={session.user.name} />
  }
export default Page
