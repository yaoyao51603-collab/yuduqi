import styles from './Toast.module.css'

interface ToastProps {
  message: string | null
  tone?: 'info' | 'error'
}

export default function Toast({ message, tone = 'info' }: ToastProps) {
  if (!message) return null
  return (
    <div className={styles.toast} data-tone={tone} role="status" aria-live="polite">
      {message}
    </div>
  )
}
