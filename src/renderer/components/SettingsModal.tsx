import { useEffect, useState } from 'react'
import { loadTrackerFromWorkspace, useStore } from '../store'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const setTracker = useStore((s) => s.setTracker)
  const setWorkspaceStatus = useStore((s) => s.setWorkspaceStatus)

  const [operatorName, setOperatorName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [hasGithubToken, setHasGithubToken] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    setFeedback(null)
    Promise.all([window.api.settings.get(), window.api.github.hasToken()]).then(
      ([settings, tokenPresent]) => {
        if (cancelled) return
        setOperatorName(settings.operatorName ?? '')
        setHasGithubToken(tokenPresent)
      }
    )

    return () => {
      cancelled = true
    }
  }, [open])

  if (!open) return null

  async function saveOperatorName() {
    setSavingName(true)
    setFeedback(null)
    try {
      const trimmed = operatorName.trim()
      await window.api.settings.set({ operatorName: trimmed.length > 0 ? trimmed : null })
      await loadTrackerFromWorkspace()
      setFeedback('Operator name updated.')
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : String(err))
    } finally {
      setSavingName(false)
    }
  }

  async function disconnectGithub() {
    setBusy(true)
    setFeedback(null)
    try {
      await window.api.github.clearToken()
      setHasGithubToken(false)
      setTracker(null)
      setWorkspaceStatus(null)
      setFeedback('GitHub token cleared. Returning to home…')
      onClose()
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  function returnHome() {
    setTracker(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-panel text-white shadow-xl">
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border">
          <div>
            <p className="text-xs font-mono tracking-[0.2em] text-accent uppercase">
              Settings
            </p>
            <h2 className="text-lg font-semibold mt-1">Workspace preferences</h2>
          </div>
          <button
            className="rounded-md border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-white cursor-pointer transition-colors hover:bg-white/10"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <section className="space-y-2">
            <label className="block text-[10px] font-bold tracking-wider text-muted">
              OPERATOR NAME
            </label>
            <p className="text-xs text-muted leading-5">
              Shown in the Agent Hub and on completed-task records. Default is{' '}
              <span className="font-mono text-accent">JYRY</span>.
            </p>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-md border border-border bg-dark px-3 py-2 text-sm font-mono"
                placeholder="JYRY"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                disabled={savingName || busy}
              />
              <button
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={saveOperatorName}
                disabled={savingName || busy}
              >
                {savingName ? 'Saving…' : 'Save'}
              </button>
            </div>
          </section>

          <section className="space-y-2">
            <label className="block text-[10px] font-bold tracking-wider text-muted">
              JYRY COMMAND CENTER
            </label>
            <button
              className="w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={returnHome}
              disabled={busy}
            >
              Return Home
            </button>
          </section>

          <section className="space-y-2">
            <label className="block text-[10px] font-bold tracking-wider text-muted">
              GITHUB
            </label>
            <p className="text-xs text-muted leading-5">
              {hasGithubToken
                ? 'A GitHub personal access token is currently saved on this device.'
                : 'No GitHub token is currently saved.'}
            </p>
            <button
              className="w-full text-left rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 cursor-pointer transition-colors hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={disconnectGithub}
              disabled={!hasGithubToken || busy}
            >
              Disconnect GitHub token
            </button>
          </section>

          <section className="rounded-md border border-dashed border-border px-4 py-3">
            <p className="text-[10px] font-bold tracking-wider text-muted mb-1">
              COMING SOON
            </p>
            <p className="text-xs text-muted leading-5">
              Language switcher, theme color presets, and more controls will appear
              here as new settings ship.
            </p>
          </section>

          {feedback && (
            <div className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent-light">
              {feedback}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
