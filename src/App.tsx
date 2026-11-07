import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppErrorBoundary from './components/AppErrorBoundary'
import LibraryPage from './pages/LibraryPage'
import styles from './App.module.css'

const ReaderPage = lazy(() => import('./pages/ReaderPage'))
const DemoPage = lazy(() => import('./pages/DemoPage'))

function RouteFallback() {
  return (
    <div className={styles['boot-screen']} role="status" aria-live="polite">
      <p>正在打开…</p>
    </div>
  )
}

export default function App() {
  return (
    <AppErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LibraryPage />} />
          <Route path="/read/:bookId" element={<ReaderPage />} />
          {import.meta.env.DEV ? <Route path="/demo" element={<DemoPage />} /> : null}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  )
}
