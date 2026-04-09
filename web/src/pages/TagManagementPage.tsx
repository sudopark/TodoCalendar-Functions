import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEventTagStore } from '../stores/eventTagStore'
import { useToastStore } from '../stores/toastStore'
import type { EventTag } from '../models'

export function TagManagementPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tags, createTag, updateTag, deleteTag, deleteTagAndEvents } = useEventTagStore()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<EventTag | null>(null)

  async function handleCreate() {
    if (!newName.trim()) return
    try {
      await createTag(newName.trim())
      setNewName('')
    } catch (e) {
      console.warn('태그 생성 실패:', e)
      useToastStore.getState().show(t('tag.create_failed'), 'error')
    }
  }

  async function handleUpdate(id: string) {
    try {
      await updateTag(id, { name: editName, color_hex: editColor || undefined })
      setEditingId(null)
    } catch (e) {
      console.warn('태그 수정 실패:', e)
      useToastStore.getState().show(t('tag.update_failed'), 'error')
    }
  }

  function startEdit(tag: EventTag) {
    setEditingId(tag.uuid)
    setEditName(tag.name)
    setEditColor(tag.color_hex ?? '')
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">{t('tag.manage')}</h1>
        <button className="text-sm text-gray-500" onClick={() => navigate(-1)}>{t('common.close')}</button>
      </div>

      {/* Create */}
      <div className="mb-4 flex gap-2">
        <input
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          placeholder={t('tag.new_placeholder')}
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <button
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={handleCreate}
        >
          {t('tag.add')}
        </button>
      </div>

      {/* List */}
      <ul className="divide-y divide-gray-100">
        {Array.from(tags.values()).map(tag => (
          <li key={tag.uuid} className="py-3">
            {editingId === tag.uuid ? (
              <div className="flex gap-2">
                <input className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm" value={editName} onChange={e => setEditName(e.target.value)} />
                <input type="color" className="h-8 w-8 rounded border" value={editColor || '#000000'} onChange={e => setEditColor(e.target.value)} />
                <button className="text-xs text-blue-500" onClick={() => handleUpdate(tag.uuid)}>{t('common.save')}</button>
                <button className="text-xs text-gray-400" onClick={() => setEditingId(null)}>{t('common.cancel')}</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {tag.color_hex && <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color_hex }} />}
                  <span className="text-sm">{tag.name}</span>
                </div>
                <div className="flex gap-2">
                  <button className="text-xs text-gray-500" onClick={() => startEdit(tag)}>{t('common.edit')}</button>
                  <button className="text-xs text-red-500" onClick={() => setDeleteTarget(tag)}>{t('common.delete')}</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900">{t('tag.delete_title')}</h2>
            <p className="mt-2 text-sm text-gray-600">
              {t('tag.delete_message', { name: deleteTarget.name })}
            </p>
            <div className="mt-4 flex flex-col divide-y divide-gray-100">
              <button
                className="px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-50"
                onClick={async () => {
                  const target = deleteTarget
                  setDeleteTarget(null)
                  try {
                    await deleteTag(target.uuid)
                  } catch (e) {
                    console.warn('태그 삭제 실패:', e)
                    useToastStore.getState().show(t('tag.delete_failed'), 'error')
                  }
                }}
              >
                {t('tag.delete_tag_only')}
              </button>
              <button
                className="px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                onClick={async () => {
                  const target = deleteTarget
                  setDeleteTarget(null)
                  try {
                    await deleteTagAndEvents(target.uuid)
                  } catch (e) {
                    console.warn('태그+이벤트 삭제 실패:', e)
                    useToastStore.getState().show(t('tag.delete_events_failed'), 'error')
                  }
                }}
              >
                {t('tag.delete_tag_and_events')}
              </button>
            </div>
            <button
              className="mt-4 w-full rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
              onClick={() => setDeleteTarget(null)}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
