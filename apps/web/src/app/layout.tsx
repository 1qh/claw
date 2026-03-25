// oxlint-disable-next-line import/no-unassigned-import
import './globals.css'
import type { Metadata } from 'next'
import { cn } from '@a/ui'
import { ThemeProvider } from 'next-themes'
import { geist } from './fonts'
const metadata: Metadata = {
    description: 'Agent-native SaaS framework',
    title: 'Uniclaw'
  },
  RootLayout = ({ children }: { children: React.ReactNode }) => (
    <html className={cn('font-sans', geist.variable)} lang='en' suppressHydrationWarning>
      <body className='min-h-screen antialiased'>
        <ThemeProvider attribute='class' defaultTheme='dark' enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
export { metadata }
export default RootLayout
