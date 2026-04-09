import { clerkMiddleware as clerkExpressMiddleware, getAuth } from '@clerk/express'

// Export the Clerk middleware - handles Bearer tokens and session cookies
export const clerkMiddleware = clerkExpressMiddleware()

// Protected route middleware - validate authentication using getAuth()
export const protectedRoute = (req: any, res: any, next: any) => {
  const auth = getAuth(req)
  
  // Check if user is authenticated
  if (!auth || !auth.userId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - Missing or invalid authentication',
    })
  }
  
  // Attach auth to request for use in route handler
  req.auth = auth
  next()
} 