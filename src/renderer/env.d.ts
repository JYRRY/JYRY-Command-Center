/// <reference types="vite/client" />

interface TrackerAPI {
  read(): Promise<string | null>
  write(json: string): Promise<{ success: boolean; error?: string }>
  getPath(): Promise<string | null>
  getFileInfo(): Promise<{
    exists: boolean
    size: number
    lastModified: string | null
    watcherActive: boolean
  }>
  onUpdated(callback: (json: string) => void): () => void
}

interface WorkspaceStatus {
  configured: boolean
  source: 'workspace-config' | 'env' | null
  profile: 'generic' | 'jyry' | null
  projectRoot: string | null
  trackerPath: string | null
  trackerExists: boolean
  roadmapPath: string | null
  roadmapExists: boolean
  manifestoPath: string | null
  manifestoExists: boolean
}

interface WorkspaceAPI {
  getStatus(): Promise<WorkspaceStatus>
  chooseProjectFolder(): Promise<{ canceled: boolean; status: WorkspaceStatus }>
  createStarterRoadmap(): Promise<{ created: string[]; status: WorkspaceStatus }>
  importRoadmap(): Promise<{ canceled: boolean; imported?: string; status: WorkspaceStatus }>
  generateTracker(): Promise<{
    state: unknown
    counts: { milestones: number; subtasks: number; categories: number; checklistItems: number }
    status: WorkspaceStatus
  }>
  cloneFromGitHub(payload: { fullName: string; cloneUrl: string }): Promise<
    | { canceled: false; status: WorkspaceStatus; cloned: string }
    | { canceled: true; status: WorkspaceStatus }
    | { canceled: false; error: string; status: WorkspaceStatus }
  >
}

interface GitHubRepoSummary {
  id: number
  fullName: string
  name: string
  owner: string
  private: boolean
  description: string | null
  defaultBranch: string
  cloneUrl: string
  updatedAt: string | null
}

interface GitHubAPI {
  hasToken(): Promise<boolean>
  setToken(
    token: string
  ): Promise<{ ok: boolean; login?: string; scopes?: string[]; error?: string }>
  clearToken(): Promise<void>
  listRepos(): Promise<
    { ok: true; repos: GitHubRepoSummary[] } | { ok: false; error: string }
  >
}

interface AppSettingsShape {
  operatorName: string | null
}

interface SettingsAPI {
  get(): Promise<AppSettingsShape>
  set(next: Partial<AppSettingsShape>): Promise<AppSettingsShape>
}

type GitResult =
  | { status: 'success'; message: string; branch: string; filesChanged: number }
  | { status: 'nothing' }
  | { status: 'error'; error: string }

interface GitAPI {
  commitAndPush(): Promise<GitResult>
}

interface Window {
  api: {
    platform: string
    tracker: TrackerAPI
    workspace: WorkspaceAPI
    git: GitAPI
    github: GitHubAPI
    settings: SettingsAPI
  }
}
