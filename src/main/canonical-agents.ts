import { readFileSync } from 'fs'
import { resolve } from 'path'

export interface CanonicalAgent {
  id: string
  name: string
  type: string
  parent_id?: string
  color: string
  status: string
  permissions: string[]
  last_action_at: string | null
  session_action_count: number
}

// __dirname is provided by electron-vite's CJS bundle for the main process.
const CANONICAL_AGENT_ROSTER_PATH = resolve(
  __dirname,
  '..',
  '..',
  'config',
  'canonical-agent-roster.json'
)

const LEGACY_AGENT_ID_ALIASES = new Map<string, string>([
  ['claude_chat', 'claude_code'],
  ['luqman', 'operator'],
])

// Display names that should be replaced by the canonical default during merge.
// Used to migrate users who never customized their operator label off the
// previous hardcoded "Luqman" string.
const LEGACY_OPERATOR_DEFAULT_NAMES = new Set(['Luqman'])

export const OPERATOR_AGENT_ID = 'operator'

export function resolveCanonicalAgentId(agentId: string): string {
  return LEGACY_AGENT_ID_ALIASES.get(agentId) ?? agentId
}

export function loadCanonicalAgentRoster(): CanonicalAgent[] {
  const roster = JSON.parse(readFileSync(CANONICAL_AGENT_ROSTER_PATH, 'utf-8')) as CanonicalAgent[]
  return Array.isArray(roster) ? roster : []
}

export interface MergeOptions {
  operatorNameOverride?: string | null
}

export function mergeCanonicalAgentRoster<T extends CanonicalAgent>(
  existingAgents: T[] = [],
  options: MergeOptions = {}
): T[] {
  const roster = loadCanonicalAgentRoster()
  const existingById = new Map(existingAgents.map((agent) => [agent.id, agent]))
  const consumedIds = new Set<string>()

  const merged = roster.map((canonicalAgent) => {
    const aliasMatch = existingAgents.find(
      (agent) => resolveCanonicalAgentId(agent.id) === canonicalAgent.id
    )
    const existing = existingById.get(canonicalAgent.id) ?? aliasMatch ?? null

    if (existing) {
      consumedIds.add(existing.id)
      const existingName = (existing.name || '').trim()
      const isLegacyDefaultName =
        canonicalAgent.id === OPERATOR_AGENT_ID &&
        LEGACY_OPERATOR_DEFAULT_NAMES.has(existingName)
      const resolvedName = isLegacyDefaultName
        ? canonicalAgent.name
        : existingName || canonicalAgent.name

      return {
        ...canonicalAgent,
        ...existing,
        id: canonicalAgent.id,
        name: resolvedName,
        type: existing.type || canonicalAgent.type,
        parent_id: existing.parent_id ?? canonicalAgent.parent_id,
        color: existing.color || canonicalAgent.color,
        status: existing.status || canonicalAgent.status,
        permissions:
          Array.isArray(existing.permissions) && existing.permissions.length > 0
            ? existing.permissions
            : canonicalAgent.permissions,
        last_action_at: existing.last_action_at ?? canonicalAgent.last_action_at,
        session_action_count:
          typeof existing.session_action_count === 'number'
            ? existing.session_action_count
            : canonicalAgent.session_action_count,
      } as T
    }

    return { ...canonicalAgent } as T
  })

  const extras = existingAgents.filter((agent) => !consumedIds.has(agent.id))

  const result = [...merged, ...extras]

  const operatorOverride = options.operatorNameOverride?.trim()
  if (operatorOverride) {
    for (const agent of result) {
      if (agent.id === OPERATOR_AGENT_ID) {
        agent.name = operatorOverride
        break
      }
    }
  }

  return result
}
