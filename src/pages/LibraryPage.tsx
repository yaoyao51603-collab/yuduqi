import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, MoreHorizontal, Plus } from 'lucide-react'
import BookCover from '../components/BookCover'
import ConfirmDialog from '../components/ConfirmDialog'
import Toast from '../components/Toast'
import { deleteBook, listBooks } from '../lib/db/books'
import { getAllProgress } from '../lib/db/progress'
import type { BookRecord, ProgressRecord } from '../lib/db/schema'
import { formatPercent } from '../lib/format'
import { importFiles } from '../lib/import'
import { loadSampleBook } from '../lib/samples'
import styles from './LibraryPage.module.css'

interface ToastState {
  message: string
  tone: 'info' | 'error'
}

export default function LibraryPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [books, setBooks] = useState<BookRecord[] | null>(null)
  const [progressMap, setProgressMap] = useState<Map<string, ProgressRecord>>(new Map())
  const [importing, setImporting] = useState(false)
  const [sampleLoading, setSampleLoading] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [pendingDelete, setPendingDelete] = useState<BookRecord | null>(null)

  const refresh = useCallback(async () => {
    const [list, progress] = await Promise.all([listBooks(), getAllProgress()])
    setBooks(list)
    setProgressMap(progress)
  }, [])

  useEffect(() => {
    void refresh().catch(() => {
      setToast({ message: '书架打开失败了，请刷新页面重试。', tone: 'error' })
    })
  }, [refresh])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setImporting(true)
    try {
      const summary = await importFiles(Array.from(fileList))
      await refresh()
      if (summary.failures.length === 0) {
        setToast({ message: `已导入 ${summary.imported.length} 本书`, tone: 'info' })
      } else {
        const first = summary.failures[0]
        const extra =
          summary.failures.length > 1 ? `（另有 ${summary.failures.length - 1} 本未导入）` : ''
        const prefix =
          summary.imported.length > 0 ? `已导入 ${summary.imported.length} 本；` : ''
        setToast({
          message: `${prefix}${first?.fileName ?? '文件'}：${first?.message ?? '导入失败'}${extra}`,
          tone: 'error',
        })
      }
    } catch {
      setToast({ message: '导入时出了点问题，请再试一次。', tone: 'error' })
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSample = async () => {
    setSampleLoading(true)
    try {
      const book = await loadSampleBook()
      navigate(`/read/${book.id}`)
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : '样章加载失败，请稍后再试。',
        tone: 'error',
      })
      setSampleLoading(false)
    }
  }

  const handleDelete = async () => {
    const target = pendingDelete
    if (!target) return
    setPendingDelete(null)
    try {
      await deleteBook(target.id)
      await refresh()
      setToast({ message: `已删除《${target.title}》`, tone: 'info' })
    } catch {
      setToast({ message: '删除失败了，请再试一次。', tone: 'error' })
    }
  }

  const count = books?.length ?? 0

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brandBlock}>
          <h1 className={styles.brand}>纸间</h1>
          <p className={styles.subtitle}>
            {importing ? '正在导入…' : `本地书架 · ${count} 本`}
          </p>
        </div>
        <button
          type="button"
          className={styles.importButton}
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          <Plus size={18} aria-hidden="true" />
          {importing ? '导入中' : '导入'}
        </button>
        <input
          ref={fileInputRef}
          className={styles.fileInput}
          type="file"
          accept=".epub,.txt,application/epub+zip,text/plain"
          multiple
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </header>

      {books === null ? (
        <p className={styles.loading}>正在整理书架…</p>
      ) : books.length === 0 ? (
        <section className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <BookOpen size={26} />
          </span>
          <h2 className={styles.emptyTitle}>书架还空着</h2>
          <p className={styles.emptyText}>
            把 EPUB 或 TXT 文件放进来。书留在本机，不用登录，下次打开还能接着上次的位置。
          </p>
          <div className={styles.emptyActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => fileInputRef.current?.click()}
            >
              导入第一本书
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void handleSample()}
              disabled={sampleLoading}
            >
              {sampleLoading ? '正在准备样章…' : '先读一段试读样章'}
            </button>
          </div>
        </section>
      ) : (
        <ul className={styles.grid}>
          {books.map((book) => {
            const progress = progressMap.get(book.id)
            return (
              <li key={book.id} className={styles.card}>
                <BookCover book={book} />
                <span className={styles.info}>
                  <span className={styles.title}>{book.title}</span>
                  <span className={styles.meta}>
                    <span className={styles.author}>{book.author}</span>
                    <span className={styles.percent}>
                      {progress ? formatPercent(progress.percentage) : '未读'}
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  className={styles.cardLink}
                  onClick={() => navigate(`/read/${book.id}`)}
                  aria-label={`阅读《${book.title}》`}
                />
                <button
                  type="button"
                  className={styles.more}
                  aria-label={`删除《${book.title}》`}
                  onClick={() => setPendingDelete(book)}
                >
                  <MoreHorizontal size={18} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <p className={styles.footnote}>阅读进度与设置只保存在这台设备上。</p>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="删除这本书？"
        description={
          pendingDelete
            ? `《${pendingDelete.title}》会从书架移除，阅读进度也会一起清除。此操作无法撤销。`
            : ''
        }
        confirmLabel="删除"
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDelete(null)}
      />

      <Toast message={toast?.message ?? null} tone={toast?.tone} />
    </div>
  )
}
