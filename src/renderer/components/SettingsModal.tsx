import { useEffect, useState } from 'react'
import { loadTrackerFromWorkspace, useStore, type AccentColor } from '../store'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

const ACCENT_OPTIONS: { id: AccentColor; label: string; color: string }[] = [
  { id: 'indigo',     label: 'Indigo',     color: '#585CF0' },
  { id: 'black-ice',  label: 'Black Ice',  color: '#94A3B8' },
  { id: 'emerald',    label: 'Emerald',    color: '#10B981' },
  { id: 'amethyst',   label: 'Amethyst',   color: '#A855F7' },
]

const LANG_OPTIONS: { id: 'en' | 'ar' | 'de'; label: string }[] = [
  { id: 'en', label: 'EN' },
  { id: 'ar', label: 'AR' },
  { id: 'de', label: 'DE' },
]

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const setTracker = useStore((s) => s.setTracker)
  const setWorkspaceStatus = useStore((s) => s.setWorkspaceStatus)
  const accentColor = useStore((s) => s.accentColor)
  const setAccentColor = useStore((s) => s.setAccentColor)
  const language = useStore((s) => s.language)
  const setLanguage = useStore((s) => s.setLanguage)

  const [operatorName, setOperatorName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [hasGithubToken, setHasGithubToken] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [cloneFolder, setCloneFolder] = useState<string>('')
  const [cloneFolderIsDefault, setCloneFolderIsDefault] = useState(true)
  const [pickingClone, setPickingClone] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    setFeedback(null)
    Promise.all([
      window.api.settings.get(),
      window.api.github.hasToken(),
      window.api.settings.getGithubCloneParentFolder(),
    ]).then(([settings, tokenPresent, clone]) => {
      if (cancelled) return
      setOperatorName(settings.operatorName ?? '')
      setHasGithubToken(tokenPresent)
      setCloneFolder(clone.path)
      setCloneFolderIsDefault(clone.isDefault)
    })

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

  async function changeCloneFolder() {
    setPickingClone(true)
    setFeedback(null)
    try {
      const result = await window.api.settings.pickGithubCloneParentFolder()
      if (result.canceled) return
      if (result.error) {
        setFeedback(result.error)
        return
      }
      if (result.path) {
        setCloneFolder(result.path)
        setCloneFolderIsDefault(false)
        setFeedback('GitHub clone destination updated.')
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : String(err))
    } finally {
      setPickingClone(false)
    }
  }

  async function resetCloneFolder() {
    setPickingClone(true)
    setFeedback(null)
    try {
      await window.api.settings.setGithubCloneParentFolder(null)
      const next = await window.api.settings.getGithubCloneParentFolder()
      setCloneFolder(next.path)
      setCloneFolderIsDefault(next.isDefault)
      setFeedback('GitHub clone destination reset to default.')
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : String(err))
    } finally {
      setPickingClone(false)
    }
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
              GITHUB CLONE DESTINATION
            </label>
            <p className="text-xs text-muted leading-5">
              Parent folder where GitHub repos are cloned (set once). Cloned repos
              go into <span className="font-mono text-accent">&lt;folder&gt;/&lt;repo-name&gt;</span>.
            </p>
            <div className="rounded-md border border-border bg-dark px-3 py-2 text-xs font-mono text-white/90 break-all">
              {cloneFolder || '—'}
              {cloneFolderIsDefault && (
                <span className="ml-2 text-[10px] font-sans text-muted">(default)</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={changeCloneFolder}
                disabled={pickingClone || busy}
              >
                {pickingClone ? 'Choosing…' : 'Change folder'}
              </button>
              {!cloneFolderIsDefault && (
                <button
                  className="rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={resetCloneFolder}
                  disabled={pickingClone || busy}
                >
                  Reset to default
                </button>
              )}
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

          <section className="space-y-3">
            <label className="block text-[10px] font-bold tracking-wider text-muted">
              ACCENT COLOR
            </label>
            <div className="flex items-center gap-3">
              {ACCENT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  title={opt.label}
                  onClick={() => setAccentColor(opt.id)}
                  className="flex flex-col items-center gap-1.5 cursor-pointer group"
                >
                  <span
                    className="block w-7 h-7 rounded-full transition-all"
                    style={{
                      background: opt.color,
                      boxShadow: accentColor === opt.id
                        ? `0 0 0 2px var(--theme-dark), 0 0 0 4px ${opt.color}`
                        : 'none',
                      opacity: accentColor === opt.id ? 1 : 0.55,
                    }}
                  />
                  <span className="text-[9px] font-mono text-muted group-hover:text-white transition-colors">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <label className="block text-[10px] font-bold tracking-wider text-muted">
              LANGUAGE
            </label>
            <div className="flex items-center gap-2">
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setLanguage(opt.id)}
                  className="rounded-md px-4 py-1.5 text-xs font-bold cursor-pointer transition-all"
                  style={{
                    background: language === opt.id ? 'var(--accent-primary, #585CF0)' : 'transparent',
                    color: language === opt.id ? '#fff' : 'var(--theme-muted)',
                    border: `1px solid ${language === opt.id ? 'transparent' : 'var(--theme-border)'}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">
              Arabic (AR) switches the interface to right-to-left layout.
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
