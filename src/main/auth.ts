import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

const AUTH_FILENAME = 'github-auth.json'

interface StoredAuth {
  encrypted: boolean
  token: string
}

function authFilePath(): string {
  return join(app.getPath('userData'), AUTH_FILENAME)
}

export function hasToken(): boolean {
  const path = authFilePath()
  if (!existsSync(path)) return false
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as StoredAuth
    return Boolean(raw && typeof raw.token === 'string' && raw.token.length > 0)
  } catch {
    return false
  }
}

export function getStoredToken(): string | null {
  const path = authFilePath()
  if (!existsSync(path)) return null

  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as StoredAuth
    if (!raw || typeof raw.token !== 'string') return null

    if (raw.encrypted) {
      if (!safeStorage.isEncryptionAvailable()) return null
      const buffer = Buffer.from(raw.token, 'base64')
      return safeStorage.decryptString(buffer)
    }

    return raw.token
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  const trimmed = token.trim()
  if (!trimmed) {
    throw new Error('Token cannot be empty.')
  }

  const path = authFilePath()
  mkdirSync(dirname(path), { recursive: true })

  const payload: StoredAuth = safeStorage.isEncryptionAvailable()
    ? { encrypted: true, token: safeStorage.encryptString(trimmed).toString('base64') }
    : { encrypted: false, token: trimmed }

  writeFileSync(path, JSON.stringify(payload, null, 2), { encoding: 'utf-8', mode: 0o600 })
}

export function clearToken(): void {
  const path = authFilePath()
  if (existsSync(path)) {
    try {
      unlinkSync(path)
    } catch {
      // ignore
    }
  }
}
