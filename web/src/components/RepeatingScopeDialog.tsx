export type RepeatScope = 'this' | 'future' | 'all'

interface RepeatingScopeDialogProps {
  mode: 'edit' | 'delete'
  onSelect: (scope: RepeatScope) => void
  onCancel: () => void
}

export function RepeatingScopeDialog({ mode, onSelect, onCancel }: RepeatingScopeDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900">
          {mode === 'delete' ? '반복 일정 삭제' : '반복 일정 수정'}
        </h2>
        <div className="mt-4 flex flex-col divide-y divide-gray-100">
          <button
            className="px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-50"
            onClick={() => onSelect('this')}
          >
            이 이벤트만
          </button>
          <button
            className="px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-50"
            onClick={() => onSelect('future')}
          >
            이 이벤트 및 이후 이벤트
          </button>
          <button
            className="px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-50"
            onClick={() => onSelect('all')}
          >
            모든 이벤트
          </button>
        </div>
        <button
          className="mt-4 w-full rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
          onClick={onCancel}
        >
          취소
        </button>
      </div>
    </div>
  )
}
