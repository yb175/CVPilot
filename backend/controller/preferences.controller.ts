import {
  createOrUpdatePreferences,
  getPreferences,
  updatePreferences
} from "../service/preferences.service.js"

export async function createPreferences(req: any, res: any) {
  try {
    const userId = req.auth.userId
    const data = req.body

    const prefs = await createOrUpdatePreferences(userId, data)

    res.status(201).json(prefs)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
}

export async function fetchPreferences(req: any, res: any) {
  try {
    const userId = req.auth.userId

    const prefs = await getPreferences(userId)

    if (!prefs) {
      return res.status(404).json({ message: "Preferences not found" })
    }

    res.json(prefs)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
}

export async function patchPreferences(req: any, res: any) {
  try {
    const userId = req.auth.userId
    const data = req.body

    const prefs = await updatePreferences(userId, data)

    res.json(prefs)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
}