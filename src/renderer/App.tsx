import { useEffect, useState } from 'react'
import { useStore, initStore, type AccentColor } from './store'
import i18n from './i18n'
import { TabBar } from './components/TabBar'
import { StatusBar } from './components/StatusBar'
import { SettingsModal } from './components/SettingsModal'
import { SwimLaneView } from './views/SwimLaneView'
import { TaskBoard } from './views/TaskBoard'
import { AgentHubPlaceholder } from './views/AgentHubPlaceholder'
import { CalendarView } from './views/CalendarView'
import { QAView } from './views/QAView'
import { BirdsEyeView } from './views/BirdsEyeView'
import { ReviewDebugView } from './views/ReviewDebugView'
import { OnboardingView } from './views/OnboardingView'

// ─── Accent color presets ────────────────────────────────────────────────────

const ACCENT_PRESETS: Record<AccentColor, { primary: string; secondary: string; darkBg?: string }> = {
  indigo:     { primary: '#585CF0', secondary: '#8286FF' },
  'black-ice': { primary: '#94A3B8', secondary: '#CBD5E1', darkBg: '#070B12' },
  emerald:    { primary: '#10B981', secondary: '#34D399' },
  amethyst:   { primary: '#A855F7', secondary: '#C084FC' },
}

function applyAccent(accent: AccentColor, theme: string) {
  const preset = ACCENT_PRESETS[accent]
  const root = document.documentElement
  root.style.setProperty('--accent-primary', preset.primary)
  root.style.setProperty('--accent-secondary', preset.secondary)
  if (accent === 'black-ice') {
    root.style.setProperty('--theme-dark', preset.darkBg ?? '#070B12')
    root.style.setProperty('--theme-surface', '#0D1117')
    root.style.setProperty('--theme-border', '#1C2333')
  } else if (theme === 'dark') {
    root.style.setProperty('--theme-dark', '#0A0A10')
    root.style.setProperty('--theme-surface', '#111118')
    root.style.setProperty('--theme-border', '#1a1a2e')
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function HomeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase text-muted hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      title="Return to JYRY Command Center home"
    >
      <span className="text-accent">⌘</span>
      <span>JYRY</span>
    </button>
  )
}

function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted/20 transition-colors text-muted hover:text-primary-text cursor-pointer"
      title="Settings"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const { loading, activeTab, tracker, theme, accentColor, language } = useStore()
  const setTracker = useStore((s) => s.setTracker)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    initStore().catch(err => console.error('Failed to initialize store:', err))
  }, [])

  // Apply dark/light theme
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    applyAccent(accentColor, theme)
  }, [theme])

  // Apply accent color
  useEffect(() => {
    applyAccent(accentColor, theme)
  }, [accentColor])

  // Apply language direction + sync i18next
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    i18n.changeLanguage(language)
  }, [language])

  if (loading) {
    return (
      <div className="h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-muted font-mono">Loading tracker...</p>
        </div>
      </div>
    )
  }

  if (!tracker) {
    return <OnboardingView />
  }

  return (
    <div className="h-screen bg-dark flex flex-col">
      {/* Draggable title bar region for macOS */}
      <div
        className="h-12 flex-shrink-0 flex items-center"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-3 w-full px-4" style={{ paddingLeft: '80px' }}>
          <HomeButton onClick={() => setTracker(null)} />
          <TabBar />
          <div className="flex-1" />
          <StatusBar />
          <SettingsButton onClick={() => setSettingsOpen(true)} />
        </div>
      </div>

      {/* View area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'swim-lane' && <SwimLaneView />}
        {activeTab === 'task-board' && <TaskBoard />}
        {activeTab === 'agent-hub' && <AgentHubPlaceholder />}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'qa' && <QAView />}
        {activeTab === 'birds-eye' && <BirdsEyeView />}
        {activeTab === 'review-debug' && <ReviewDebugView />}
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
