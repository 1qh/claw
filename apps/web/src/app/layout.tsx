// oxlint-disable-next-line import/no-unassigned-import
import './globals.css'
import type { Metadata } from 'next'
import { cn } from '@a/ui'
import { geist } from './fonts'
const metadata: Metadata = {
    description: 'Agent-native SaaS framework',
    title: 'Uniclaw'
  },
  RootLayout = ({ children }: { children: React.ReactNode }) => (
    <html className={cn('dark font-sans', geist.variable)} lang='en'>
      <body className='min-h-screen antialiased'>{children}</body>
    </html>
  )
export { metadata }
export default RootLayout
