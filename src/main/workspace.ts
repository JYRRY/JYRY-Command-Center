import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'

import { app } from 'electron'
import { cloneRepo } from './git'
import { parseAndGenerate } from './parser'
import { isAppBundlePath } from './utils/path-guards'

function getWorkspaceConfigPath(): string {
  return join(app.getPath('userData'), 'workspace.json')
}

export interface WorkspaceConfig {
  projectRoot: string
  profile: 'generic'
  trackerFile?: string
  roadmapPath?: string
  manifestoPath?: string
  sourceRepo?: { fullName: string; cloneUrl: string }
}

export interface WorkspaceStatus {
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

function starterRoadmapContent() {
  return `# THE BUILD ROADMAP

### WEEK 1 — Bootstrap the project
- [ ] Review and replace these starter roadmap tasks with your real milestone plan
- [ ] Dry-run the parser before the first tracker write
- [ ] Generate the tracker from \`docs/roadmap.md\`

### WEEK 2 — First execution pass
- [ ] Open the swim lane and task board against the generated tracker
- [ ] Prepare prompts for the non-small work
- [ ] Start the first build wave
`
}

function starterManifestoContent() {
  return `# Project Manifesto

This project uses JYRY Command Center as a local tracker-driven workflow.

## Principles

- Keep \`docs/roadmap.md\` as the task source of truth.
- Keep the tracker local and file-based.
- Dry-run before every tracker write.
- Expand the roadmap before real build work begins.
`
}

function resolveConfigPaths(config: WorkspaceConfig): WorkspaceStatus {
  const projectRoot = resolve(config.projectRoot)
  const trackerPath = join(projectRoot, config.trackerFile || 'command-center-tracker.json')
  const roadmapPath = join(projectRoot, config.roadmapPath || 'docs/roadmap.md')
  const manifestoPath = join(projectRoot, config.manifestoPath || 'docs/manifesto.md')

  return {
    configured: true,
    source: 'workspace-config',
    profile: config.profile,
    projectRoot,
    trackerPath,
    trackerExists: existsSync(trackerPath),
    roadmapPath,
    roadmapExists: existsSync(roadmapPath),
    manifestoPath,
    manifestoExists: existsSync(manifestoPath),
  }
}

export function loadWorkspaceConfig(): WorkspaceConfig | null {
  const configPath = getWorkspaceConfigPath()
  if (!existsSync(configPath)) return null

  try {
    const parsed = JSON.parse(readFileSync(configPath, 'utf-8'))
    if (!parsed || typeof parsed !== 'object' || typeof parsed.projectRoot !== 'string') {
      return null
    }

    if (isAppBundlePath(parsed.projectRoot)) {
      return null
    }

    let sourceRepo: WorkspaceConfig['sourceRepo']
    if (
      parsed.sourceRepo &&
      typeof parsed.sourceRepo === 'object' &&
      typeof parsed.sourceRepo.fullName === 'string' &&
      typeof parsed.sourceRepo.cloneUrl === 'string'
    ) {
      sourceRepo = { fullName: parsed.sourceRepo.fullName, cloneUrl: parsed.sourceRepo.cloneUrl }
    }

    return {
      projectRoot: parsed.projectRoot,
      profile: 'generic',
      trackerFile: typeof parsed.trackerFile === 'string' ? parsed.trackerFile : undefined,
      roadmapPath: typeof parsed.roadmapPath === 'string' ? parsed.roadmapPath : undefined,
      manifestoPath: typeof parsed.manifestoPath === 'string' ? parsed.manifestoPath : undefined,
      sourceRepo,
    }
  } catch {
    return null
  }
}

export function saveWorkspaceConfig(config: WorkspaceConfig) {
  const configPath = getWorkspaceConfigPath()
  mkdirSync(dirname(configPath), { recursive: true })
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

export async function getWorkspaceStatus(): Promise<WorkspaceStatus> {
  const workspaceConfig = loadWorkspaceConfig()
  if (workspaceConfig) {
    return resolveConfigPaths(workspaceConfig)
  }

  try {
    const config = await import('./config')
    return {
      configured: true,
      source: 'env',
      profile: config.PROFILE_ID || null,
      projectRoot: config.PROJECT_ROOT || null,
      trackerPath: config.TRACKER_PATH || null,
      trackerExists: Boolean(config.TRACKER_PATH && existsSync(config.TRACKER_PATH)),
      roadmapPath: config.DOCS_PATHS?.roadmap || null,
      roadmapExists: Boolean(config.DOCS_PATHS?.roadmap && existsSync(config.DOCS_PATHS.roadmap)),
      manifestoPath: config.DOCS_PATHS?.manifesto || null,
      manifestoExists: Boolean(config.DOCS_PATHS?.manifesto && existsSync(config.DOCS_PATHS.manifesto)),
    }
  } catch {
    return {
      configured: false,
      source: null,
      profile: null,
      projectRoot: null,
      trackerPath: null,
      trackerExists: false,
      roadmapPath: null,
      roadmapExists: false,
      manifestoPath: null,
      manifestoExists: false,
    }
  }
}

export function configureWorkspace(projectRoot: string): WorkspaceStatus {
  const config: WorkspaceConfig = {
    projectRoot,
    profile: 'generic',
    trackerFile: 'command-center-tracker.json',
    roadmapPath: 'docs/roadmap.md',
    manifestoPath: 'docs/manifesto.md',
  }

  saveWorkspaceConfig(config)
  return resolveConfigPaths(config)
}

export function createStarterRoadmap(projectRoot: string) {
  const docsRoot = join(projectRoot, 'docs')
  const roadmapPath = join(docsRoot, 'roadmap.md')
  const manifestoPath = join(docsRoot, 'manifesto.md')
  const created: string[] = []

  mkdirSync(docsRoot, { recursive: true })

  if (!existsSync(roadmapPath)) {
    writeFileSync(roadmapPath, starterRoadmapContent(), 'utf-8')
    created.push('docs/roadmap.md')
  }

  if (!existsSync(manifestoPath)) {
    writeFileSync(manifestoPath, starterManifestoContent(), 'utf-8')
    created.push('docs/manifesto.md')
  }

  return { created, status: configureWorkspace(projectRoot) }
}

export interface CloneAndConfigureOptions {
  fullName: string
  cloneUrl: string
  destParentDir: string
  token?: string | null
}

export async function cloneAndConfigureWorkspace(
  options: CloneAndConfigureOptions
): Promise<{ status: WorkspaceStatus; cloned: string }> {
  const { fullName, cloneUrl, destParentDir, token } = options
  const repoName = fullName.split('/').pop() || fullName
  const destPath = join(resolve(destParentDir), repoName)

  if (isAppBundlePath(destParentDir) || isAppBundlePath(destPath)) {
    throw new Error(
      'Cannot clone into an .app bundle path. Reset your GitHub clone destination from Settings.'
    )
  }

  if (existsSync(destPath)) {
    const config: WorkspaceConfig = {
      projectRoot: destPath,
      profile: 'generic',
      trackerFile: 'command-center-tracker.json',
      roadmapPath: 'docs/roadmap.md',
      manifestoPath: 'docs/manifesto.md',
      sourceRepo: { fullName, cloneUrl },
    }
    saveWorkspaceConfig(config)
    return { status: resolveConfigPaths(config), cloned: destPath }
  }

  await cloneRepo({ cloneUrl, destDir: destPath, token: token ?? null })

  const config: WorkspaceConfig = {
    projectRoot: destPath,
    profile: 'generic',
    trackerFile: 'command-center-tracker.json',
    roadmapPath: 'docs/roadmap.md',
    manifestoPath: 'docs/manifesto.md',
    sourceRepo: { fullName, cloneUrl },
  }

  saveWorkspaceConfig(config)
  return { status: resolveConfigPaths(config), cloned: destPath }
}

export function importRoadmap(projectRoot: string, sourcePath: string) {
  const targetPath = join(projectRoot, 'docs', 'roadmap.md')
  mkdirSync(dirname(targetPath), { recursive: true })
  copyFileSync(sourcePath, targetPath)
  return { imported: targetPath, status: configureWorkspace(projectRoot) }
}

export function importManifesto(projectRoot: string, sourcePath: string) {
  const targetPath = join(projectRoot, 'docs', 'manifesto.md')
  mkdirSync(dirname(targetPath), { recursive: true })
  copyFileSync(sourcePath, targetPath)
  return { imported: targetPath, status: configureWorkspace(projectRoot) }
}

export function createStarterManifesto(projectRoot: string) {
  const docsRoot = join(projectRoot, 'docs')
  const manifestoPath = join(docsRoot, 'manifesto.md')
  mkdirSync(docsRoot, { recursive: true })

  const created: string[] = []
  if (!existsSync(manifestoPath)) {
    writeFileSync(manifestoPath, starterManifestoContent(), 'utf-8')
    created.push('docs/manifesto.md')
  }

  return { created, status: configureWorkspace(projectRoot) }
}

export function generateTrackerForWorkspace(status: WorkspaceStatus) {
  if (!status.projectRoot || !status.roadmapPath || !status.trackerPath) {
    throw new Error('Workspace is not configured.')
  }

  if (!status.roadmapExists) {
    throw new Error(`Roadmap not found at ${status.roadmapPath}.`)
  }

  const checklistPath = join(status.projectRoot, 'docs/submission-checklist.md')
  const result = parseAndGenerate({
    roadmapPath: status.roadmapPath,
    checklistPath: existsSync(checklistPath) ? checklistPath : null,
    outputPath: status.trackerPath,
  })

  return {
    ...result,
    status: resolveConfigPaths(loadWorkspaceConfig() || {
      projectRoot: status.projectRoot,
      profile: 'generic',
    }),
  }
}
