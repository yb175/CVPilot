import express from "express"
import {validator} from "../middleware/Validator.js"
import {preferencesSchema, patchSchema} from "../validators/preferences.schema.js"
import { protectedRoute } from "../middleware/auth.middleware.js"
import {
  createPreferences,
  fetchPreferences,
  patchPreferences
} from "../controller/preferences.controller.js"

const router = express.Router()

router.post("/",
    protectedRoute,
    validator(preferencesSchema),
    createPreferences
)

router.get("/",
    protectedRoute,
    fetchPreferences
)

router.patch("/",
    protectedRoute,
    validator(patchSchema),
    patchPreferences
)

export default router