import { execFile } from 'child_process'
import { existsSync, mkdirSync, readdirSync } from 'fs'
import { dirname } from 'path'

export type GitResult =
  | { status: 'success'; message: string; branch: string; filesChanged: number }
  | { status: 'nothing' }
  | { status: 'error'; error: string }

export interface CloneOptions {
  cloneUrl: string
  destDir: string
  token?: string | null
}

function git(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve(stdout)
    })
  })
}

function gitNoCwd(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve(stdout)
    })
  })
}

function buildAuthenticatedUrl(cloneUrl: string, token: string): string {
  if (!cloneUrl.startsWith('https://')) return cloneUrl
  return cloneUrl.replace(
    'https://',
    `https://x-access-token:${encodeURIComponent(token)}@`
  )
}

export async function cloneRepo({ cloneUrl, destDir, token }: CloneOptions): Promise<{ path: string }> {
  if (existsSync(destDir)) {
    const entries = readdirSync(destDir)
    if (entries.length > 0) {
      throw new Error(`Destination is not empty: ${destDir}`)
    }
  } else {
    mkdirSync(dirname(destDir), { recursive: true })
  }

  const fetchUrl = token ? buildAuthenticatedUrl(cloneUrl, token) : cloneUrl

  await gitNoCwd(['clone', fetchUrl, destDir])

  if (token) {
    try {
      await git(['remote', 'set-url', 'origin', cloneUrl], destDir)
    } catch {
      // best-effort cleanup; if it fails the user can fix the remote manually
    }
  }

  return { path: destDir }
}

function detectDomains(files: string[]): string[] {
  const domainMap: Record<string, string> = {
    'app/lib/ai/': 'ai',
    'app/components/': 'ui',
    'app/lib/shopify/': 'shopify',
    'app/lib/db/': 'db',
    'app/routes/': 'routes',
    'docs/': 'docs',
    'prisma/': 'db',
  }
  const found = new Set<string>()
  for (const file of files) {
    let matched = false
    for (const [prefix, domain] of Object.entries(domainMap)) {
      if (file.startsWith(prefix) || file.includes('/' + prefix)) {
        found.add(domain)
        matched = true
        break
      }
    }
    if (!matched) found.add('chore')
  }
  return [...found]
}

function generateCommitMessage(statusOutput: string): string {
  const lines = statusOutput.split('\n').filter(Boolean)
  const files = lines.map((l) => l.slice(3).trim())

  let added = 0, modified = 0, deleted = 0
  for (const line of lines) {
    const code = line.slice(0, 2)
    if (code.includes('?') || code.includes('A')) added++
    else if (code.includes('D')) deleted++
    else modified++
  }

  let verb: string
  if (deleted > added && deleted > modified) verb = 'chore'
  else if (added > modified) verb = 'feat'
  else verb = 'update'

  const domains = detectDomains(files)
  const choreDomains = domains.filter((d) => d !== 'chore')

  if (choreDomains.length === 0) {
    return 'chore: update config and project files'
  }
  if (choreDomains.length === 1) {
    const domain = choreDomains[0]
    const count = files.length
    if (deleted > added && deleted > modified) {
      return `chore(${domain}): clean up ${count} file${count > 1 ? 's' : ''}`
    }
    return `${verb}(${domain}): update ${count} file${count > 1 ? 's' : ''}`
  }

  const summary = choreDomains.slice(0, 3).join(', ')
  return `${verb}: update ${summary}${choreDomains.length > 3 ? ' and more' : ''}`
}

export async function commitAndPush(): Promise<GitResult> {
  try {
    const { getWorkspaceStatus } = await import('./workspace')
    const ws = await getWorkspaceStatus()
    if (!ws.projectRoot) {
      return { status: 'error', error: 'No project root configured.' }
    }
    const root = ws.projectRoot

    const status = await git(['status', '--porcelain'], root)
    if (!status.trim()) {
      return { status: 'nothing' }
    }

    const message = generateCommitMessage(status)
    await git(['add', '-A'], root)
    await git(['commit', '-m', message], root)

    const branch = (await git(['rev-parse', '--abbrev-ref', 'HEAD'], root)).trim()
    await git(['push', 'origin', branch], root)

    const filesChanged = status.split('\n').filter(Boolean).length
    return { status: 'success', message, branch, filesChanged }
  } catch (err) {
    return { status: 'error', error: err instanceof Error ? err.message : String(err) }
  }
}
