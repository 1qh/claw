/** biome-ignore-all lint/suspicious/useAwait: lintmax adds async to then callbacks */
/** biome-ignore-all lint/nursery/noNestedPromises: streaming pump pattern */
/* eslint-disable @typescript-eslint/no-deprecated, @typescript-eslint/strict-void-return, @eslint-react/web-api/no-leaked-event-listener, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
/* oxlint-disable promise/prefer-await-to-then, promise/always-return, promise/no-nesting */
'use client'
import type { UIMessage } from 'ai'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton
} from '@a/ui/ai-elements/conversation'
import { FileTree, FileTreeFile, FileTreeFolder } from '@a/ui/ai-elements/file-tree'
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
import { ScrollArea } from '@a/ui/scroll-area'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@a/ui/tabs'
import { ChevronUpIcon, LogOutIcon, LogsIcon, MessageSquarePlusIcon, SparklesIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useState } from 'react'
import { authClient } from '~/lib/auth-client'
interface SessionEntry {
  firstMessage: string
  sessionKey: string
  updatedAt: string
}
interface TreeNode {
  children?: TreeNode[]
  name: string
  path: string
  type: 'directory' | 'file'
}
const emptyStateIcon = <SparklesIcon className='size-8' />,
  toUiMessages = (data: { content: string; role: string }[], prefix: string): UIMessage[] =>
    data.map((m, i) => ({
      id: `${prefix}-${String(i)}`,
      parts: [{ text: m.content, type: 'text' as const }],
      role: m.role as 'assistant' | 'user'
    })),
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
  renderNode = (node: TreeNode): React.ReactNode => {
    if (node.type === 'directory')
      return (
        <FileTreeFolder key={node.path} name={node.name} path={node.path}>
          {node.children?.map(renderNode)}
        </FileTreeFolder>
      )
    return <FileTreeFile key={node.path} name={node.name} path={node.path} />
  },
  FileExplorer = ({ refreshKey }: { refreshKey: number }) => {
    const [tree, setTree] = useState<TreeNode[]>([]),
      [selectedPath, setSelectedPath] = useState<null | string>(null),
      [fileContent, setFileContent] = useState('')
    useEffect(() => {
      const key = refreshKey
      fetch(`/api/files?v=${String(key)}`, { credentials: 'include' })
        .then(async res => res.json() as Promise<TreeNode[]>)
        .then(setTree)
        .catch(() => undefined)
    }, [refreshKey])
    useEffect(() => {
      if (!selectedPath) return
      fetch(`/api/files/${selectedPath}`, { credentials: 'include' })
        .then(async res => (res.ok ? res.text() : ''))
        .then(setFileContent)
        .catch(() => setFileContent(''))
    }, [selectedPath])
    return (
      <div className='flex h-full flex-col'>
        {selectedPath ? (
          <>
            <div className='flex items-center gap-2 border-b px-3 py-1.5'>
              <button
                className='text-xs text-muted-foreground hover:text-foreground'
                onClick={() => setSelectedPath(null)}
                type='button'>
                ←
              </button>
              <span className='truncate text-xs text-muted-foreground'>{selectedPath}</span>
            </div>
            <ScrollArea className='flex-1'>
              <pre className='p-3 text-xs'>{fileContent}</pre>
            </ScrollArea>
          </>
        ) : (
          <ScrollArea className='flex-1 p-2'>
            <FileTree className='border-0' onSelect={setSelectedPath} selectedPath={selectedPath ?? undefined}>
              {tree.map(renderNode)}
            </FileTree>
          </ScrollArea>
        )}
      </div>
    )
  },
  RightPanel = ({
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
  ),
  Chat = ({ userId, userName }: { userId: string; userName: string }) => {
    const [logOutput, setLogOutput] = useState(''),
      [showPanel, setShowPanel] = useState(true),
      [sessions, setSessions] = useState<SessionEntry[]>([]),
      [sessionKey, setSessionKey] = useState(() => {
        const params = new URLSearchParams(globalThis.location.search)
        return params.get('s') ?? `agent:main:${userId}-${Date.now()}`
      }),
      [messages, setMessages] = useState<UIMessage[]>([]),
      [isBusy, setIsBusy] = useState(false),
      [fileRefreshKey, setFileRefreshKey] = useState(0),
      loadSessions = useCallback(() => {
        fetch('/api/sessions', { credentials: 'include' })
          .then(async res => res.json() as Promise<SessionEntry[]>)
          .then(setSessions)
          .catch(() => undefined)
      }, []),
      loadMessages = useCallback((key: string) => {
        fetch(`/api/sessions/${encodeURIComponent(key)}/messages`, { credentials: 'include' })
          .then(async res => res.json() as Promise<{ content: string; role: string }[]>)
          .then(data => setMessages(toUiMessages(data, key)))
          .catch(() => setMessages([]))
      }, []),
      switchSession = useCallback(
        (entry: SessionEntry) => {
          setSessionKey(entry.sessionKey)
          setLogOutput('')
          globalThis.history.pushState(null, '', `/?s=${encodeURIComponent(entry.sessionKey)}`)
          loadMessages(entry.sessionKey)
        },
        [loadMessages]
      ),
      newChat = useCallback(() => {
        const key = `agent:main:${userId}-${Date.now()}`
        setSessionKey(key)
        setMessages([])
        setLogOutput('')
        globalThis.history.pushState(null, '', '/')
      }, [userId]),
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
          fetch('/api/chat', {
            body: JSON.stringify({
              messages: allMessages,
              sessionKey
            }),
            credentials: 'include',
            headers: { 'content-type': 'application/json' },
            method: 'POST'
          })
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
        [isBusy, sessionKey, loadSessions, messages]
      )
    useEffect(() => {
      loadSessions()
      const params = new URLSearchParams(globalThis.location.search),
        s = params.get('s')
      if (s) loadMessages(s)
    }, [loadSessions, loadMessages])
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
                <SidebarMenuItem key={s.sessionKey}>
                  <SidebarMenuButton isActive={s.sessionKey === sessionKey} onClick={() => switchSession(s)}>
                    <span className='truncate text-xs'>{s.firstMessage}</span>
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
                    <DropdownMenuItem onClick={() => setShowPanel(p => !p)}>
                      <LogsIcon className='mr-2 size-4' />
                      {showPanel ? 'Hide' : 'Show'} Side Panel
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
            <ResizablePanel defaultSize={showPanel ? 65 : 100} minSize={30}>
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
                <PromptInput className='mx-auto max-w-3xl p-4' onSubmit={({ text }) => sendChat(text)}>
                  <PromptInputTextarea disabled={isBusy} placeholder='Ask anything...' />
                  <PromptInputFooter>
                    <div />
                    <PromptInputSubmit status={isBusy ? 'streaming' : 'ready'} />
                  </PromptInputFooter>
                </PromptInput>
              </div>
            </ResizablePanel>
            {showPanel ? (
              <>
                <ResizableHandle />
                <ResizablePanel defaultSize={35} minSize={20}>
                  <RightPanel
                    isBusy={isBusy}
                    logOutput={logOutput}
                    onClearLogs={() => setLogOutput('')}
                    refreshKey={fileRefreshKey}
                  />
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
    return <Chat userId={session.user.id} userName={session.user.name} />
  }
export default Page
