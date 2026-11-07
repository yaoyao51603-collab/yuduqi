import { db } from './database'
import {
  DEFAULT_SETTINGS,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  LINE_HEIGHTS,
  type FontFamily,
  type MarginSize,
  type PageMode,
  type ReaderSettings,
  type ReaderTheme,
} from './schema'

const STORAGE_KEY = 'zhijian:settings'

const THEMES: readonly ReaderTheme[] = ['paper', 'sepia', 'night']
const FONT_FAMILIES: readonly FontFamily[] = ['system', 'serif', 'sans']
const MARGINS: readonly MarginSize[] = ['narrow', 'medium', 'wide']
const PAGE_MODES: readonly PageMode[] = ['paginated', 'scrolled']

function isOneOf<T extends string>(value: unknown, list: readonly T[]): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value)
}

export function normalizeSettings(input: Partial<ReaderSettings> | undefined | null): ReaderSettings {
  const source = input ?? {}
  const fontSize =
    typeof source.fontSize === 'number' && Number.isFinite(source.fontSize)
      ? Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(source.fontSize)))
      : DEFAULT_SETTINGS.fontSize
  const lineHeight = LINE_HEIGHTS.includes(
    source.lineHeight as (typeof LINE_HEIGHTS)[number],
  )
    ? (source.lineHeight as number)
    : DEFAULT_SETTINGS.lineHeight

  return {
    fontSize,
    lineHeight,
    fontFamily: isOneOf(source.fontFamily, FONT_FAMILIES)
      ? source.fontFamily
      : DEFAULT_SETTINGS.fontFamily,
    theme: isOneOf(source.theme, THEMES) ? source.theme : DEFAULT_SETTINGS.theme,
    margin: isOneOf(source.margin, MARGINS) ? source.margin : DEFAULT_SETTINGS.margin,
    pageMode: isOneOf(source.pageMode, PAGE_MODES)
      ? source.pageMode
      : DEFAULT_SETTINGS.pageMode,
    updatedAt: typeof source.updatedAt === 'number' ? source.updatedAt : 0,
  }
}

/** 同步读取缓存，用于首屏避免闪烁 */
export function loadCachedSettings(): ReaderSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return normalizeSettings(JSON.parse(raw) as Partial<ReaderSettings>)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function cacheSettings(settings: ReaderSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // 隐私模式 / 存储配额不足时忽略
  }
}

export async function getSettings(): Promise<ReaderSettings> {
  const stored = await db.settings.get('reader')
  if (stored) return normalizeSettings(stored)
  return loadCachedSettings()
}

export async function saveSettings(next: ReaderSettings): Promise<ReaderSettings> {
  const settings = normalizeSettings({ ...next, updatedAt: Date.now() })
  await db.settings.put({ ...settings, id: 'reader' })
  cacheSettings(settings)
  return settings
}
