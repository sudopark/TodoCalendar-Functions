import { useEffect, useRef, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDoneTodosStore } from '../stores/doneTodosStore'
import { useCurrentTodosStore } from '../stores/currentTodosStore'
import { useEventTagStore } from '../stores/eventTagStore'
import { useToastStore } from '../stores/toastStore'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { DoneTodo } from '../models'

export function DoneTodosPage() {
  const { t, i18n } = useTranslation()
  const { items, hasMore, fetchNext, revert, remove, reset } = useDoneTodosStore()
  const fetchCurrentTodos = useCurrentTodosStore(s => s.fetch)
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  function groupByDate(items: DoneTodo[]): Map<string, DoneTodo[]> {
    const groups = new Map<string, DoneTodo[]>()
    for (const item of items) {
      const dateKey = item.done_at
        ? new Date(item.done_at * 1000).toLocaleDateString(i18n.language)
        : t('todo.no_date')
      const group = groups.get(dateKey) ?? []
      group.push(item)
      groups.set(dateKey, group)
    }
    return groups
  }

  const groups = useMemo(() => groupByDate(items), [items, i18n.language]) // eslint-disable-line react-hooks/exhaustive-deps

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
      useToastStore.getState().show(t('todo.revert_failed'), 'error')
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">{t('todo.done_list')}</h1>

      {items.length === 0 && hasMore === false && (
        <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">{t('todo.done_empty')}</p>
      )}

      {Array.from(groups.entries()).map(([dateKey, groupItems]) => (
        <div key={dateKey}>
          <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 sticky top-0">
            {dateKey}
          </h3>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {groupItems.map(item => {
              const color = item.event_tag_id
                ? (getColorForTagId(item.event_tag_id) ?? '#9ca3af')
                : '#9ca3af'

              return (
                <li key={item.uuid} className="flex items-center gap-3 py-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-900 dark:text-gray-100">{item.name}</p>
                  </div>
                  <button
                    className="rounded-md px-2 py-1 text-xs text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    onClick={() => handleRevert(item.uuid)}
                  >
                    {t('todo.revert')}
                  </button>
                  <button
                    className="rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                    onClick={() => setConfirmId(item.uuid)}
                  >
                    {t('common.delete')}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      <div ref={sentinelRef} className="py-2 text-center text-xs text-gray-400">
        {!hasMore && items.length > 0 && t('todo.all_shown')}
      </div>

      {confirmId && (
        <ConfirmDialog
          message={t('todo.done_delete_confirm')}
          danger
          onConfirm={async () => {
            try {
              await remove(confirmId)
            } catch (e) {
              console.warn('삭제 실패:', e)
              useToastStore.getState().show(t('todo.delete_failed'), 'error')
            }
            setConfirmId(null)
          }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
