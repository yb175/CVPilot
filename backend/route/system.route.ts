import express from "express"
import { healthCheck, dbTest } from "../controller/system.controller.js"

const router = express.Router()

router.get("/health", healthCheck)
router.get("/db", dbTest)

export default router