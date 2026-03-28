// oxlint-disable-next-line import/no-unassigned-import
import '@a/ui/globals.css'
import type { Metadata } from 'next'
import { cn } from '@a/ui'
import { ThemeProvider } from 'next-themes'
import { mono, sans } from './fonts'
const metadata: Metadata = {
    description: 'Agent-native SaaS framework',
    title: 'Uniclaw'
  },
  RootLayout = ({ children }: { children: React.ReactNode }) => (
    <html className={cn('font-sans tracking-[-0.02em]', sans.variable, mono.variable)} lang='en' suppressHydrationWarning>
      <body className='min-h-screen antialiased'>
        <ThemeProvider attribute='class' defaultTheme='dark' disableTransitionOnChange enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
export { metadata }
export default RootLayout
