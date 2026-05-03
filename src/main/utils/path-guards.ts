export function isAppBundlePath(p: string | null | undefined): boolean {
  if (!p) return false
  return /\.app(\/|$)/i.test(p)
}
