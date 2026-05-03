import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

import { isAppBundlePath } from './utils/path-guards'

const SETTINGS_FILENAME = 'settings.json'

export interface AppSettings {
  operatorName: string | null
  githubCloneParentFolder: string | null
}

const DEFAULT_SETTINGS: AppSettings = {
  operatorName: null,
  githubCloneParentFolder: null,
}

function settingsFilePath(): string {
  return join(app.getPath('userData'), SETTINGS_FILENAME)
}

export function readSettings(): AppSettings {
  const path = settingsFilePath()
  if (!existsSync(path)) return { ...DEFAULT_SETTINGS }

  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8'))
    const rawClone =
      typeof parsed?.githubCloneParentFolder === 'string' &&
      parsed.githubCloneParentFolder.trim()
        ? parsed.githubCloneParentFolder.trim()
        : null
    return {
      operatorName:
        typeof parsed?.operatorName === 'string' && parsed.operatorName.trim()
          ? parsed.operatorName.trim()
          : null,
      githubCloneParentFolder: isAppBundlePath(rawClone) ? null : rawClone,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function writeSettings(next: Partial<AppSettings>): AppSettings {
  const current = readSettings()
  const merged: AppSettings = { ...current, ...next }
  if (merged.operatorName !== null && merged.operatorName !== undefined) {
    merged.operatorName = merged.operatorName.trim() || null
  }
  if (
    merged.githubCloneParentFolder !== null &&
    merged.githubCloneParentFolder !== undefined
  ) {
    merged.githubCloneParentFolder = merged.githubCloneParentFolder.trim() || null
  }

  const path = settingsFilePath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(merged, null, 2), { encoding: 'utf-8', mode: 0o600 })
  return merged
}

export function getDefaultGithubCloneParentFolder(): string {
  return join(app.getPath('documents'), 'JYRY-Projects')
}

export function getGithubCloneParentFolder(): string {
  const settings = readSettings()
  const candidate = settings.githubCloneParentFolder || getDefaultGithubCloneParentFolder()
  return isAppBundlePath(candidate) ? getDefaultGithubCloneParentFolder() : candidate
}
