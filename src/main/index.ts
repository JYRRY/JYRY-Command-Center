import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'

import { clearToken, getStoredToken, hasToken, setToken } from './auth'
import { mergeCanonicalAgentRoster, OPERATOR_AGENT_ID } from './canonical-agents'
import { commitAndPush } from './git'
import { listRepos, validateToken, type GitHubRepoSummary } from './github'
import {
  getDefaultGithubCloneParentFolder,
  getGithubCloneParentFolder,
  readSettings,
  writeSettings,
  type AppSettings,
} from './settings'
import {
  cloneAndConfigureWorkspace,
  configureWorkspace,
  createStarterManifesto,
  createStarterRoadmap,
  generateTrackerForWorkspace,
  getWorkspaceStatus,
  importManifesto,
  importRoadmap,
} from './workspace'
import { isAppBundlePath } from './utils/path-guards'

let mainWindow: BrowserWindow | null = null
let fileWatcher: fs.FSWatcher | null = null
let watchedTrackerPath: string | null = null
let lastWriteTime = 0

function migrateLegacyOperatorReferences(parsed: any): void {
  if (Array.isArray(parsed?.agent_log)) {
    for (const entry of parsed.agent_log) {
      if (entry && entry.agent_id === 'luqman') {
        entry.agent_id = OPERATOR_AGENT_ID
      }
    }
  }
}

