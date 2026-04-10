import express from "express";
import { protectedRoute } from "../middleware/auth.middleware.js";

const authRouter = express.Router();

// GET /auth/me - Returns authenticated user info
authRouter.get("/me", protectedRoute, (req: any, res: any) => {
  // protectedRoute middleware ensures req.auth.userId exists
  res.json({
    success: true,
    user: {
      userId: req.auth.userId,
      sessionId: req.auth.sessionId,
      orgId: req.auth.orgId,
    },
  });
});

export default authRouter;