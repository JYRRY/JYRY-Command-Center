import { useEffect, useMemo, useState } from 'react'
import { loadTrackerFromWorkspace, useStore } from '../store'

type Stage = 'token' | 'list' | 'cloning' | 'done'

interface GitHubBrowserModalProps {
  open: boolean
  onClose: () => void
}

const TOKEN_HELP_URL =
  'https://github.com/settings/tokens/new?scopes=repo&description=JYRY%20Command%20Center'

function formatRelative(iso: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const day = 86400000
  if (diff < day) return 'today'
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}w ago`
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))}mo ago`
  return `${Math.floor(diff / (365 * day))}y ago`
}

export function GitHubBrowserModal({ open, onClose }: GitHubBrowserModalProps) {
  const { setWorkspaceStatus } = useStore()

  const [stage, setStage] = useState<Stage>('token')
  const [tokenInput, setTokenInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [login, setLogin] = useState<string | null>(null)
  const [repos, setRepos] = useState<GitHubRepoSummary[]>([])
  const [search, setSearch] = useState('')
  const [progressLabel, setProgressLabel] = useState('')
  const [cloneDestination, setCloneDestination] = useState<string>('')

  useEffect(() => {
    if (!open) return

    let canceled = false
    setError(null)
    setBusy(true)

    ;(async () => {
      const [has, dest] = await Promise.all([
        window.api.github.hasToken(),
        window.api.settings.getGithubCloneParentFolder(),
      ])
      if (canceled) return
      setCloneDestination(dest.path)
      if (has) {
        await loadRepos()
      } else {
        setStage('token')
        setBusy(false)
      }
    })()

    return () => {
      canceled = true
    }
  }, [open])

  async function loadRepos() {
    setBusy(true)
    setError(null)
    setStage('list')
    const result = await window.api.github.listRepos()
    if (result.ok) {
      setRepos(result.repos)
    } else {
      setError(result.error)
      setRepos([])
    }
    setBusy(false)
  }

  async function submitToken() {
    if (!tokenInput.trim()) {
      setError('Paste a token before continuing.')
      return
    }
    setBusy(true)
    setError(null)
    const result = await window.api.github.setToken(tokenInput.trim())
    if (!result.ok) {
      setError(result.error || 'Token validation failed.')
      setBusy(false)
      return
    }
    setLogin(result.login || null)
    setTokenInput('')
    await loadRepos()
  }

  async function disconnect() {
    setBusy(true)
    await window.api.github.clearToken()
    setRepos([])
    setLogin(null)
    setStage('token')
    setBusy(false)
  }

  async function changeCloneDestination() {
    setError(null)
    const result = await window.api.settings.pickGithubCloneParentFolder()
    if (result.canceled) return
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.path) {
      setCloneDestination(result.path)
    }
  }

  async function pickRepo(repo: GitHubRepoSummary) {
    setStage('cloning')
    setProgressLabel(`Cloning ${repo.fullName}…`)
    setError(null)
    setBusy(true)

    const result = await window.api.workspace.cloneFromGitHub({
      fullName: repo.fullName,
      cloneUrl: repo.cloneUrl,
    })

    if (result.canceled) {
      setStage('list')
      setBusy(false)
      return
    }

    if ('error' in result && result.error) {
      setError(result.error)
      setStage('list')
      setBusy(false)
      return
    }

    setWorkspaceStatus(result.status)
    if (result.status.trackerExists) {
      await loadTrackerFromWorkspace()
    } else if (result.status.roadmapExists) {
      setProgressLabel('Generating tracker…')
      const generated = await window.api.workspace.generateTracker()
      setWorkspaceStatus(generated.status)
      await loadTrackerFromWorkspace()
    }
    setStage('done')
    setBusy(false)
    onClose()
  }

  const filteredRepos = useMemo(() => {
    if (!search.trim()) return repos
    const needle = search.trim().toLowerCase()
    return repos.filter(
      (r) =>
        r.fullName.toLowerCase().includes(needle) ||
        r.name.toLowerCase().includes(needle) ||
        (r.description?.toLowerCase().includes(needle) ?? false)
    )
  }, [repos, search])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-panel text-white shadow-xl">
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border">
          <div>
            <p className="text-xs font-mono tracking-[0.2em] text-accent uppercase">
              GitHub
            </p>
            <h2 className="text-lg font-semibold mt-1">
              {stage === 'token' && 'Connect to GitHub'}
              {stage === 'list' && 'Pick a repository'}
              {stage === 'cloning' && 'Cloning repository'}
              {stage === 'done' && 'Done'}
            </h2>
          </div>
          <button
            className="rounded-md border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-white cursor-pointer transition-colors hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/5"
            onClick={onClose}
            disabled={busy && stage === 'cloning'}
          >
            Close
          </button>
        </div>

        <div className="px-6 py-5">
          {stage === 'token' && (
            <div className="space-y-4">
              <p className="text-sm text-muted leading-6">
                Paste a GitHub personal access token with the{' '}
                <code className="text-accent font-mono">repo</code> scope. The token
                is stored locally on your device using the OS keychain.
              </p>
              <a
                href={TOKEN_HELP_URL}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-accent underline cursor-pointer hover:opacity-80"
              >
                Generate a token on GitHub →
              </a>
              <input
                className="w-full rounded-md border border-border bg-dark px-3 py-2 text-sm font-mono"
                placeholder="ghp_..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitToken()
                }}
                disabled={busy}
                spellCheck={false}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={submitToken}
                  disabled={busy}
                >
                  {busy ? 'Validating…' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {stage === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  {login ? `Signed in as ${login}.` : null} {repos.length} repos
                  loaded.
                </p>
                <button
                  className="text-xs text-muted hover:text-white underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={disconnect}
                  disabled={busy}
                >
                  Disconnect token
                </button>
              </div>

              {cloneDestination && (
                <div className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold tracking-wider text-accent uppercase mb-0.5">
                      Clones go to
                    </p>
                    <p className="text-xs font-mono text-white/85 truncate">
                      {cloneDestination}
                    </p>
                  </div>
                  <button
                    className="flex-shrink-0 text-xs text-accent underline cursor-pointer hover:opacity-80"
                    onClick={changeCloneDestination}
                  >
                    Change
                  </button>
                </div>
              )}

              <p className="text-[11px] text-muted leading-5">
                Click any repository below to clone it
                {cloneDestination ? (
                  <>
                    {' '}to{' '}
                    <span className="font-mono text-accent">{cloneDestination}</span>
                  </>
                ) : null}
                .
              </p>

              <input
                className="w-full rounded-md border border-border bg-dark px-3 py-2 text-sm"
                placeholder="Search repositories…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={busy}
              />

              <div className="max-h-80 overflow-y-auto divide-y divide-border rounded-md border border-border">
                {busy && repos.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted">
                    Loading repositories…
                  </div>
                )}

                {!busy && filteredRepos.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted">
                    No repositories match your search.
                  </div>
                )}

                {filteredRepos.map((repo) => (
                  <button
                    key={repo.id}
                    className="w-full text-left px-4 py-3 hover:bg-dark/60 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => pickRepo(repo)}
                    disabled={busy}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{repo.fullName}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                          repo.private
                            ? 'bg-amber-500/20 text-amber-200'
                            : 'bg-emerald-500/20 text-emerald-200'
                        }`}
                      >
                        {repo.private ? 'PRIVATE' : 'PUBLIC'}
                      </span>
                      <span className="ml-auto text-xs text-muted">
                        {formatRelative(repo.updatedAt)}
                      </span>
                    </div>
                    {repo.description && (
                      <p className="mt-1 text-xs text-muted line-clamp-2">
                        {repo.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {stage === 'cloning' && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted">{progressLabel}</p>
              {cloneDestination && (
                <p className="mt-2 text-xs text-muted">
                  Saving to <span className="font-mono text-accent">{cloneDestination}</span>
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
