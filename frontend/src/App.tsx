import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SignInPage } from './pages/SignInPage'
import { SignUpPage } from './pages/SignUpPage'
import { DashboardPage } from './pages/DashboardPage'
import LandingPage from './pages/LandingPage'
import ProfilePage from './pages/ProfilePage'
import { AppLayout } from './components/AppLayout'
import JobsPage from './pages/JobPage'
import SavedPage from './pages/SavedPage'
import { ToastProvider, BookmarksProvider, ErrorBoundary } from './components/ui'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={
        <AppLayout>
          <LandingPage />
        </AppLayout>
        } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <AppLayout>
          <ProfilePage />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/jobs" element={
        <ProtectedRoute>
          <AppLayout>
          <JobsPage onNavigateToJob={(jobId) => console.log("Navigate to job:", jobId)} />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/saved" element={
        <ProtectedRoute>
          <AppLayout>
          <SavedPage onNavigateToJob={(jobId) => console.log("Navigate to job:", jobId)} />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/sign-up" element={<SignUpPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <BookmarksProvider>
        <ToastProvider>
          <Router>
            <AppRoutes />
          </Router>
        </ToastProvider>
      </BookmarksProvider>
    </ErrorBoundary>
  )
}

export default App