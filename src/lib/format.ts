export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return clamp(value, 0, 1)
}

/** 0.376 -> "38%" */
export function formatPercent(value: number): string {
  return `${Math.round(clamp01(value) * 100)}%`
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let index = 0
  let value = bytes
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  const digits = value >= 10 || index === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[index] ?? 'B'}`
}

export function estimatePercentage(index: number, total: number): number {
  if (total <= 0) return 0
  return clamp01(index / total)
}
