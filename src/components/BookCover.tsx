import { useEffect, useState } from 'react'
import type { BookRecord } from '../lib/db/schema'
import styles from './BookCover.module.css'

interface BookCoverProps {
  book: BookRecord
}

export default function BookCover({ book }: BookCoverProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!book.cover) {
      setCoverUrl(null)
      return
    }
    const url = URL.createObjectURL(book.cover)
    setCoverUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [book.cover])

  return (
    <div className={styles.cover}>
      {coverUrl ? (
        <img className={styles.image} src={coverUrl} alt="" loading="lazy" decoding="async" />
      ) : (
        <div className={styles.fallback} aria-hidden="true">
          <span className={styles.spine} />
          <span className={styles.character}>{book.title.slice(0, 2)}</span>
          <span className={styles.rule} />
          <span className={styles.author}>{book.author}</span>
        </div>
      )}
    </div>
  )
}
