import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface ConfirmDialogProps {
  title?: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, danger = true }: ConfirmDialogProps) {
  const { t } = useTranslation()
  const resolvedConfirmLabel = confirmLabel ?? t('common.confirm')
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusableElements[0]
    const last = focusableElements[focusableElements.length - 1]

    first?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onCancel(); return }
      if (e.key !== 'Tab') return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-message"
    >
      <div ref={dialogRef} className="mx-4 w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg">
        {title && <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>}
        <p
          id="confirm-dialog-message"
          className={`text-sm text-gray-700 dark:text-gray-300${title ? ' mt-2' : ''}`}
        >
          {message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-lg px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={onCancel}
          >
            {t('common.cancel')}
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
              danger ? 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
            }`}
            onClick={onConfirm}
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
