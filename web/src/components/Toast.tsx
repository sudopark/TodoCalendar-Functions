import { useToastStore } from '../stores/toastStore'

const bgColor = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-gray-800' }

export function ToastContainer() {
  const toasts = useToastStore(s => s.toasts)
  const dismiss = useToastStore(s => s.dismiss)
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          role="alert"
          className={`${bgColor[t.type]} rounded-lg px-4 py-2 text-sm text-white shadow-lg`}
          onClick={() => dismiss(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