function readTrackerFile(trackerPath: string | null): string | null {
  if (!trackerPath) return null

  try {
    const raw = fs.readFileSync(trackerPath, 'utf-8')
    const parsed = JSON.parse(raw)
    migrateLegacyOperatorReferences(parsed)
    if (Array.isArray(parsed.agents)) {
      const settings = readSettings()
      parsed.agents = mergeCanonicalAgentRoster(parsed.agents, {
        operatorNameOverride: settings.operatorName,
      })
    }
    return JSON.stringify(parsed, null, 2)
  } catch {
    return null
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    backgroundColor: '#0A0A10',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function stopFileWatcher(): void {
  if (fileWatcher) {
    fileWatcher.close()
    fileWatcher = null
  }
  watchedTrackerPath = null
}

async function restartFileWatcher(): Promise<void> {
  stopFileWatcher()

  const status = await getWorkspaceStatus()
  if (!status.trackerExists || !status.trackerPath) return

  try {
    watchedTrackerPath = status.trackerPath
    fileWatcher = fs.watch(status.trackerPath, (eventType) => {
      if (eventType !== 'change') return
      if (Date.now() - lastWriteTime < 1000) return

      const content = readTrackerFile(watchedTrackerPath)
      if (content && mainWindow) {
        mainWindow.webContents.send('tracker:updated', content)
      }
    })
  } catch {
    stopFileWatcher()
  }
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

ipcMain.handle('tracker:read', async () => {
  const status = await getWorkspaceStatus()
  return status.trackerExists ? readTrackerFile(status.trackerPath) : null
})

ipcMain.handle('tracker:write', async (_event, jsonString: string) => {
  const status = await getWorkspaceStatus()
  if (!status.trackerPath) {
    return { success: false, error: 'No active tracker path is configured yet.' }
  }

  try {
    JSON.parse(jsonString)
    lastWriteTime = Date.now()
    fs.writeFileSync(status.trackerPath, jsonString, 'utf-8')
    await restartFileWatcher()
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('tracker:path', async () => {
  const status = await getWorkspaceStatus()
  return status.trackerPath
})

ipcMain.handle('tracker:fileInfo', async () => {
  const status = await getWorkspaceStatus()
  if (!status.trackerPath || !status.trackerExists) {
    return { exists: false, size: 0, lastModified: null, watcherActive: false }
  }

  try {
    const stat = fs.statSync(status.trackerPath)
    return {
      exists: true,
      size: stat.size,
      lastModified: stat.mtime.toISOString(),
      watcherActive: fileWatcher !== null && watchedTrackerPath === status.trackerPath,
    }
  } catch {
    return { exists: false, size: 0, lastModified: null, watcherActive: false }
  }
})

ipcMain.handle('workspace:getStatus', async () => {
  return getWorkspaceStatus()
})

ipcMain.handle('workspace:chooseProjectFolder', async () => {
  if (!mainWindow) {
    return { canceled: true, status: await getWorkspaceStatus() }
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true, status: await getWorkspaceStatus() }
  }

  const chosen = result.filePaths[0]
  if (isAppBundlePath(chosen)) {
    return {
      canceled: false,
      error: 'Cannot use an application bundle (.app) as a project folder. Please pick a regular folder.',
      status: await getWorkspaceStatus(),
    }
  }

  const status = configureWorkspace(chosen)
  await restartFileWatcher()
  return { canceled: false, status }
})

ipcMain.handle('workspace:createStarterRoadmap', async () => {
  const status = await getWorkspaceStatus()
  if (!status.projectRoot) {
    throw new Error('Choose a project folder before creating a roadmap.')
  }

  const result = createStarterRoadmap(status.projectRoot)
  await restartFileWatcher()
  return result
})

ipcMain.handle('workspace:importRoadmap', async () => {
  const status = await getWorkspaceStatus()
  if (!status.projectRoot || !mainWindow) {
    throw new Error('Choose a project folder before importing a roadmap.')
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown'] },
      { name: 'All files', extensions: ['*'] },
    ],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true, status }
  }

  const imported = importRoadmap(status.projectRoot, result.filePaths[0])
  await restartFileWatcher()
  return { canceled: false, ...imported }
})

ipcMain.handle('workspace:importManifesto', async () => {
  const status = await getWorkspaceStatus()
  if (!status.projectRoot || !mainWindow) {
    throw new Error('Choose a project folder before importing a manifesto.')
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown'] },
      { name: 'All files', extensions: ['*'] },
    ],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true, status }
  }

  const imported = importManifesto(status.projectRoot, result.filePaths[0])
  await restartFileWatcher()
  return { canceled: false, ...imported }
})

ipcMain.handle('workspace:createStarterManifesto', async () => {
  const status = await getWorkspaceStatus()
  if (!status.projectRoot) {
    throw new Error('Choose a project folder before creating a manifesto.')
  }

  const result = createStarterManifesto(status.projectRoot)
  await restartFileWatcher()
  return result
})

ipcMain.handle('workspace:generateTracker', async () => {
  const status = await getWorkspaceStatus()
  const result = generateTrackerForWorkspace(status)
  await restartFileWatcher()
  return result
})

ipcMain.handle('git:commit-and-push', async () => {
  return commitAndPush()
})

// ─── Settings IPC ────────────────────────────────────────────────────────────

ipcMain.handle('settings:get', async (): Promise<AppSettings> => {
  return readSettings()
})

ipcMain.handle(
  'settings:set',
  async (_event, next: Partial<AppSettings>): Promise<AppSettings> => {
    return writeSettings(next || {})
  }
)

ipcMain.handle(
  'settings:getGithubCloneParentFolder',
  async (): Promise<{ path: string; isDefault: boolean }> => {
    const stored = readSettings().githubCloneParentFolder
    const effective = stored || getDefaultGithubCloneParentFolder()
    return { path: effective, isDefault: !stored }
  }
)

ipcMain.handle(
  'settings:pickGithubCloneParentFolder',
  async (): Promise<{ canceled: boolean; path?: string; error?: string }> => {
    if (!mainWindow) return { canceled: true }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose where GitHub repos should be cloned',
      properties: ['openDirectory', 'createDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true }
    }

    const chosen = result.filePaths[0]
    if (isAppBundlePath(chosen)) {
      return {
        canceled: false,
        error: 'Cannot use an application bundle (.app) as a clone destination.',
      }
    }

    writeSettings({ githubCloneParentFolder: chosen })
    return { canceled: false, path: chosen }
  }
)

ipcMain.handle(
  'settings:setGithubCloneParentFolder',
  async (
    _event,
    path: string | null
  ): Promise<{ ok: boolean; path?: string | null; error?: string }> => {
    if (path && isAppBundlePath(path)) {
      return {
        ok: false,
        error: 'Cannot use an application bundle (.app) as a clone destination.',
      }
    }
    const next = writeSettings({ githubCloneParentFolder: path })
    return { ok: true, path: next.githubCloneParentFolder }
  }
)

// ─── GitHub IPC ──────────────────────────────────────────────────────────────

ipcMain.handle('github:hasToken', async () => {
  return hasToken()
})

ipcMain.handle(
  'github:setToken',
  async (
    _event,
    token: string
  ): Promise<{ ok: boolean; login?: string; scopes?: string[]; error?: string }> => {
    const validation = await validateToken(token)
    if (!validation.ok) {
      return { ok: false, error: validation.error, scopes: validation.scopes }
    }

    try {
      setToken(token)
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }

    return { ok: true, login: validation.login, scopes: validation.scopes }
  }
)

ipcMain.handle('github:clearToken', async () => {
  clearToken()
})

ipcMain.handle(
  'github:listRepos',
  async (): Promise<{ ok: true; repos: GitHubRepoSummary[] } | { ok: false; error: string }> => {
    const token = getStoredToken()
    if (!token) {
      return { ok: false, error: 'No GitHub token configured.' }
    }

    try {
      const repos = await listRepos(token)
      return { ok: true, repos }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
)

ipcMain.handle(
  'workspace:cloneFromGitHub',
  async (_event, payload: { fullName: string; cloneUrl: string }) => {
    if (!mainWindow) {
      return { canceled: true, status: await getWorkspaceStatus() }
    }

    const destParentDir = getGithubCloneParentFolder()

    if (isAppBundlePath(destParentDir)) {
      return {
        canceled: false,
        error: 'GitHub clone destination is an .app bundle. Update it from Settings.',
        status: await getWorkspaceStatus(),
      }
    }

    try {
      try {
        fs.mkdirSync(destParentDir, { recursive: true })
      } catch (err) {
        return {
          canceled: false,
          error: `Could not create clone destination ${destParentDir}: ${
            err instanceof Error ? err.message : String(err)
          }`,
          status: await getWorkspaceStatus(),
        }
      }

      const token = getStoredToken()
      const result = await cloneAndConfigureWorkspace({
        fullName: payload.fullName,
        cloneUrl: payload.cloneUrl,
        destParentDir,
        token,
      })
      await restartFileWatcher()
      return { canceled: false, status: result.status, cloned: result.cloned }
    } catch (err) {
      return {
        canceled: false,
        error: err instanceof Error ? err.message : String(err),
        status: await getWorkspaceStatus(),
      }
    }
  }
)

// ─── App Lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  createWindow()
  await restartFileWatcher()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopFileWatcher()
})
