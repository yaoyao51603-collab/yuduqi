import ePub from 'epubjs'
import type { Book, Contents, Location as EpubLocation, NavItem, Rendition } from 'epubjs'
import type { FontFamily, ReaderSettings, ReaderTheme } from '../db/schema'
import { clamp01 } from '../format'
import { hrefsEqual, normalizeHref } from './hrefs'

export type TapZone = 'prev' | 'next' | 'toggle'

export interface TocEntry {
  label: string
  /** Resolved spine href, fragment removed */
  href: string
  level: number
}

export interface ReaderLocation {
  cfi: string
  percentage: number
  chapterIndex: number
  chapterTitle?: string
  href: string
  atStart: boolean
  atEnd: boolean
}

export interface ReaderEngineOptions {
  container: HTMLElement
  blob: Blob
  settings: ReaderSettings
  initialCfi?: string | null
  cachedLocations?: string | null
  onRelocated?: (location: ReaderLocation) => void
  /** Raw JSON from epub.js `locations.save()`, ready to cache */
  onLocationsReady?: (json: string) => void
  onTapZone?: (zone: TapZone) => void
  onReady?: () => void
  onError?: (error: unknown) => void
}

const FONT_STACKS: Record<FontFamily, string> = {
  system:
    '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  serif: '"Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", STSong, SimSun, serif',
  sans: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
}

const THEME_COLORS: Record<ReaderTheme, { bg: string; ink: string; muted: string }> = {
  paper: { bg: '#FBF9F3', ink: '#211E19', muted: '#6B6355' },
  sepia: { bg: '#F3E9D6', ink: '#2B2419', muted: '#7A6A52' },
  night: { bg: '#121110', ink: '#D9D3C7', muted: '#9A9285' },
}

const LOCATION_CHUNK = 1024

interface SpineItemLike {
  href: string
  index: number
}

/**
 * Thin, framework-free wrapper around epub.js.
 * Owns rendering, content styling, gestures and locations caching.
 */
export class ReaderEngine {
  private readonly opts: ReaderEngineOptions
  private readonly blob: Blob
  private readonly container: HTMLElement
  private book: Book | null = null
  private rendition: Rendition | null = null
  private settings: ReaderSettings
  private toc: TocEntry[] = []
  private lastLocation: EpubLocation | null = null
  private observer: ResizeObserver | null = null
  private resizeFrame = 0
  private destroyed = false
  private opened = false
  private locationsRequested = false

  constructor(options: ReaderEngineOptions) {
    this.opts = options
    this.container = options.container
    this.settings = options.settings
    this.blob = options.blob
  }

  async open(): Promise<void> {
    try {
      // epub.js 的类型声明只写了 string | ArrayBuffer，运行时也接受 Blob；
      // 传 Blob 会走 JSZip 内存解析，避免 blob: URL 被当成目录路径。
      const book = ePub(this.blob as unknown as ArrayBuffer)
      this.book = book
      await book.ready
      if (this.destroyed) return

      try {
        await book.loaded.navigation
      } catch {
        // 没有目录也能读
      }
      if (this.destroyed) return

      this.toc = this.buildToc(book.navigation?.toc ?? [])

      const size = this.measure()
      const rendition = book.renderTo(this.container, {
        width: size.width,
        height: size.height,
        spread: 'none',
        flow: this.settings.pageMode === 'scrolled' ? 'scrolled' : 'paginated',
        allowScriptedContent: false,
      })
      this.rendition = rendition

      rendition.hooks.content.register((contents: Contents) => {
        this.decorateContents(contents)
      })
      rendition.on('relocated', this.handleRelocated)

      if (this.opts.cachedLocations) {
        try {
          book.locations.load(this.opts.cachedLocations)
        } catch {
          // 缓存损坏时忽略，稍后重新生成
        }
      }

      await this.displayInitial()
      if (this.destroyed) return

      this.opened = true
      this.opts.onReady?.()
      this.observeResize()
      this.generateLocations()
    } catch (error) {
      if (this.destroyed) return
      this.opts.onError?.(error)
    }
  }

  private async displayInitial(): Promise<void> {
    const rendition = this.rendition
    if (!rendition) return
    const cfi = this.opts.initialCfi
    if (cfi) {
      try {
        await rendition.display(cfi)
        return
      } catch {
        // 旧进度失效时退回第一屏
      }
    }
    await rendition.display()
  }

