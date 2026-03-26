/* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-condition */
/* oxlint-disable promise/prefer-await-to-then, unicorn/prefer-top-level-await, promise/always-return */
'use client'
import { FileTree, FileTreeFile, FileTreeFolder } from '@a/ui/ai-elements/file-tree'
import { Button } from '@a/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@a/ui/resizable'
import { Editor, loader } from '@monaco-editor/react'
import { TerminalSquareIcon, Trash2Icon, X } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { api } from './hooks/api'
if (globalThis.document !== undefined)
  loader
    .init()
    .then(monaco => {
      monaco.editor.defineTheme('monokai', {
        base: 'vs-dark',
        colors: {
          'editor.background': '#272822',
          'editor.foreground': '#F8F8F2',
          'editor.lineHighlightBackground': '#3E3D32',
          'editor.selectionBackground': '#49483E',
          'editorCursor.foreground': '#F8F8F0',
          'editorWhitespace.foreground': '#3B3A32'
        },
        inherit: true,
        rules: [
          { fontStyle: 'italic', foreground: '75715E', token: 'comment' },
          { foreground: 'E6DB74', token: 'string' },
          { foreground: 'AE81FF', token: 'number' },
          { foreground: 'F92672', token: 'keyword' },
          { foreground: 'A6E22E', token: 'type' },
          { foreground: 'A6E22E', token: 'function' },
          { fontStyle: 'italic', foreground: '66D9EF', token: 'variable' },
          { foreground: 'FD971F', token: 'tag' },
          { foreground: 'F92672', token: 'delimiter' },
          { foreground: 'AE81FF', token: 'constant' }
        ]
      })
      monaco.editor.defineTheme('monokai-light', {
        base: 'vs',
        colors: {
          'editor.background': '#FAFAFA',
          'editor.foreground': '#272822'
        },
        inherit: true,
        rules: [
          { fontStyle: 'italic', foreground: '75715E', token: 'comment' },
          { foreground: '98761A', token: 'string' },
          { foreground: '6A1B9A', token: 'number' },
          { foreground: 'D32F2F', token: 'keyword' },
          { foreground: '558B2F', token: 'type' },
          { foreground: '558B2F', token: 'function' },
          { fontStyle: 'italic', foreground: '0277BD', token: 'variable' },
          { foreground: 'E65100', token: 'tag' }
        ]
      })
    })
    .catch(() => undefined)
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
  LogPanel = ({ logOutput, onClose, onClear }: { logOutput: string; onClear: () => void; onClose: () => void }) => {
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
                      theme={theme === 'dark' ? 'monokai' : 'monokai-light'}
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
