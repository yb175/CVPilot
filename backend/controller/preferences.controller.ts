import {
  createOrUpdatePreferences,
  getPreferences,
  updatePreferences
} from "../service/preferences.service.js"

export async function createPreferences(req: any, res: any) {
  const userId = req.auth.userId
  const userEmail = req.auth.emailAddresses?.[0]?.emailAddress || ""
  const userName = req.auth.firstName || ""
  const data = req.body

  const prefs = await createOrUpdatePreferences(userId, data, userEmail, userName)

  res.status(201).json(prefs)
}

export async function fetchPreferences(req: any, res: any) {
  const userId = req.auth.userId
  const userEmail = req.auth.emailAddresses?.[0]?.emailAddress || ""
  const userName = req.auth.firstName || ""

  const prefs = await getPreferences(userId, userEmail, userName)

  if (!prefs) {
    return res.status(404).json({ message: "Preferences not found" })
  }

  res.json(prefs)
}

export async function patchPreferences(req: any, res: any) {
  const userId = req.auth.userId
  const userEmail = req.auth.emailAddresses?.[0]?.emailAddress || ""
  const userName = req.auth.firstName || ""
  const data = req.body

  const prefs = await updatePreferences(userId, data, userEmail, userName)

  res.json(prefs)
}