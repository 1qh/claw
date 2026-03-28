/* oxlint-disable promise/prefer-await-to-then, promise/always-return */
'use client'
import type { TreeDataItem, VirtualFile } from 'idecn'
import { Workspace } from 'idecn'
import { useEffect, useMemo, useState } from 'react'
import { api } from './hooks/api'
interface ApiTreeNode {
  children?: ApiTreeNode[]
  name: string
  path: string
  type: 'directory' | 'file'
}
const toTreeData = (nodes: ApiTreeNode[]): TreeDataItem[] => {
    const result: TreeDataItem[] = []
    for (const node of nodes) {
      const item: TreeDataItem = { id: node.path, name: node.name, path: node.path }
      if (node.type === 'directory' && node.children) item.children = toTreeData(node.children)
      result.push(item)
    }
    return result
  },
  MonacoIDEPanel = ({ logOutput, refreshKey }: { logOutput: string; refreshKey: number }) => {
    const [tree, setTree] = useState<TreeDataItem[]>([]),
      files = useMemo(
        () => [{ content: logOutput, language: 'yaml', name: 'Logs', open: true, pin: 'top' } satisfies VirtualFile],
        [logOutput]
      )
    useEffect(() => {
      api
        .get(`api/files?v=${String(refreshKey)}`)
        .json<ApiTreeNode[]>()
        .then(data => setTree(toTreeData(data)))
        .catch(() => undefined)
    }, [refreshKey])
    return (
      <Workspace
        className='h-full'
        expandDepth={2}
        files={files}
        onOpenFile={async item =>
          api
            .get(`api/files/${item.path}`)
            .text()
            .catch(() => null)
        }
        sidebarSize='25%'
        tree={tree}
      />
    )
  }
export default MonacoIDEPanel
