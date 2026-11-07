import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadSampleBook } from '../lib/samples'
import styles from './DemoPage.module.css'

/** DEV only: seed the bundled sample and open it, for layout/visual checks. */
export default function DemoPage() {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    void loadSampleBook()
      .then((book) => {
        if (!cancelled) navigate(`/read/${book.id}`, { replace: true })
      })
      .catch(() => {
        if (!cancelled) navigate('/', { replace: true })
      })
    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <div className={styles.demo} role="status">
      正在准备样章…
    </div>
  )
}
