import type { ReactNode } from 'react'
import './globals.css'

const Layout = ({ children }: { children: ReactNode }) => (
  <html className='dark' lang='en' suppressHydrationWarning>
    <body className='min-h-screen bg-background font-sans text-foreground antialiased'>{children}</body>
  </html>
)

export default Layout
export const metadata = { title: 'Claw' }
