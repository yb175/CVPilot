import { useUser, useClerk, useAuth } from '@clerk/react'
import { useState } from 'react'

export function DashboardPage() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const { getToken } = useAuth()
  const [token, setToken] = useState<string>('')
  const [testResult, setTestResult] = useState<string>('')

  const handleLogout = async () => {
    await signOut()
  }

  const handleTestPreferences = async () => {
    try {
      const authToken = await getToken()
      setToken(authToken || '')

      const res = await fetch('http://localhost:3000/preferences', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await res.json()
      setTestResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setTestResult(`Error: ${error}`)
    }
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
      <button onClick={handleTestPreferences} style={{ padding: '0.5rem 1rem', marginTop: '1rem', marginRight: '0.5rem', cursor: 'pointer' }}>
        Test Backend
      </button>
      <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', marginTop: '1rem', cursor: 'pointer' }}>
        Logout
      </button>
      {token && (
        <div style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <p><strong>Token:</strong></p>
          <code style={{ fontSize: '0.85em', wordBreak: 'break-all' }}>{token}</code>
        </div>
      )}
      {testResult && (
        <div style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
          <p><strong>Response:</strong></p>
          <pre style={{ fontSize: '0.85em', overflow: 'auto' }}>{testResult}</pre>
        </div>
      )}
    </div>
  )
}
