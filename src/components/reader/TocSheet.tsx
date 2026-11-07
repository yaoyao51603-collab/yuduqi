import type { ReaderTheme } from '../../lib/db/schema'
import type { TocEntry } from '../../lib/reader/engine'
import { hrefsEqual } from '../../lib/reader/hrefs'
import Sheet from '../Sheet'
import styles from './TocSheet.module.css'

interface TocSheetProps {
  open: boolean
  entries: TocEntry[]
  currentHref?: string
  theme: ReaderTheme
  onSelect: (entry: TocEntry) => void
  onClose: () => void
}

export default function TocSheet({
  open,
  entries,
  currentHref,
  theme,
  onSelect,
  onClose,
}: TocSheetProps) {
  return (
    <Sheet open={open} title="目录" onClose={onClose} theme={theme} tall>
      {entries.length === 0 ? (
        <p className={styles.empty}>这本书没有可用的目录，可以直接继续阅读。</p>
      ) : (
        <ol className={styles.list}>
          {entries.map((entry, index) => {
            const current = currentHref ? hrefsEqual(entry.href, currentHref) : false
            return (
              <li key={`${entry.href}-${index}`}>
                <button
                  type="button"
                  className={styles.item}
                  data-current={current || undefined}
                  style={{ paddingLeft: `${16 + Math.min(entry.level, 2) * 14}px` }}
                  aria-current={current ? 'location' : undefined}
                  onClick={() => onSelect(entry)}
                >
                  <span className={styles.label}>{entry.label}</span>
                  {current ? <span className={styles.current}>在读</span> : null}
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </Sheet>
  )
}
