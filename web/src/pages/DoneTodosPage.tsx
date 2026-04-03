import { useEffect, useRef, useState } from 'react'
import { useDoneTodosStore } from '../stores/doneTodosStore'
import { useCurrentTodosStore } from '../stores/currentTodosStore'
import { useEventTagStore } from '../stores/eventTagStore'
import { useToastStore } from '../stores/toastStore'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function DoneTodosPage() {
  const { items, hasMore, fetchNext, revert, remove, reset } = useDoneTodosStore()
  const fetchCurrentTodos = useCurrentTodosStore(s => s.fetch)
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    reset()
    fetchNext()
    return () => { reset() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) fetchNext()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchNext])

  const handleRevert = async (id: string) => {
    try {
      await revert(id)
      await fetchCurrentTodos()
    } catch (e) {
      console.warn('되돌리기 실패:', e)
      useToastStore.getState().show('되돌리기에 실패했습니다', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-4 text-lg font-bold text-gray-900">완료된 할 일</h1>

      {items.length === 0 && hasMore === false && (
        <p className="py-8 text-center text-sm text-gray-400">완료된 할 일이 없습니다</p>
      )}

      <ul className="divide-y divide-gray-100">
        {items.map(item => {
          const color = item.event_tag_id
            ? (getColorForTagId(item.event_tag_id) ?? '#9ca3af')
            : '#9ca3af'
          const doneDate = item.done_at
            ? new Date(item.done_at * 1000).toLocaleDateString('ko-KR')
            : null

          return (
            <li key={item.uuid} className="flex items-center gap-3 py-3">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-900">{item.name}</p>
                {doneDate && <p className="text-xs text-gray-400">{doneDate}</p>}
              </div>
              <button
                className="rounded-md px-2 py-1 text-xs text-blue-500 hover:bg-blue-50"
                onClick={() => handleRevert(item.uuid)}
              >
                되돌리기
              </button>
              <button
                className="rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-50"
                onClick={() => setConfirmId(item.uuid)}
              >
                삭제
              </button>
            </li>
          )
        })}
      </ul>

      <div ref={sentinelRef} className="py-2 text-center text-xs text-gray-400">
        {!hasMore && items.length > 0 && '모두 표시됨'}
      </div>

      {confirmId && (
        <ConfirmDialog
          message="완료 항목을 삭제할까요? 되돌릴 수 없습니다."
          danger
          onConfirm={async () => {
            try {
              await remove(confirmId)
            } catch (e) {
              console.warn('삭제 실패:', e)
              useToastStore.getState().show('삭제에 실패했습니다', 'error')
            }
            setConfirmId(null)
          }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
