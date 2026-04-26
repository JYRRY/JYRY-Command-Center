import { useState } from 'react'
import { GitHubBrowserModal } from '../components/GitHubBrowserModal'
import { loadTrackerFromWorkspace, useStore } from '../store'

async function activateWorkspace() {
  const result = await window.api.workspace.generateTracker()
  useStore.getState().setWorkspaceStatus(result.status)
  await loadTrackerFromWorkspace()
}

export function OnboardingView() {
  const { workspaceStatus, loading, error, setLoading, setError, setTracker, setWorkspaceStatus } = useStore()
  const [githubOpen, setGithubOpen] = useState(false)

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
  const trackerExists = Boolean(workspaceStatus?.trackerExists)

  return (
    <div className="min-h-screen bg-dark text-white flex items-center justify-center px-6 overflow-y-auto py-10">
      <div className="w-full max-w-6xl rounded-2xl border border-border bg-panel/80 p-8">
        <div className="mb-8">
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

        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <div className="rounded-xl border border-border bg-dark/60 p-5 flex flex-col">
            <h2 className="text-sm font-semibold mb-2">1. Choose Local Project Folder</h2>
            <p className="text-sm text-muted mb-4 flex-1">
              Select a project folder from your device to connect it to Command Center.
            </p>
            <div>
              <button
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
                onClick={() => withAction(async () => {
                  const result = await window.api.workspace.chooseProjectFolder()
                  setWorkspaceStatus(result.status)
                  setTracker(null)
                  if (result.canceled) return
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
                className="rounded-md border border-accent/60 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent cursor-pointer transition-colors hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
                onClick={() => setGithubOpen(true)}
              >
                Connect to GitHub
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-dark/60 p-5 mb-8">
          <h2 className="text-sm font-semibold mb-2">3. Add roadmap.md</h2>
          <p className="text-sm text-muted mb-4">
            Use an existing roadmap or let the app scaffold a starter roadmap and manifesto.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/5"
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
              className="rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/5"
              disabled={!projectRoot || loading}
              onClick={() => withAction(async () => {
                const result = await window.api.workspace.createStarterRoadmap()
                setWorkspaceStatus(result.status)
                await activateWorkspace()
              })}
            >
              Create roadmap.md
            </button>
            <button
              className="rounded-md border border-accent/60 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent cursor-pointer transition-colors hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent/10"
              disabled={!projectRoot || !roadmapExists || trackerExists || loading}
              onClick={() => withAction(async () => {
                await activateWorkspace()
              })}
            >
              Activate Command Center
            </button>
          </div>
          {!projectRoot && (
            <p className="mt-3 text-xs text-muted">
              Pick a local folder or connect to GitHub above to enable these actions.
            </p>
          )}
          {roadmapExists && (
            <p className="mt-3 text-xs text-emerald-300">
              Roadmap detected. The next activation will populate the dashboard.
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
                           │                       │── yes ─► generate tracker ─► open dashboard
2. github repo (PAT)      ─┼──► project folder  ───┤
   (clone via Connect)     │                       │── no  ─► import OR create roadmap.md
                           │                       │           (+ manifesto.md)
3. scaffold from card 3 ──┘                        │              │
   (after card 1 picks                             │              ▼
    an empty folder)                               │         generate tracker
                                                   │              │
                                                   ▼              ▼
                                                              open dashboard

note: the roadmap file MUST be named roadmap.md (Markdown only).
after "create roadmap.md" you can keep it local or push to GitHub from
the existing commit-and-push button.`}
          </pre>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </div>

      <GitHubBrowserModal open={githubOpen} onClose={() => setGithubOpen(false)} />
    </div>
  )
}
