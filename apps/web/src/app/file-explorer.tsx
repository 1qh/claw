/* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
/* oxlint-disable promise/prefer-await-to-then */
'use client'
import { CodeBlock, CodeBlockCopyButton, CodeBlockFilename, CodeBlockHeader } from '@a/ui/ai-elements/code-block'
import { FileTree, FileTreeFile, FileTreeFolder } from '@a/ui/ai-elements/file-tree'
import { Terminal, TerminalContent } from '@a/ui/ai-elements/terminal'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@a/ui/resizable'
import { ScrollArea } from '@a/ui/scroll-area'
import { useEffect, useState } from 'react'
interface TreeNode {
  children?: TreeNode[]
  name: string
  path: string
  type: 'directory' | 'file'
}
const EXT_LANG: Record<string, string> = {
    css: 'css',
    html: 'html',
    js: 'javascript',
    json: 'json',
    md: 'markdown',
    ts: 'typescript',
    tsx: 'tsx',
    yaml: 'yaml',
    yml: 'yaml'
  },
  langOf = (path: string) => EXT_LANG[path.split('.').pop() ?? ''] ?? 'text',
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
  IDEPanel = ({
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
      [fileContent, setFileContent] = useState<null | string>(null)
    useEffect(() => {
      const key = refreshKey
      fetch(`/api/files?v=${String(key)}`, { credentials: 'include' })
        .then(async res => res.json() as Promise<TreeNode[]>)
        .then(setTree)
        .catch(() => undefined)
    }, [refreshKey])
    useEffect(() => {
      if (!selectedPath) {
        setFileContent(null)
        return
      }
      setFileContent(null)
      fetch(`/api/files/${selectedPath}`, { credentials: 'include' })
        .then(async res => (res.ok ? res.text() : ''))
        .then(setFileContent)
        .catch(() => setFileContent(''))
    }, [selectedPath])
    const handleSelect = (p: string) => {
      const node = findNode(tree, p)
      if (node?.type === 'file') setSelectedPath(p)
    }
    return (
      <ResizablePanelGroup orientation='horizontal'>
        <ResizablePanel defaultSize={30} minSize={15}>
          <ScrollArea className='h-full'>
            <FileTree
              className='rounded-none border-0 bg-transparent'
              defaultExpanded={new Set(['state', 'workspace'])}
              onSelect={handleSelect}
              selectedPath={selectedPath ?? undefined}>
              {tree.map(renderNode)}
            </FileTree>
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={70} minSize={20}>
          <ResizablePanelGroup orientation='vertical'>
            <ResizablePanel defaultSize={70} minSize={20}>
              {selectedPath && fileContent !== null ? (
                <ScrollArea className='h-full'>
                  <CodeBlock code={fileContent} language={langOf(selectedPath)} showLineNumbers>
                    <CodeBlockHeader>
                      <CodeBlockFilename>{selectedPath}</CodeBlockFilename>
                      <CodeBlockCopyButton />
                    </CodeBlockHeader>
                  </CodeBlock>
                </ScrollArea>
              ) : (
                <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
                  {selectedPath ? 'Loading...' : 'Select a file to view'}
                </div>
              )}
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={30} minSize={10}>
              <Terminal
                className='flex h-full flex-col rounded-none border-0'
                isStreaming={isBusy}
                onClear={onClearLogs}
                output={logOutput}>
                <TerminalContent className='max-h-none flex-1' />
              </Terminal>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
  }
export default IDEPanel
