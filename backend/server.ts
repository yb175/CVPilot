import express from "express";
import authRouter from "./route/auth.route.js";
import { clerkMiddleware } from "./middleware/auth.middleware.js";
import cors from "cors";
import dotenv from 'dotenv'
dotenv.config();

const app = express();

// CORS with credentials support for Bearer tokens
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Clerk middleware - extracts session from cookies or Authorization header
app.use(clerkMiddleware);

app.get("/health", (req: any, res: any) => {
  res.send("OK");
});

app.use("/auth", authRouter);

app.listen(3000,()=>{
    console.log("Server started on port 3000")
}) ; 