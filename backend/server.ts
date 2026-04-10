import express from "express";
import { clerkMiddleware } from "@clerk/express";
import authRouter from "./route/auth.route.js";
import preferencesRouter from "./route/preferences.route.js";
import systemRouter from "./route/system.route.js";
import resumeRoute from "./route/resumeRoute.js";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// 1. Body parser
app.use(express.json());

// 2. CORS - must be early
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 3. CRITICAL: Clerk middleware BEFORE ALL ROUTES
app.use(clerkMiddleware());

// 4. Now routes can use getAuth()
app.use("/", systemRouter);
app.use("/resume", resumeRoute);
app.use("/auth", authRouter);
app.use("/preferences", preferencesRouter);

// 5. Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});