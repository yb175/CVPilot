import { useUser } from '@clerk/react'
import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />
  }

  return <>{children}</>
}
