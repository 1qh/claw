/* oxlint-disable promise/prefer-await-to-then */
'use client'
import { FileTree, FileTreeFile, FileTreeFolder } from '@a/ui/ai-elements/file-tree'
import { ScrollArea } from '@a/ui/scroll-area'
import { useEffect, useState } from 'react'
interface TreeNode {
  children?: TreeNode[]
  name: string
  path: string
  type: 'directory' | 'file'
}
const renderNode = (node: TreeNode): React.ReactNode => {
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
  }
export default FileExplorer