  private measure(): { width: number; height: number } {
    const width = this.container.clientWidth || window.innerWidth
    const height = this.container.clientHeight || window.innerHeight
    return { width: Math.max(1, Math.floor(width)), height: Math.max(1, Math.floor(height)) }
  }

  private decorateContents(contents: Contents): void {
    this.styleContents(contents)
    this.bindGestures(contents)
  }

  private styleContents(contents: Contents): void {
    const doc = contents.document
    if (!doc) return
    const head = doc.head ?? doc.documentElement
    if (!head) return

    let style = doc.querySelector<HTMLStyleElement>('style[data-zhijian="reader"]')
    if (!style) {
      style = doc.createElement('style')
      style.setAttribute('data-zhijian', 'reader')
      head.appendChild(style)
    }

    const colors = THEME_COLORS[this.settings.theme]
    const fontStack = FONT_STACKS[this.settings.fontFamily]
    style.textContent = [
      `html, body { background-color: ${colors.bg} !important; color: ${colors.ink} !important; }`,
      `body { font-family: ${fontStack} !important; font-size: ${this.settings.fontSize}px !important; line-height: ${this.settings.lineHeight} !important; }`,
      'p, li, dd, dt, blockquote { line-height: inherit !important; }',
      `a { color: inherit !important; text-decoration-color: ${colors.muted}; }`,
      'img, svg { max-width: 100% !important; height: auto !important; }',
      this.settings.theme === 'night' ? 'img { opacity: 0.82; }' : '',
    ].join('\n')
  }

