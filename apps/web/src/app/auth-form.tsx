/* eslint-disable @typescript-eslint/no-deprecated, @typescript-eslint/strict-void-return */
'use client'
import { Button } from '@a/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@a/ui/card'
import { Input } from '@a/ui/input'
import { Label } from '@a/ui/label'
import { Separator } from '@a/ui/separator'
import { useId, useState } from 'react'
import { authClient } from '~/lib/auth-client'
const signInGoogle = async () => {
    await authClient.signIn.social({ callbackURL: '/', provider: 'google' })
  },
  AuthForm = () => {
    const [mode, setMode] = useState<'login' | 'signup'>('signup'),
      [email, setEmail] = useState(''),
      [password, setPassword] = useState(''),
      [name, setName] = useState(''),
      [authError, setAuthError] = useState(''),
      [loading, setLoading] = useState(false),
      formId = useId(),
      submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setAuthError('')
        setLoading(true)
        if (mode === 'signup') {
          const { error } = await authClient.signUp.email({ email, name, password })
          if (error) {
            setAuthError(error.message ?? 'Sign up failed')
            setLoading(false)
          }
        } else {
          const { error } = await authClient.signIn.email({ email, password })
          if (error) {
            setAuthError(error.message ?? 'Sign in failed')
            setLoading(false)
          }
        }
      }
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <Card className='w-96'>
          <CardHeader>
            <CardTitle className='text-2xl'>Uniclaw</CardTitle>
            <CardDescription>
              {mode === 'signup' ? 'Create an account to get started' : 'Sign in to your account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className='flex flex-col gap-4' onSubmit={submit}>
              {mode === 'signup' && (
                <div className='flex flex-col gap-2'>
                  <Label htmlFor={`${formId}-name`}>Name</Label>
                  <Input
                    id={`${formId}-name`}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    placeholder='Your name'
                    required
                    value={name}
                  />
                </div>
              )}
              <div className='flex flex-col gap-2'>
                <Label htmlFor={`${formId}-email`}>Email</Label>
                <Input
                  id={`${formId}-email`}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  placeholder='you@example.com'
                  required
                  type='email'
                  value={email}
                />
              </div>
              <div className='flex flex-col gap-2'>
                <Label htmlFor={`${formId}-password`}>Password</Label>
                <Input
                  id={`${formId}-password`}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  placeholder='Password'
                  required
                  type='password'
                  value={password}
                />
              </div>
              {authError ? <p className='text-sm text-destructive'>{authError}</p> : null}
              <Button disabled={loading} type='submit'>
                {loading ? 'Loading...' : mode === 'signup' ? 'Sign Up' : 'Sign In'}
              </Button>
              <Separator />
              <Button className='gap-2' disabled={loading} onClick={signInGoogle} type='button' variant='outline'>
                Continue with Google
              </Button>
              <button
                className='text-sm text-muted-foreground hover:text-foreground'
                onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
                type='button'>
                {mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }
export default AuthForm
