import express from "express"
import { healthCheck } from "../controller/system.controller.js"

const router = express.Router()

router.get("/health", healthCheck)

export default router