import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, List, Type } from 'lucide-react'
import SettingsSheet from '../components/reader/SettingsSheet'
import TocSheet from '../components/reader/TocSheet'
import { getBook, touchBook } from '../lib/db/books'
import { getProgress, saveProgress } from '../lib/db/progress'
import { getCachedLocations, saveLocations } from '../lib/db/locations'
import { cacheSettings, getSettings, loadCachedSettings, normalizeSettings, saveSettings } from '../lib/db/settings'
import type { BookRecord, ReaderSettings } from '../lib/db/schema'
import { formatPercent } from '../lib/format'
import { ReaderEngine, type ReaderLocation, type TocEntry } from '../lib/reader/engine'
import styles from './ReaderPage.module.css'

const MARGIN_PADDING = { narrow: 4, medium: 12, wide: 24 } as const

export default function ReaderPage() {
  const { bookId = '' } = useParams()
  const navigate = useNavigate()

  const [book, setBook] = useState<BookRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState<ReaderSettings>(() => loadCachedSettings())
  const [toc, setToc] = useState<TocEntry[]>([])
  const [location, setLocation] = useState<ReaderLocation | null>(null)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [sheet, setSheet] = useState<'toc' | 'settings' | null>(null)
  const [dragPercent, setDragPercent] = useState<number | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<ReaderEngine | null>(null)
  const dragRef = useRef<number | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!bookId || !container) {
      setError('没有找到这本书。')
      return
    }

    let cancelled = false
    let saveTimer: number | undefined
    let latest: ReaderLocation | null = null

    const flush = () => {
      if (saveTimer) {
        window.clearTimeout(saveTimer)
        saveTimer = undefined
      }
      if (!latest) return
      const pending = latest
      latest = null
      void saveProgress({
        bookId,
        cfi: pending.cfi,
        percentage: pending.percentage,
        chapterIndex: pending.chapterIndex,
        chapterTitle: pending.chapterTitle,
        updatedAt: Date.now(),
      })
    }

    const schedule = (next: ReaderLocation) => {
      latest = next
      if (saveTimer) window.clearTimeout(saveTimer)
      saveTimer = window.setTimeout(flush, 800)
    }

    const onPageHide = () => flush()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibility)

    void (async () => {
      const [record, storedSettings, progress, cachedLocations] = await Promise.all([
        getBook(bookId),
        getSettings(),
        getProgress(bookId),
        getCachedLocations(bookId),
      ])
      if (cancelled) return
      if (!record) {
        setError('这本书已经不在书架上了。')
        return
      }

      setBook(record)
      setSettings(storedSettings)
      await touchBook(bookId)
      if (cancelled) return

      const engine = new ReaderEngine({
        container,
        blob: record.derivedEpub ?? record.file,
        settings: storedSettings,
        initialCfi: progress?.cfi ?? null,
        cachedLocations,
        onRelocated: (next) => {
          if (cancelled) return
          setLocation(next)
          schedule(next)
        },
        onLocationsReady: (json) => {
          void saveLocations(bookId, json)
        },
        onTapZone: (zone) => {
          if (zone === 'toggle') setChromeVisible((visible) => !visible)
          else if (zone === 'prev') void engineRef.current?.prev()
          else void engineRef.current?.next()
        },
        onReady: () => {
          if (!cancelled) setReady(true)
        },
        onError: () => {
          if (!cancelled) setError('这本书打开失败了，文件可能已损坏。')
        },
      })

      engineRef.current = engine
      await engine.open()
      if (cancelled) return
      setToc(engine.getToc())
    })().catch(() => {
      if (!cancelled) setError('这本书打开失败了，请稍后再试。')
    })

    return () => {
      cancelled = true
      flush()
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibility)
      engineRef.current?.destroy()
      engineRef.current = null
    }
  }, [bookId])

  useEffect(() => {
    engineRef.current?.applySettings(settings)
  }, [settings])

  useEffect(() => {
    if (!ready || !chromeVisible || sheet || dragPercent !== null) return
    const timer = window.setTimeout(() => setChromeVisible(false), 4500)
    return () => window.clearTimeout(timer)
  }, [ready, chromeVisible, sheet, dragPercent])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        void engineRef.current?.next()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        void engineRef.current?.prev()
      } else if (event.key === 'Escape') {
        if (sheet) setSheet(null)
        else setChromeVisible((visible) => !visible)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [sheet])

  const updateSettings = (patch: Partial<ReaderSettings>) => {
    const next = normalizeSettings({ ...settings, ...patch, updatedAt: Date.now() })
    setSettings(next)
    cacheSettings(next)
    void saveSettings(next)
  }

  const handleSlide = (value: number) => {
    dragRef.current = value
    setDragPercent(value)
  }

  const commitSlide = () => {
    const value = dragRef.current
    if (value === null) return
    dragRef.current = null
    setDragPercent(null)
    void engineRef.current?.seek(value)
  }

  const percent = dragPercent ?? location?.percentage ?? 0
  const margin = MARGIN_PADDING[settings.margin]
  const chapterLabel = location?.chapterTitle ?? ''

  return (
    <div className={styles.reader} data-reader-theme={settings.theme}>
      <div className={styles.stage} style={{ paddingLeft: margin, paddingRight: margin }}>
        <div ref={containerRef} className={styles.content} />
      </div>

      {!ready && !error ? (
        <div className={styles.loading} role="status">
          正在打开…
        </div>
      ) : null}

      {error ? (
        <div className={styles.errorLayer}>
          <div className={styles.errorCard} role="alert">
            <p className={styles.errorText}>{error}</p>
            <button type="button" className={styles.errorButton} onClick={() => navigate('/')}>
              回到书架
            </button>
          </div>
        </div>
      ) : null}

      <header
        className={`${styles.topbar} ${chromeVisible ? '' : styles.hidden}`}
        aria-hidden={!chromeVisible}
      >
        <button
          type="button"
          className={styles.iconButton}
          aria-label="返回书架"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <div className={styles.titles}>
          <p className={styles.bookTitle}>{book?.title ?? '正在打开'}</p>
          <p className={styles.chapter}>{chapterLabel || ' '}</p>
        </div>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="目录"
          onClick={() => setSheet('toc')}
        >
          <List size={21} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="阅读设置"
          onClick={() => setSheet('settings')}
        >
          <Type size={21} aria-hidden="true" />
        </button>
      </header>

      <footer
        className={`${styles.footer} ${chromeVisible ? '' : styles.hidden}`}
        aria-hidden={!chromeVisible}
      >
        <div className={styles.progressRow}>
          <input
            type="range"
            className={styles.slider}
            min={0}
            max={1000}
            step={1}
            value={Math.round(percent * 1000)}
            aria-label="阅读进度"
            onChange={(event) => handleSlide(Number(event.target.value) / 1000)}
            onPointerUp={commitSlide}
            onPointerCancel={commitSlide}
            onKeyUp={commitSlide}
            onBlur={commitSlide}
          />
          <span className={styles.percent}>{formatPercent(percent)}</span>
        </div>
      </footer>

      <TocSheet
        open={sheet === 'toc'}
        entries={toc}
        currentHref={location?.href}
        theme={settings.theme}
        onSelect={(entry) => {
          setSheet(null)
          void engineRef.current?.goToHref(entry.href)
        }}
        onClose={() => setSheet(null)}
      />

      <SettingsSheet
        open={sheet === 'settings'}
        settings={settings}
        onChange={updateSettings}
        onClose={() => setSheet(null)}
      />
    </div>
  )
}
