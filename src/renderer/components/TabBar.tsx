import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore, type TabId } from '../store'

export function TabBar() {
  const { t } = useTranslation()
  const { activeTab, setActiveTab } = useStore()
  const tracker = useStore((s) => s.tracker)

  const TABS: { id: TabId; icon: string; labelKey: string }[] = [
    { id: 'swim-lane',    icon: '⬡', labelKey: 'nav.swimlane' },
    { id: 'task-board',   icon: '⊞', labelKey: 'nav.taskboard' },
    { id: 'qa',           icon: '◎', labelKey: 'nav.qa' },
    { id: 'agent-hub',    icon: '⚡', labelKey: 'nav.agenthub' },
    { id: 'calendar',     icon: '▦', labelKey: 'nav.calendar' },
    { id: 'birds-eye',    icon: '◈', labelKey: 'nav.birdseye' },
    { id: 'review-debug', icon: '✓', labelKey: 'nav.reviewdebug' },
  ]

  const hasRecentActivity = useMemo(() => {
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000
    return (tracker?.agent_log ?? []).some(
      (entry) => new Date(entry.timestamp).getTime() > thirtyMinAgo
    )
  }, [tracker?.agent_log])

  const hasQAFailure = useMemo(() => {
    const qaFail = (tracker?.qa?.groups ?? []).some((g: any) =>
      g.use_cases.some((uc: any) => uc.agent_status === 'fail' || uc.operator_status === 'fail')
    )
    const fixPending = (tracker?.review_sessions ?? []).some((s: any) =>
      (s.fixes ?? []).some((f: any) => !f.task_id)
    )
    return qaFail || fixPending
  }, [tracker?.qa, tracker?.review_sessions])

  return (
    <div
      className="flex items-center gap-1"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              relative px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150
              flex items-center gap-1.5 cursor-pointer
              ${isActive
                ? 'bg-accent/15 text-accent-light'
                : 'text-muted hover:text-white hover:bg-white/5'
              }
            `}
          >
            <span className="text-sm">{tab.icon}</span>
            {t(tab.labelKey)}
            {tab.id === 'agent-hub' && hasRecentActivity && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent" />
            )}
            {tab.id === 'qa' && hasQAFailure && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-behind" />
            )}
          </button>
        )
      })}
    </div>
  )
}
