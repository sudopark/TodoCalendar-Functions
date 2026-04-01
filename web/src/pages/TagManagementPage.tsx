import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEventTagStore } from '../stores/eventTagStore'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { EventTag } from '../models'

export function TagManagementPage() {
  const navigate = useNavigate()
  const { tags, createTag, updateTag, deleteTag } = useEventTagStore()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<EventTag | null>(null)

  async function handleCreate() {
    if (!newName.trim()) return
    await createTag(newName.trim())
    setNewName('')
  }

  async function handleUpdate(id: string) {
    await updateTag(id, { name: editName, color_hex: editColor || undefined })
    setEditingId(null)
  }

  function startEdit(tag: EventTag) {
    setEditingId(tag.uuid)
    setEditName(tag.name)
    setEditColor(tag.color_hex ?? '')
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">태그 관리</h1>
        <button className="text-sm text-gray-500" onClick={() => navigate(-1)}>닫기</button>
      </div>

      {/* Create */}
      <div className="mb-4 flex gap-2">
        <input
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          placeholder="새 태그 이름"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <button
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={handleCreate}
        >
          추가
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
                <button className="text-xs text-blue-500" onClick={() => handleUpdate(tag.uuid)}>저장</button>
                <button className="text-xs text-gray-400" onClick={() => setEditingId(null)}>취소</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {tag.color_hex && <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color_hex }} />}
                  <span className="text-sm">{tag.name}</span>
                </div>
                <div className="flex gap-2">
                  <button className="text-xs text-gray-500" onClick={() => startEdit(tag)}>수정</button>
                  <button className="text-xs text-red-500" onClick={() => setDeleteTarget(tag)}>삭제</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {deleteTarget && (
        <ConfirmDialog
          title="태그 삭제"
          message={`"${deleteTarget.name}" 태그를 삭제할까요?`}
          onConfirm={async () => { await deleteTag(deleteTarget.uuid); setDeleteTarget(null) }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
