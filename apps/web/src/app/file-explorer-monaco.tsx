/* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
/* oxlint-disable promise/prefer-await-to-then, promise/always-return */
'use client'
import type { TreeDataItem } from 'idecn'
import { Button } from '@a/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@a/ui/resizable'
import { Editor } from '@monaco-editor/react'
import { FileTree } from 'idecn'
import { TerminalSquareIcon, Trash2Icon, X } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { api } from './hooks/api'
interface ApiTreeNode {
  children?: ApiTreeNode[]
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
  toTreeData = (nodes: ApiTreeNode[]): TreeDataItem[] => {
    const result: TreeDataItem[] = []
    for (const node of nodes) {
      const item: TreeDataItem = { id: node.path, name: node.name, path: node.path }
      if (node.type === 'directory' && node.children) item.children = toTreeData(node.children)
      result.push(item)
    }
    return result
  },
  LogPanel = ({ logOutput, onClear, onClose }: { logOutput: string; onClear: () => void; onClose: () => void }) => {
    const ref = useRef<HTMLPreElement>(null)
    /** biome-ignore lint/correctness/useExhaustiveDependencies: ref is stable */
    useEffect(() => {
      const el = ref.current
      if (el) el.scrollTop = el.scrollHeight
    }, [logOutput])
    return (
      <div className='flex h-full flex-col bg-zinc-950'>
        <div className='flex items-center justify-between border-b border-zinc-800 px-2 py-1'>
          <span className='text-xs text-zinc-500'>Logs</span>
          <div className='flex gap-1'>
            <Button className='size-6 text-zinc-500 hover:text-zinc-200' onClick={onClear} size='icon' variant='ghost'>
              <Trash2Icon className='size-3' />
            </Button>
            <Button className='size-6 text-zinc-500 hover:text-zinc-200' onClick={onClose} size='icon' variant='ghost'>
              <X className='size-3' />
            </Button>
          </div>
        </div>
        <pre className='flex-1 overflow-auto p-2 font-mono text-xs leading-4 text-zinc-300 whitespace-pre-wrap' ref={ref}>
          {logOutput}
        </pre>
      </div>
    )
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
    const [tree, setTree] = useState<TreeDataItem[]>([]),
      [selectedPath, setSelectedPath] = useState<null | string>(null),
      [fileContent, setFileContent] = useState<null | string>(null),
      [showTerminal, setShowTerminal] = useState(true),
      { resolvedTheme } = useTheme()
    useEffect(() => {
      if (isBusy) setShowTerminal(true)
    }, [isBusy])
    useEffect(() => {
      api
        .get(`api/files?v=${String(refreshKey)}`)
        .json<ApiTreeNode[]>()
        .then(data => setTree(toTreeData(data)))
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
    return (
      <ResizablePanelGroup orientation='horizontal'>
        <ResizablePanel defaultSize={25} minSize={12}>
          <div className='h-full overflow-x-auto overflow-y-auto'>
            <FileTree
              data={tree}
              onSelectChange={item => {
                if (item && !item.children) setSelectedPath(item.path)
              }}
            />
          </div>
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
                      language={selectedPath.split('.').at(-1) ?? 'plaintext'}
                      options={EDITOR_OPTIONS}
                      theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                      value={fileContent}
                    />
                  </div>
                </ResizablePanel>
                <ResizableHandle className='opacity-0' />
              </>
            ) : null}
            {showTerminal ? (
              <ResizablePanel defaultSize={40} minSize={10}>
                <LogPanel logOutput={logOutput} onClear={onClearLogs} onClose={() => setShowTerminal(false)} />
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
