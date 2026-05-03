import { useState } from 'react'
import { GitHubBrowserModal } from '../components/GitHubBrowserModal'
import { SettingsModal } from '../components/SettingsModal'
import { loadTrackerFromWorkspace, useStore } from '../store'

async function activateWorkspace() {
  const result = await window.api.workspace.generateTracker()
  useStore.getState().setWorkspaceStatus(result.status)
  await loadTrackerFromWorkspace()
}

export function OnboardingView() {
  const { workspaceStatus, loading, error, setLoading, setError, setTracker, setWorkspaceStatus } = useStore()
  const [githubOpen, setGithubOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  async function withAction(action: () => Promise<void>) {
    setLoading(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const projectRoot = workspaceStatus?.projectRoot
  const roadmapExists = Boolean(workspaceStatus?.roadmapExists)
  const manifestoExists = Boolean(workspaceStatus?.manifestoExists)
  const trackerExists = Boolean(workspaceStatus?.trackerExists)
  const canResume = Boolean(projectRoot && trackerExists)

  const projectLabel = projectRoot ? projectRoot.split('/').filter(Boolean).pop() || projectRoot : null

  const primaryBtn =
    'rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div className="min-h-screen bg-dark text-white flex items-start justify-center px-6 overflow-y-auto py-10 scroll-left">
      <div className="w-full max-w-6xl rounded-2xl border border-border bg-panel/80 p-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono tracking-[0.2em] text-accent uppercase mb-3">
              JYRY Command Center
            </p>
            <h1 className="text-3xl font-semibold mb-3">Activate this workspace with a roadmap</h1>
            <p className="text-sm text-muted leading-6 max-w-2xl">
              Pick a local folder, clone a project from GitHub, or scaffold a starter
              roadmap — the tracker is generated automatically once{' '}
              <code className="text-accent font-mono">docs/roadmap.md</code> exists.
            </p>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-md border border-border bg-dark/60 hover:bg-white/5 text-muted hover:text-white transition-colors cursor-pointer"
            title="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        {canResume && (
          <div className="mb-6 rounded-xl border border-accent/40 bg-accent/10 p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.18em] text-accent uppercase mb-1">
                Current project
              </p>
              <h2 className="text-base font-semibold truncate">{projectLabel}</h2>
              <p className="text-xs font-mono text-muted truncate mt-0.5">{projectRoot}</p>
            </div>
            <button
              className="flex-shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
              onClick={() => withAction(async () => {
                await loadTrackerFromWorkspace()
              })}
            >
              {loading ? 'Loading…' : 'Return to project'}
            </button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <div className="rounded-xl border border-border bg-dark/60 p-5 flex flex-col">
            <h2 className="text-sm font-semibold mb-2">1. Choose Local Project Folder</h2>
            <p className="text-sm text-muted mb-4 flex-1">
              Select a project folder from your device to connect it to Command Center.
            </p>
            <div>
              <button
                className={primaryBtn}
                disabled={loading}
                onClick={() => withAction(async () => {
                  const result = await window.api.workspace.chooseProjectFolder()
                  setWorkspaceStatus(result.status)
                  if (result.canceled) return
                  if ('error' in result && result.error) {
                    setError(result.error)
                    return
                  }
                  setTracker(null)
                  if (result.status.trackerExists) {
                    await loadTrackerFromWorkspace()
                  } else if (result.status.roadmapExists) {
                    await activateWorkspace()
                  }
                })}
              >
                {projectRoot ? 'Choose Different Folder' : 'Choose Folder'}
              </button>
            </div>
            {projectRoot && (
              <p className="mt-3 text-xs font-mono text-muted break-all">{projectRoot}</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-dark/60 p-5 flex flex-col">
            <h2 className="text-sm font-semibold mb-2">2. Choose a cloud project from GitHub.</h2>
            <p className="text-sm text-muted mb-4 flex-1">
              Browse repositories on GitHub and select a cloud-based project to work
              with or integrate into your workflow.
            </p>
            <div>
              <button
                className={primaryBtn}
                disabled={loading}
                onClick={() => setGithubOpen(true)}
              >
                Connect to GitHub
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-dark/60 p-5 mb-8">
          <h2 className="text-sm font-semibold mb-1">3. Add roadmap.md & manifesto.md</h2>
          <p className="text-sm text-muted mb-4">
            Use existing files or let the app scaffold a starter set. The tracker is
            generated and the dashboard opens automatically after you import or create
            <code className="text-accent font-mono mx-1">roadmap.md</code>.
          </p>

          <div className="flex flex-wrap gap-4 mb-5">
            <StatusBadge label="docs/roadmap.md" present={roadmapExists} />
            <StatusBadge label="docs/manifesto.md" present={manifestoExists} />
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-muted uppercase mb-2">
                roadmap.md
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  className={primaryBtn}
                  disabled={!projectRoot || loading}
                  onClick={() => withAction(async () => {
                    const result = await window.api.workspace.importRoadmap()
                    setWorkspaceStatus(result.status)
                    if (!result.canceled) {
                      await activateWorkspace()
                    }
                  })}
                >
                  Import roadmap.md
                </button>
                <button
                  className={primaryBtn}
                  disabled={!projectRoot || loading}
                  onClick={() => withAction(async () => {
                    const result = await window.api.workspace.createStarterRoadmap()
                    setWorkspaceStatus(result.status)
                    await activateWorkspace()
                  })}
                >
                  Create roadmap.md
                </button>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-muted uppercase mb-2">
                manifesto.md <span className="text-muted/60">(optional)</span>
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  className={primaryBtn}
                  disabled={!projectRoot || loading}
                  onClick={() => withAction(async () => {
                    const result = await window.api.workspace.importManifesto()
                    setWorkspaceStatus(result.status)
                  })}
                >
                  Import manifesto.md
                </button>
                <button
                  className={primaryBtn}
                  disabled={!projectRoot || loading}
                  onClick={() => withAction(async () => {
                    const result = await window.api.workspace.createStarterManifesto()
                    setWorkspaceStatus(result.status)
                  })}
                >
                  Create manifesto.md
                </button>
              </div>
            </div>
          </div>

          {!projectRoot && (
            <p className="mt-4 text-xs text-muted">
              Pick a local folder or connect to GitHub above to enable these actions.
            </p>
          )}
          {projectRoot && roadmapExists && !trackerExists && (
            <p className="mt-4 text-xs text-emerald-300">
              Roadmap detected. The next import/create action will activate the dashboard.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-dark/60 p-5">
          <h2 className="text-sm font-semibold mb-3">How it works</h2>
          <pre className="overflow-x-auto text-xs leading-6 text-muted font-mono">
{`pick a project source                  ┌──────────────────────────────┐
─────────────────────                  │ docs/roadmap.md exists?      │
                                       └──────────────────────────────┘
1. local project folder ───┐                       │
                           │                       │── yes ─► tracker auto-generates
2. github repo (PAT)      ─┤    project folder  ───┤           ─► open dashboard
   (clones to your saved   │                       │
    parent folder, set in  │                       │── no  ─► Import OR Create roadmap.md
    Settings → "GitHub     │                       │           on card 3 — tracker auto-
    clone destination")    │                       │           generates ─► open dashboard
                           │                       │
3. scaffold from card 3 ──┘                        │
   (only after you've                              ▼
    picked a folder)                          open dashboard

manifesto.md (optional but recommended):
  ✓ green check if found in docs/manifesto.md
  ✗ red X if missing — use Import or Create manifesto.md on card 3
  (feeds product context to agents during build/audit cycles)

notes:
- roadmap.md MUST be Markdown (.md). The file name must be exactly roadmap.md.
- after any Import/Create on roadmap.md, the tracker auto-generates and the
  dashboard opens immediately — no extra activation step.
- after Create roadmap.md / manifesto.md you can keep them local or push to
  GitHub from the existing commit-and-push button.`}
          </pre>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </div>

      <GitHubBrowserModal open={githubOpen} onClose={() => setGithubOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

function StatusBadge({ label, present }: { label: string; present: boolean }) {
  const color = present ? '#22C55E' : '#EF4444'
  const symbol = present ? '✓' : '✗'
  return (
    <div
      className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5"
      style={{
        borderColor: color + '60',
        backgroundColor: color + '12',
      }}
    >
      <span
        className="text-sm font-bold leading-none"
        style={{ color }}
      >
        {symbol}
      </span>
      <span className="text-xs font-mono text-white/85">{label}</span>
    </div>
  )
}
