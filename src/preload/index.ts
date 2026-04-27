import { contextBridge, ipcRenderer } from 'electron'
import type { GitHubRepoSummary } from '../main/github'
import type { WorkspaceStatus } from '../main/workspace'

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,

  // Tracker file operations
  tracker: {
    read: (): Promise<string | null> => ipcRenderer.invoke('tracker:read'),
    write: (json: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('tracker:write', json),
    getPath: (): Promise<string | null> => ipcRenderer.invoke('tracker:path'),
    getFileInfo: (): Promise<{
      exists: boolean
      size: number
      lastModified: string | null
      watcherActive: boolean
    }> => ipcRenderer.invoke('tracker:fileInfo'),

    // Listen for external file changes
    onUpdated: (callback: (json: string) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, json: string) => callback(json)
      ipcRenderer.on('tracker:updated', handler)
      return () => ipcRenderer.removeListener('tracker:updated', handler)
    },
  },

  workspace: {
    getStatus: (): Promise<WorkspaceStatus> => ipcRenderer.invoke('workspace:getStatus'),
    chooseProjectFolder: (): Promise<{ canceled: boolean; status: WorkspaceStatus }> =>
      ipcRenderer.invoke('workspace:chooseProjectFolder'),
    createStarterRoadmap: (): Promise<{ created: string[]; status: WorkspaceStatus }> =>
      ipcRenderer.invoke('workspace:createStarterRoadmap'),
    importRoadmap: (): Promise<{ canceled: boolean; imported?: string; status: WorkspaceStatus }> =>
      ipcRenderer.invoke('workspace:importRoadmap'),
    generateTracker: (): Promise<{
      state: unknown
      counts: { milestones: number; subtasks: number; categories: number; checklistItems: number }
      status: WorkspaceStatus
    }> => ipcRenderer.invoke('workspace:generateTracker'),
    cloneFromGitHub: (
      payload: { fullName: string; cloneUrl: string }
    ): Promise<
      | { canceled: false; status: WorkspaceStatus; cloned: string }
      | { canceled: true; status: WorkspaceStatus }
      | { canceled: false; error: string; status: WorkspaceStatus }
    > => ipcRenderer.invoke('workspace:cloneFromGitHub', payload),
  },

  github: {
    hasToken: (): Promise<boolean> => ipcRenderer.invoke('github:hasToken'),
    setToken: (
      token: string
    ): Promise<{ ok: boolean; login?: string; scopes?: string[]; error?: string }> =>
      ipcRenderer.invoke('github:setToken', token),
    clearToken: (): Promise<void> => ipcRenderer.invoke('github:clearToken'),
    listRepos: (): Promise<
      { ok: true; repos: GitHubRepoSummary[] } | { ok: false; error: string }
    > => ipcRenderer.invoke('github:listRepos'),
  },

  settings: {
    get: (): Promise<{ operatorName: string | null }> => ipcRenderer.invoke('settings:get'),
    set: (
      next: Partial<{ operatorName: string | null }>
    ): Promise<{ operatorName: string | null }> => ipcRenderer.invoke('settings:set', next),
  },

  // Git operations
  git: {
    commitAndPush: (): Promise<
      | { status: 'success'; message: string; branch: string; filesChanged: number }
      | { status: 'nothing' }
      | { status: 'error'; error: string }
    > => ipcRenderer.invoke('git:commit-and-push'),
  },

})
