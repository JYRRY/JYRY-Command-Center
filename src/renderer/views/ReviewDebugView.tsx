import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import type { ChecklistCategory, ChecklistItem } from '../../main/parser'

// Checklist category IDs grouped into 3 sections
const SECTION_MAP: Record<string, string[]> = {
  uiPolish:          ['ui_ux_polaris', 'theme_interaction', 'listing_brand'],
  uxFlows:           ['oauth', 'app_bridge', 'safety_support'],
  backendCompliance: ['session_security', 'privacy_gdpr', 'billing', 'performance', 'api_scopes', 'webhooks_lifecycle'],
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

function ChecklistItemRow({
  item,
  onToggle,
}: {
  item: ChecklistItem
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 py-2 px-2 rounded-md hover:bg-white/4 transition-colors text-left group cursor-pointer"
    >
      <span
        className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
          item.done
            ? 'bg-on-track/20 border-on-track'
            : 'border-white/25 group-hover:border-white/50'
        }`}
      >
        {item.done && (
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={`text-xs flex-1 leading-relaxed ${item.done ? 'line-through text-muted/60' : 'text-white/85'}`}>
        {item.label}
      </span>
    </button>
  )
}

function Section({
  titleKey,
  categories,
  color,
  onToggle,
}: {
  titleKey: string
  categories: ChecklistCategory[]
  color: string
  onToggle: (categoryId: string, itemId: string) => void
}) {
  const { t } = useTranslation()

  const allItems = categories.flatMap((c) => c.items)
  const doneCount = allItems.filter((i) => i.done).length
  const totalCount = allItems.length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  const hasCritical = categories.some((c) => c.risk_level === 'critical')

  if (totalCount === 0) return null

  return (
    <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold">{t(titleKey)}</h3>
            {hasCritical && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 tracking-wider">
                {t('reviewDebug.critical')}
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted font-mono">
            {doneCount}/{totalCount} {t('reviewDebug.items')}
          </p>
        </div>
        <span className="text-sm font-bold font-mono flex-shrink-0" style={{ color }}>
          {pct}%
        </span>
      </div>

      <ProgressBar pct={pct} color={color} />

      <div className="space-y-0.5">
        {categories.map((cat) => (
          <div key={cat.id}>
            {categories.length > 1 && (
              <p className="text-[9px] font-bold text-muted/60 tracking-widest uppercase px-2 py-1">
                {cat.title}
              </p>
            )}
            {cat.items.map((item) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                onToggle={() => onToggle(cat.id, item.id)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReviewDebugView() {
  const { t } = useTranslation()
  const tracker = useStore((s) => s.tracker)
  const updateTracker = useStore((s) => s.updateTracker)

  const categoriesBySection = useMemo(() => {
    const cats = tracker?.submission_checklist?.categories ?? []
    const result: Record<string, ChecklistCategory[]> = {
      uiPolish: [],
      uxFlows: [],
      backendCompliance: [],
    }
    for (const cat of cats) {
      for (const [section, ids] of Object.entries(SECTION_MAP)) {
        if (ids.includes(cat.id)) {
          result[section].push(cat)
          break
        }
      }
    }
    return result
  }, [tracker])

  const allItems = useMemo(
    () => Object.values(categoriesBySection).flat().flatMap((c) => c.items),
    [categoriesBySection]
  )
  const doneCount = allItems.filter((i) => i.done).length
  const totalCount = allItems.length
  const overallPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  function handleToggle(categoryId: string, itemId: string) {
    updateTracker((draft) => {
      const cat = draft.submission_checklist.categories.find((c) => c.id === categoryId)
      if (!cat) return
      const item = cat.items.find((i) => i.id === itemId)
      if (!item) return
      item.done = !item.done
      item.completed_at = item.done ? new Date().toISOString() : null
    })
  }

  if (!tracker || totalCount === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted text-sm px-6 text-center">
        {t('reviewDebug.noChecklist')}
      </div>
    )
  }

  const readinessColor = overallPct >= 80 ? '#22C55E' : overallPct >= 50 ? '#F59E0B' : '#EF4444'

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold">{t('reviewDebug.title')}</h1>
            <p className="text-sm text-muted mt-0.5">{t('reviewDebug.subtitle')}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold tracking-wider text-muted mb-1">
              {t('reviewDebug.readiness').toUpperCase()}
            </p>
            <div className="flex items-center gap-3">
              <div className="w-32 h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${overallPct}%`, backgroundColor: readinessColor }}
                />
              </div>
              <span className="text-sm font-bold font-mono" style={{ color: readinessColor }}>
                {overallPct}%
              </span>
            </div>
            <p className="text-[10px] text-muted mt-1 font-mono">
              {doneCount}/{totalCount} {t('reviewDebug.items')}
            </p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Section
            titleKey="reviewDebug.uiPolish"
            categories={categoriesBySection.uiPolish}
            color="#5B6EE8"
            onToggle={handleToggle}
          />
          <Section
            titleKey="reviewDebug.uxFlows"
            categories={categoriesBySection.uxFlows}
            color="#14B8A6"
            onToggle={handleToggle}
          />
          <Section
            titleKey="reviewDebug.backendCompliance"
            categories={categoriesBySection.backendCompliance}
            color="#F59E0B"
            onToggle={handleToggle}
          />
        </div>
      </div>
    </div>
  )
}
