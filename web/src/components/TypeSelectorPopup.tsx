interface TypeSelectorPopupProps {
  onSelect: (type: 'todo' | 'schedule') => void
  onClose: () => void
}

export function TypeSelectorPopup({ onSelect, onClose }: TypeSelectorPopupProps) {
  return (
    <>
      <div data-testid="popup-backdrop" className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed bottom-20 right-4 z-50 overflow-hidden rounded-xl bg-white shadow-xl">
        <button
          className="flex w-full px-6 py-4 text-left text-sm font-medium hover:bg-gray-50"
          onClick={() => onSelect('todo')}
        >
          Todo
        </button>
        <div className="border-t border-gray-100" />
        <button
          className="flex w-full px-6 py-4 text-left text-sm font-medium hover:bg-gray-50"
          onClick={() => onSelect('schedule')}
        >
          Schedule
        </button>
      </div>
    </>
  )
}
