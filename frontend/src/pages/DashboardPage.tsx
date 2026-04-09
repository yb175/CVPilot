import { useUser, useClerk } from '@clerk/react'

export function DashboardPage() {
  const { user } = useUser()
  const { signOut } = useClerk()

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Dashboard</h1>
      {user && (
        <div>
          <p>
            <strong>Name:</strong> {user.firstName} {user.lastName}
          </p>
          <p>
            <strong>Email:</strong> {user.primaryEmailAddress?.emailAddress}
          </p>
        </div>
      )}
      <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', marginTop: '1rem', cursor: 'pointer' }}>
        Logout
      </button>
    </div>
  )
}
