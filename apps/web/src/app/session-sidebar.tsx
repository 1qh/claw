/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/strict-void-return */
'use client'
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
import { ChevronUpIcon, LogOutIcon, MessageSquarePlusIcon, SparklesIcon } from 'lucide-react'
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
      <button
        className={`contents ${state === 'collapsed' ? 'cursor-pointer' : ''}`}
        onClick={state === 'collapsed' ? () => toggleSidebar() : undefined}
        type='button'>
        {children}
      </button>
    )
  },
  SessionSidebar = ({
    activeSessionKey,
    onNewChat,
    onSwitchSession,
    sessions,
    userName
  }: {
    activeSessionKey: string
    onNewChat: () => void
    onSwitchSession: (entry: SessionEntry) => void
    sessions: SessionEntry[]
    userName: string
  }) => (
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
export type { SessionEntry }
export default SessionSidebar
