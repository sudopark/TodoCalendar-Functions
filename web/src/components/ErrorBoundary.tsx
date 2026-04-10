import { Component, type ReactNode, type ErrorInfo } from 'react'
import i18n from '../i18n'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-gray-900">
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{i18n.t('error.something_wrong')}</p>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            onClick={() => window.location.reload()}
          >
            {i18n.t('error.refresh')}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
