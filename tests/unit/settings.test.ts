import { describe, expect, it } from 'vitest'
import {
  cacheSettings,
  getSettings,
  loadCachedSettings,
  normalizeSettings,
  saveSettings,
} from '../../src/lib/db/settings'
import { DEFAULT_SETTINGS } from '../../src/lib/db/schema'

describe('normalizeSettings', () => {
  it('clamps font size and rounds it', () => {
    expect(normalizeSettings({ fontSize: 99 }).fontSize).toBe(26)
    expect(normalizeSettings({ fontSize: 2 }).fontSize).toBe(16)
    expect(normalizeSettings({ fontSize: 20.6 }).fontSize).toBe(21)
  })

  it('falls back to defaults for invalid enums', () => {
    const settings = normalizeSettings({
      theme: 'neon' as never,
      fontFamily: 'comic' as never,
      margin: 'huge' as never,
      pageMode: 'scroll' as never,
      lineHeight: 2.4,
    })
    expect(settings.theme).toBe(DEFAULT_SETTINGS.theme)
    expect(settings.fontFamily).toBe(DEFAULT_SETTINGS.fontFamily)
    expect(settings.margin).toBe(DEFAULT_SETTINGS.margin)
    expect(settings.pageMode).toBe(DEFAULT_SETTINGS.pageMode)
    expect(settings.lineHeight).toBe(DEFAULT_SETTINGS.lineHeight)
  })

  it('keeps valid values', () => {
    expect(
      normalizeSettings({
        fontSize: 22,
        lineHeight: 1.9,
        fontFamily: 'sans',
        theme: 'night',
        margin: 'wide',
        pageMode: 'scrolled',
        updatedAt: 3,
      }),
    ).toMatchObject({
      fontSize: 22,
      lineHeight: 1.9,
      fontFamily: 'sans',
      theme: 'night',
      margin: 'wide',
      pageMode: 'scrolled',
      updatedAt: 3,
    })
  })
})

describe('settings cache', () => {
  it('round-trips through localStorage', () => {
    cacheSettings({ ...DEFAULT_SETTINGS, theme: 'sepia', fontSize: 23 })
    expect(loadCachedSettings()).toMatchObject({ theme: 'sepia', fontSize: 23 })
  })

  it('ignores corrupt cache', () => {
    window.localStorage.setItem('zhijian:settings', '{oops')
    expect(loadCachedSettings()).toMatchObject(DEFAULT_SETTINGS)
  })
})

describe('settings store', () => {
  it('persists settings and returns defaults when empty', async () => {
    expect(await getSettings()).toMatchObject(DEFAULT_SETTINGS)
    await saveSettings({ ...DEFAULT_SETTINGS, theme: 'night' })
    expect(await getSettings()).toMatchObject({ theme: 'night' })
  })
})
