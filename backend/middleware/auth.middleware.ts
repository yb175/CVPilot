import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";

// Extend Express Request type to include auth
declare global {
  namespace Express {
    interface Request {
      auth: {
        userId: string;
      } | null;
    }
  }
}

/**
 * Protected route middleware
 * Ensures user is authenticated via Clerk
 * Must be used AFTER clerkMiddleware()
 */
export const protectedRoute = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // getAuth is populated by clerkMiddleware()
  const auth = getAuth(req);

  if (!auth || !auth.userId) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Valid Clerk token required",
    });
  }

  // Attach userId to request for controller access
  req.auth = {
    userId: auth.userId,
  };

  next();
};
