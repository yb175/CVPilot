import express from "express";
import authRouter from "./route/auth.route.js";
import { clerkMiddleware } from "./middleware/auth.middleware.js";
import preferencesRouter from "./route/preferences.route.js"
import systemRouter from "./route/system.route.js"
import cors from "cors";
import dotenv from 'dotenv'
dotenv.config();

const app = express();
app.use(express.json());

// CORS with credentials support for Bearer tokens
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use("/", systemRouter)

// Clerk middleware - extracts session from cookies or Authorization header
app.use(clerkMiddleware);
app.use("/auth", authRouter);
app.use("/preferences", preferencesRouter)


app.listen(3000,()=>{
    console.log("Server started on port 3000")
}) ; 