  private bindGestures(contents: Contents): void {
    const doc = contents.document
    const win = contents.window
    if (!doc || !win) return

    let touchStart: { x: number; y: number } | null = null
    let suppressClickUntil = 0

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        touchStart = null
        return
      }
      const touch = event.touches[0]
      if (!touch) return
      touchStart = { x: touch.clientX, y: touch.clientY }
    }

    const onTouchEnd = (event: TouchEvent) => {
      const start = touchStart
      touchStart = null
      const touch = event.changedTouches[0]
      if (!start || !touch) return
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.4) return
      suppressClickUntil = Date.now() + 500
      if (this.settings.pageMode !== 'paginated') return
      if (dx < 0) void this.next()
      else void this.prev()
    }

    const onClick = (event: MouseEvent) => {
      if (Date.now() < suppressClickUntil) return
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('a')) return
      const selection = doc.getSelection?.()
      if (selection && selection.toString().trim()) return

      if (this.settings.pageMode !== 'paginated') {
        this.opts.onTapZone?.('toggle')
        return
      }

      const width = doc.documentElement.clientWidth || win.innerWidth || 1
      const ratio = event.clientX / width
      if (ratio < 1 / 3) this.opts.onTapZone?.('prev')
      else if (ratio > 2 / 3) this.opts.onTapZone?.('next')
      else this.opts.onTapZone?.('toggle')
    }

    doc.addEventListener('touchstart', onTouchStart, { passive: true })
    doc.addEventListener('touchend', onTouchEnd, { passive: true })
    doc.addEventListener('click', onClick)
  }

  private buildToc(items: NavItem[]): TocEntry[] {
    const book = this.book
    const spineItems = this.spineItems()
    const entries: TocEntry[] = []

    const resolve = (rawHref: string | undefined): string | null => {
      if (!rawHref) return null
      const clean = normalizeHref(rawHref)
      if (!clean) return null
      if (book) {
        try {
          const section = book.spine.get(rawHref)
          if (section?.href) return normalizeHref(section.href)
        } catch {
          // ignore
        }
      }
      const match = spineItems.find((item) => hrefsEqual(item.href, clean))
      return match ? normalizeHref(match.href) : clean
    }

    const walk = (nodes: NavItem[], level: number) => {
      for (const node of nodes) {
        const resolved = resolve(node.href)
        if (resolved) {
          entries.push({ label: (node.label || '未命名章节').trim(), href: resolved, level })
        }
        if (node.subitems && node.subitems.length > 0) walk(node.subitems, level + 1)
      }
    }

    walk(items, 0)
    return entries
  }

  private spineItems(): SpineItemLike[] {
    const spine = this.book?.spine as unknown as { spineItems?: SpineItemLike[] } | undefined
    return spine?.spineItems ?? []
  }

  private handleRelocated = (location: EpubLocation): void => {
    if (this.destroyed) return
    const start = location.start
    if (!start?.cfi) return
    this.lastLocation = location
    this.opts.onRelocated?.(this.toReaderLocation(location))
  }

  private toReaderLocation(location: EpubLocation): ReaderLocation {
    const start = location.start
    const href = normalizeHref(start.href ?? '')
    const tocEntry = this.toc.find((entry) => hrefsEqual(entry.href, href))
    return {
      cfi: start.cfi,
      percentage: this.percentageFor(location),
      chapterIndex: typeof start.index === 'number' ? start.index : 0,
      chapterTitle: tocEntry?.label,
      href,
      atStart: Boolean(location.atStart),
      atEnd: Boolean(location.atEnd),
    }
  }

  private percentageFor(location: EpubLocation): number {
    const start = location.start
    const book = this.book
    if (book && book.locations.length() > 0) {
      const percentage = book.locations.percentageFromCfi(start.cfi)
      if (typeof percentage === 'number' && Number.isFinite(percentage)) {
        return clamp01(percentage)
      }
    }

    const total = this.spineItems().length || 1
    const index = typeof start.index === 'number' ? start.index : 0
    const page = start.displayed?.page ?? 0
    const pages = start.displayed?.total ?? 0
    const fraction = pages > 1 ? (page - 1) / pages : 0
    return clamp01((index + Math.max(0, fraction)) / total)
  }

  private generateLocations(): void {
    const book = this.book
    if (!book || this.locationsRequested || this.destroyed) return
    this.locationsRequested = true
    if (book.locations.length() > 0) return

    void book.locations
      .generate(LOCATION_CHUNK)
      .then(() => {
        if (this.destroyed || !this.book) return
        const json = this.book.locations.save()
        this.opts.onLocationsReady?.(json)
        if (this.lastLocation) {
          this.opts.onRelocated?.(this.toReaderLocation(this.lastLocation))
        }
      })
      .catch(() => {
        // 分页缓存失败时保持按章节估算
      })
  }

  private observeResize(): void {
    if (typeof ResizeObserver === 'undefined') return
    this.observer = new ResizeObserver(() => this.scheduleResize())
    this.observer.observe(this.container)
  }

  private scheduleResize(): void {
    if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame)
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = 0
      if (this.destroyed) return
      const rendition = this.rendition
      if (!rendition) return
      const size = this.measure()
      if (size.width < 2 || size.height < 2) return
      rendition.resize(size.width, size.height)
    })
  }

  getToc(): TocEntry[] {
    return this.toc
  }

  getSpineLength(): number {
    return this.spineItems().length
  }

  async next(): Promise<void> {
    if (this.settings.pageMode !== 'paginated') return
    await this.rendition?.next()
  }

  async prev(): Promise<void> {
    if (this.settings.pageMode !== 'paginated') return
    await this.rendition?.prev()
  }

  async goToHref(href: string): Promise<void> {
    const rendition = this.rendition
    if (!rendition) return
    try {
      await rendition.display(href)
    } catch {
      // 目录项失效时忽略
    }
  }

  async goToCfi(cfi: string): Promise<void> {
    try {
      await this.rendition?.display(cfi)
    } catch {
      // ignore invalid cfi
    }
  }

  /** Jump to a 0–1 position. Falls back to a spine estimate until locations exist. */
  async seek(percentage: number): Promise<void> {
    const rendition = this.rendition
    const book = this.book
    if (!rendition || !book) return
    const target = clamp01(percentage)

    if (book.locations.length() > 0) {
      try {
        const cfi = book.locations.cfiFromPercentage(target)
        if (cfi) {
          await rendition.display(cfi)
          return
        }
      } catch {
        // fall through to spine estimate
      }
    }

    const items = this.spineItems()
    const index = Math.min(Math.max(0, Math.floor(target * items.length)), items.length - 1)
    const section = book.spine.get(index)
    if (section?.href) await rendition.display(section.href)
  }

  applySettings(next: ReaderSettings): void {
    const previous = this.settings
    this.settings = next
    const rendition = this.rendition
    if (!rendition || !this.opened) return

    const contents = rendition.getContents() as unknown as Contents[]
    if (Array.isArray(contents)) contents.forEach((content) => this.styleContents(content))

    if (previous.pageMode !== next.pageMode) {
      rendition.flow(next.pageMode === 'scrolled' ? 'scrolled' : 'paginated')
    }
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame)
    this.observer?.disconnect()
    this.observer = null
    try {
      this.book?.destroy()
    } catch {
      // ignore teardown races
    }
    this.book = null
    this.rendition = null
  }
}
