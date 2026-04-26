export interface GitHubRepoSummary {
  id: number
  fullName: string
  name: string
  owner: string
  private: boolean
  description: string | null
  defaultBranch: string
  cloneUrl: string
  updatedAt: string | null
}

export interface TokenValidation {
  ok: boolean
  login?: string
  scopes?: string[]
  error?: string
}

const API_BASE = 'https://api.github.com'
const REQUIRED_SCOPE = 'repo'
const MAX_PAGES = 5
const PER_PAGE = 100

function authHeaders(token: string): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'JYRY-Command-Center',
  }
}

function parseScopes(header: string | null): string[] {
  if (!header) return []
  return header
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseLinkNext(header: string | null): string | null {
  if (!header) return null
  for (const part of header.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/)
    if (match) return match[1]
  }
  return null
}

export async function validateToken(token: string): Promise<TokenValidation> {
  const trimmed = token.trim()
  if (!trimmed) {
    return { ok: false, error: 'Token is empty.' }
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}/user`, { headers: authHeaders(trimmed) })
  } catch (err) {
    return {
      ok: false,
      error: `Could not reach GitHub: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  if (response.status === 401) {
    return { ok: false, error: 'Invalid token.' }
  }

  if (!response.ok) {
    return { ok: false, error: `GitHub returned ${response.status} ${response.statusText}.` }
  }

  const scopes = parseScopes(response.headers.get('x-oauth-scopes'))
  const hasRepoScope = scopes.some((scope) => scope === REQUIRED_SCOPE || scope.endsWith(`:${REQUIRED_SCOPE}`))
  if (!hasRepoScope) {
    return {
      ok: false,
      scopes,
      error: 'Token needs the `repo` scope to access private repositories.',
    }
  }

  const body = (await response.json()) as { login?: string }
  return { ok: true, login: body.login, scopes }
}

export async function listRepos(token: string): Promise<GitHubRepoSummary[]> {
  const trimmed = token.trim()
  if (!trimmed) {
    throw new Error('Token is empty.')
  }

  const repos: GitHubRepoSummary[] = []
  let url:
    | string
    | null = `${API_BASE}/user/repos?per_page=${PER_PAGE}&sort=updated&affiliation=owner,collaborator,organization_member`

  for (let page = 0; page < MAX_PAGES && url; page += 1) {
    const response: Response = await fetch(url, { headers: authHeaders(trimmed) })

    if (response.status === 401) {
      throw new Error('Invalid token.')
    }
    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status} ${response.statusText}.`)
    }

    const batch = (await response.json()) as Array<{
      id: number
      full_name: string
      name: string
      owner: { login: string }
      private: boolean
      description: string | null
      default_branch: string
      clone_url: string
      updated_at: string | null
    }>

    for (const item of batch) {
      repos.push({
        id: item.id,
        fullName: item.full_name,
        name: item.name,
        owner: item.owner?.login ?? '',
        private: Boolean(item.private),
        description: item.description ?? null,
        defaultBranch: item.default_branch,
        cloneUrl: item.clone_url,
        updatedAt: item.updated_at ?? null,
      })
    }

    url = parseLinkNext(response.headers.get('link'))
  }

  return repos
}
