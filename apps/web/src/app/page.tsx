'use client'
import { authClient } from '~/lib/auth-client'
import AuthForm from './auth-form'
import Chat from './chat'
const Page = () => {
  const { data: session, isPending } = authClient.useSession()
  if (isPending)
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <p className='text-muted-foreground'>Loading...</p>
      </div>
    )
  if (!session) return <AuthForm />
  return <Chat userId={session.user.id} userName={session.user.name} />
}
export default Page
