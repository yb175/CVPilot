import { SignIn } from '@clerk/react'

export function SignInPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <SignIn />
    </div>
  )
}
