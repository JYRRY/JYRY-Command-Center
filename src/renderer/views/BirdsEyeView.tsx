import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore, selectOverallProgress } from '../store'
import type { Milestone } from '../../main/parser'

function domainLabel(domain: string): string {
  return domain
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function domainColor(domain: string): string {
  const palette: Record<string, string> = {
    foundation: '#585CF0',
    product_engines: '#14B8A6',
    merchant_facing: '#5B6EE8',
    ship_and_operate: '#F59E0B',
    backend: '#585CF0',
    frontend: '#5B6EE8',
    compliance: '#F59E0B',
    product_ops: '#14B8A6',
    scoring: '#14B8A6',
    attribution: '#14B8A6',
    autopilot: '#14B8A6',
    quality: '#F59E0B',
    launch: '#F59E0B',
  }
  return palette[domain] ?? '#9B9BAA'
}

function statusBadge(milestone: Milestone) {
  const done = milestone.subtasks.filter((s) => s.done).length
  const total = milestone.subtasks.length
  const all = total > 0 && done === total
  const some = done > 0 && !all
  if (all) return { label: 'Done', color: '#22C55E' }
  if (some) return { label: 'In Progress', color: '#585CF0' }
  return { label: 'To Do', color: '#9B9BAA' }
}

interface DomainGroup {
  domain: string
  milestones: Milestone[]
  done: number
  total: number
}

export function BirdsEyeView() {
  const { t } = useTranslation()
  const tracker = useStore((s) => s.tracker)
  const overallPct = Math.round(selectOverallProgress(tracker) * 100)

  const groups = useMemo<DomainGroup[]>(() => {
    if (!tracker) return []
    const map = new Map<string, Milestone[]>()
    for (const m of tracker.milestones) {
      const key = m.domain || 'general'
      const existing = map.get(key) ?? []
      existing.push(m)
      map.set(key, existing)
    }
    return Array.from(map.entries()).map(([domain, milestones]) => {
      const total = milestones.reduce((s, m) => s + m.subtasks.length, 0)
      const done = milestones.reduce((s, m) => s + m.subtasks.filter((t) => t.done).length, 0)
      return { domain, milestones, done, total }
    })
  }, [tracker])

  if (!tracker || groups.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted text-sm">
        {t('birdseye.noMilestones')}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold">{t('birdseye.title')}</h1>
            <p className="text-sm text-muted mt-0.5">{t('birdseye.subtitle')}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold tracking-wider text-muted mb-1">{t('birdseye.overallProgress').toUpperCase()}</p>
            <div className="flex items-center gap-3">
              <div className="w-32 h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${overallPct}%`, backgroundColor: '#585CF0' }}
                />
              </div>
              <span className="text-sm font-bold text-accent-light font-mono">{overallPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Domain grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const color = domainColor(group.domain)
            const pct = group.total > 0 ? Math.round((group.done / group.total) * 100) : 0
            const label = group.domain === 'general' ? t('birdseye.general') : domainLabel(group.domain)

            return (
              <div
                key={group.domain}
                className="rounded-xl border bg-surface p-5 flex flex-col gap-4"
                style={{ borderColor: color + '35' }}
              >
                {/* Category header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className="inline-block text-[9px] font-bold px-2 py-0.5 rounded tracking-widest mb-2"
                      style={{ color, backgroundColor: color + '18' }}
                    >
                      {label.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>{group.milestones.length} {t('birdseye.milestones')}</span>
                      <span>·</span>
                      <span>{group.done}/{group.total} {t('birdseye.tasks')}</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold font-mono flex-shrink-0" style={{ color }}>
                    {pct}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 bg-white/8 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>

                {/* Milestone list */}
                <div className="space-y-1.5">
                  {group.milestones.map((m) => {
                    const badge = statusBadge(m)
                    const mDone = m.subtasks.filter((s) => s.done).length
                    const mTotal = m.subtasks.length
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-white/4 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: badge.color }}
                          />
                          <span className="text-xs text-white/90 truncate">{m.title}</span>
                        </div>
                        <span className="text-[10px] font-mono text-muted flex-shrink-0">
                          {mDone}/{mTotal}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
