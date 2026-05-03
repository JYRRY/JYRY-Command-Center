import type { TrackerState, Subtask } from '../../main/parser'

export interface DependencySuggestion {
  fromTaskId: string
  fromTaskLabel: string
  toTaskId: string
  toTaskLabel: string
  confidence: 'high' | 'medium'
  reason: string
}

const KEYWORD_PATTERNS = [
  /\bdepends?\s+on\b/i,
  /\bafter\b/i,
  /\brequires?\b/i,
  /\bblocked\s+by\b/i,
  /\bneeds?\b/i,
  /\bfollows?\b/i,
  /\bprerequisite\b/i,
]

function extractTaskRefs(text: string): string[] {
  const matches = text.match(/[Tt]\d+\.\d+/g) ?? []
  return [...new Set(matches.map((m) => m.toLowerCase()))]
}

function hasKeyword(text: string): boolean {
  return KEYWORD_PATTERNS.some((p) => p.test(text))
}

function normalizeId(id: string): string {
  return id.toLowerCase()
}

export function detectDependencies(
  tracker: TrackerState,
  targetTaskId?: string
): DependencySuggestion[] {
  const allTasks = new Map<string, Subtask>()
  for (const m of tracker.milestones) {
    for (const s of m.subtasks) {
      allTasks.set(normalizeId(s.id), s)
    }
  }

  const suggestions: DependencySuggestion[] = []

  const tasksToScan = targetTaskId
    ? [allTasks.get(normalizeId(targetTaskId))].filter(Boolean) as Subtask[]
    : Array.from(allTasks.values())

  for (const task of tasksToScan) {
    const existingDeps = new Set(
      (task.depends_on ?? []).map(normalizeId)
    )

    const textsToScan = [
      task.label,
      task.notes ?? '',
      task.prompt ?? '',
      ...(task.acceptance_criteria ?? []),
    ]

    const allText = textsToScan.join(' ')
    const refsInText = extractTaskRefs(allText)
    const keywordPresent = hasKeyword(allText)

    for (const ref of refsInText) {
      if (ref === normalizeId(task.id)) continue
      if (existingDeps.has(ref)) continue

      const referencedTask = allTasks.get(ref)
      if (!referencedTask) continue

      // Avoid suggesting if already depends on it
      const alreadySuggested = suggestions.some(
        (s) => normalizeId(s.fromTaskId) === normalizeId(task.id) && normalizeId(s.toTaskId) === ref
      )
      if (alreadySuggested) continue

      const confidence = keywordPresent ? 'high' : 'medium'
      const reason = keywordPresent
        ? `Task text contains dependency keyword and references ${referencedTask.id}`
        : `Task text references ${referencedTask.id}`

      suggestions.push({
        fromTaskId: task.id,
        fromTaskLabel: task.label,
        toTaskId: referencedTask.id,
        toTaskLabel: referencedTask.label,
        confidence,
        reason,
      })
    }
  }

  return suggestions
}
