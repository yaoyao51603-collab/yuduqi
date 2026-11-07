import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('应用渲染出错', error, info.componentStack)
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <main
          style={{
            display: 'grid',
            minHeight: '100dvh',
            placeItems: 'center',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div>
            <h1 style={{ fontSize: '20px', marginBottom: '8px' }}>页面出了点问题</h1>
            <p style={{ color: 'var(--ink-3)', fontSize: '14px', marginBottom: '20px' }}>
              刷新一下再试试，书架里的书不会丢。
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                minHeight: '44px',
                padding: '0 20px',
                borderRadius: '999px',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: '15px',
              }}
            >
              刷新页面
            </button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
