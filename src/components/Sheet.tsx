import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import type { ReaderTheme } from '../lib/db/schema'
import styles from './Sheet.module.css'

interface SheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** 阅读器内打开时传入，让面板跟随阅读主题 */
  theme?: ReaderTheme
  tall?: boolean
}

export default function Sheet({ open, title, onClose, children, theme, tall }: SheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className={styles.overlay}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      data-reader-theme={theme}
    >
      <section
        className={`${styles.panel} ${tall ? styles.tall : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.grabber} aria-hidden="true" />
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className={styles.content}>{children}</div>
      </section>
    </div>
  )
}
