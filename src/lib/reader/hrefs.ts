/** Normalize an EPUB href for comparisons: drop fragment, decode, strip leading ./ */
export function normalizeHref(href: string): string {
  const withoutHash = href.split('#')[0] ?? ''
  let decoded = withoutHash
  try {
    decoded = decodeURIComponent(withoutHash)
  } catch {
    decoded = withoutHash
  }
  return decoded.replace(/^(\.\/)+/, '').replace(/^\/+/, '')
}

export function hrefsEqual(a: string, b: string): boolean {
  const left = normalizeHref(a)
  const right = normalizeHref(b)
  if (!left || !right) return false
  return left === right || left.endsWith(`/${right}`) || right.endsWith(`/${left}`)
}
