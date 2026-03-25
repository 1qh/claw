/* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
/* oxlint-disable promise/prefer-await-to-then */
'use client'
import { FileTree, FileTreeFile, FileTreeFolder } from '@a/ui/ai-elements/file-tree'
import {
  Terminal,
  TerminalActions,
  TerminalContent,
  TerminalCopyButton,
  TerminalHeader,
  TerminalStatus,
  TerminalTitle
} from '@a/ui/ai-elements/terminal'
import { Button } from '@a/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@a/ui/resizable'
import { Editor } from '@monaco-editor/react'
import { TerminalSquareIcon, X } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { api } from './hooks/api'
interface TreeNode {
  children?: TreeNode[]
  name: string
  path: string
  type: 'directory' | 'file'
}
const EDITOR_OPTIONS = {
    domReadOnly: true,
    fontSize: 12,
    lineNumbers: 'on' as const,
    minimap: { enabled: false },
    readOnly: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on' as const
  },
  EXT_LANG: Record<string, string> = {
    css: 'css',
    html: 'html',
    js: 'javascript',
    json: 'json',
    jsonl: 'json',
    md: 'markdown',
    sql: 'sql',
    ts: 'typescript',
    tsx: 'typescriptreact',
    yaml: 'yaml',
    yml: 'yaml'
  },
  langOf = (path: string) => EXT_LANG[path.split('.').pop() ?? ''] ?? 'plaintext',
  renderNode = (node: TreeNode): React.ReactNode => {
    if (node.type === 'directory')
      return (
        <FileTreeFolder key={node.path} name={node.name} path={node.path}>
          {node.children?.map(renderNode)}
        </FileTreeFolder>
      )
    return <FileTreeFile key={node.path} name={node.name} path={node.path} />
  },
  findNode = (nodes: TreeNode[], path: string): TreeNode | undefined => {
    for (const node of nodes) {
      if (node.path === path) return node
      if (node.children) {
        const found = findNode(node.children, path)
        if (found) return found
      }
    }
  },
  MonacoIDEPanel = ({
    isBusy,
    logOutput,
    onClearLogs,
    refreshKey
  }: {
    isBusy: boolean
    logOutput: string
    onClearLogs: () => void
    refreshKey: number
  }) => {
    const [tree, setTree] = useState<TreeNode[]>([]),
      [selectedPath, setSelectedPath] = useState<null | string>(null),
      [fileContent, setFileContent] = useState<null | string>(null),
      [showTerminal, setShowTerminal] = useState(true),
      { theme } = useTheme()
    useEffect(() => {
      if (isBusy) setShowTerminal(true)
    }, [isBusy])
    useEffect(() => {
      const key = refreshKey
      api
        .get(`api/files?v=${String(key)}`)
        .json<TreeNode[]>()
        .then(setTree)
        .catch(() => undefined)
    }, [refreshKey])
    useEffect(() => {
      if (!selectedPath) {
        setFileContent(null)
        return
      }
      setFileContent(null)
      api
        .get(`api/files/${selectedPath}`)
        .text()
        .then(setFileContent)
        .catch(() => setFileContent(''))
    }, [selectedPath])
    const handleSelect = (p: string) => {
      const node = findNode(tree, p)
      if (node?.type === 'file') setSelectedPath(p)
    }
    return (
      <ResizablePanelGroup orientation='horizontal'>
        <ResizablePanel defaultSize={25} minSize={12}>
          <FileTree
            className='rounded-none border-none *:p-0'
            defaultExpanded={new Set(['state', 'workspace'])}
            onSelect={handleSelect}
            selectedPath={selectedPath ?? undefined}>
            {tree.map(renderNode)}
          </FileTree>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel className='relative' defaultSize={75} minSize={20}>
          <ResizablePanelGroup orientation='vertical'>
            {selectedPath && fileContent !== null ? (
              <>
                <ResizablePanel defaultSize={showTerminal ? 60 : 100} minSize={20}>
                  <div className='flex h-full flex-col'>
                    <div className='flex items-center border-b px-2 py-0.5 text-xs text-muted-foreground'>
                      <span className='flex-1 truncate'>{selectedPath}</span>
                      <Button
                        className='size-6 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                        onClick={() => setSelectedPath(null)}
                        size='icon'
                        variant='ghost'>
                        <X />
                      </Button>
                    </div>
                    <Editor
                      height='100%'
                      language={langOf(selectedPath)}
                      options={EDITOR_OPTIONS}
                      theme={theme === 'dark' ? 'vs-dark' : 'light'}
                      value={fileContent}
                    />
                  </div>
                </ResizablePanel>
                <ResizableHandle className='opacity-0' />
              </>
            ) : null}
            {showTerminal ? (
              <ResizablePanel defaultSize={40} minSize={10}>
                <Terminal
                  className='rounded-none border-none *:p-1 [&_pre]:!p-0 [&_pre]:!text-xs [&_pre]:!leading-3.5'
                  isStreaming={isBusy}
                  onClear={onClearLogs}
                  output={logOutput}>
                  <TerminalHeader className='!pl-2'>
                    <TerminalTitle />
                    <div className='flex items-center gap-1'>
                      <TerminalStatus />
                      <TerminalActions>
                        <TerminalCopyButton />
                        <Button
                          className='size-7 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                          onClick={() => setShowTerminal(false)}
                          size='icon'
                          variant='ghost'>
                          <X />
                        </Button>
                      </TerminalActions>
                    </div>
                  </TerminalHeader>
                  <TerminalContent className='max-h-none flex-1' />
                </Terminal>
              </ResizablePanel>
            ) : null}
          </ResizablePanelGroup>
          {showTerminal ? null : (
            <Button
              className='absolute bottom-1 right-1 size-7'
              onClick={() => setShowTerminal(true)}
              size='icon'
              variant='ghost'>
              <TerminalSquareIcon className='size-4' />
            </Button>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    )
  }
export default MonacoIDEPanel
