/** biome-ignore-all lint/a11y/useSemanticElements: div wraps buttons, can't use button */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
'use client'
import { cn } from '@a/ui'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@a/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar
} from '@a/ui/sidebar'
import { ChevronUpIcon, CodeIcon, LogOutIcon, MessageSquarePlusIcon, MoonIcon, SparklesIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { authClient } from '~/lib/auth-client'
interface SessionEntry {
  firstMessage: string
  sessionKey: string
  updatedAt: string
}
const signOut = async () => {
    await authClient.signOut()
    globalThis.location.reload()
  },
  ExpandOnClick = ({ children }: { children: React.ReactNode }) => {
    const { state, toggleSidebar } = useSidebar()
    return (
      <div
        className={cn('flex h-full w-full flex-col', state === 'collapsed' && 'cursor-pointer')}
        onClick={
          state === 'collapsed'
            ? e => {
                if (e.target === e.currentTarget) toggleSidebar()
              }
            : undefined
        }
        onKeyDown={
          state === 'collapsed'
            ? e => {
                if (e.key === 'Enter') toggleSidebar()
              }
            : undefined
        }
        role='button'
        tabIndex={0}>
        {children}
      </div>
    )
  },
  SessionSidebar = ({
    activeSessionKey,
    onNewChat,
    onSwitchSession,
    onToggleEditor,
    sessions,
    useMonaco,
    userName
  }: {
    activeSessionKey: string
    onNewChat: () => void
    onSwitchSession: (entry: SessionEntry) => void
    onToggleEditor: () => void
    sessions: SessionEntry[]
    useMonaco: boolean
    userName: string
  }) => {
    const { setTheme, theme } = useTheme()
    return (
      <Sidebar collapsible='icon' side='right'>
        <ExpandOnClick>
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onNewChat}>
                  <MessageSquarePlusIcon className='size-4' />
                  <span>New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent className='overflow-y-auto px-2 group-data-[collapsible=icon]:invisible'>
            <SidebarMenu>
              {sessions.map(s => (
                <SidebarMenuItem key={s.sessionKey}>
                  <SidebarMenuButton isActive={s.sessionKey === activeSessionKey} onClick={() => onSwitchSession(s)}>
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
                  <DropdownMenuContent align='end' className='w-56' side='top'>
                    <DropdownMenuItem onClick={onToggleEditor}>
                      <CodeIcon className='mr-2 size-4' />
                      {useMonaco ? 'Simple editor' : 'VS Code'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                      {theme === 'dark' ? <SunIcon className='mr-2 size-4' /> : <MoonIcon className='mr-2 size-4' />}
                      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
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
        </ExpandOnClick>
        <SidebarRail />
      </Sidebar>
    )
  }
export type { SessionEntry }
export default SessionSidebar
