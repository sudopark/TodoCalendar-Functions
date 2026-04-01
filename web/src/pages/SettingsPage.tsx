import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { settingApi } from '../api/settingApi'
import { accountApi } from '../api/accountApi'
import { ColorPalette } from '../components/ColorPalette'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { DefaultTagColors } from '../models'

export function SettingsPage() {
  const account = useAuthStore(s => s.account)
  const signOut = useAuthStore(s => s.signOut)
  const [colors, setColors] = useState<DefaultTagColors | null>(null)
  const [editColors, setEditColors] = useState<DefaultTagColors | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    settingApi.getDefaultTagColors()
      .then(c => { setColors(c); setEditColors(c) })
      .catch(e => console.warn('색상 로드 실패:', e))
  }, [])

  const handleSaveColors = async () => {
    if (!editColors) return
    try {
      const updated = await settingApi.updateDefaultTagColors(editColors)
      setColors(updated)
      setEditColors(updated)
    } catch (e) {
      console.warn('색상 저장 실패:', e)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      await accountApi.deleteAccount()
      await signOut()
    } catch (e) {
      console.warn('계정 삭제 실패:', e)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-8">
      <h1 className="text-lg font-bold text-gray-900">설정</h1>

      {/* 기본 태그 색상 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">기본 태그 색상</h2>
        {editColors && (
          <>
            <div>
              <p className="mb-2 text-xs text-gray-500">공휴일 색상</p>
              <ColorPalette
                selected={editColors.holiday}
                onChange={hex => setEditColors(c => c ? { ...c, holiday: hex } : c)}
              />
            </div>
            <div>
              <p className="mb-2 text-xs text-gray-500">기본 색상</p>
              <ColorPalette
                selected={editColors.default}
                onChange={hex => setEditColors(c => c ? { ...c, default: hex } : c)}
              />
            </div>
            <button
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
              onClick={handleSaveColors}
            >
              색상 저장
            </button>
          </>
        )}
      </section>

      {/* 계정 정보 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">계정</h2>
        {account && (
          <p className="text-sm text-gray-500">{account.email ?? account.uid}</p>
        )}
        <button
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          onClick={signOut}
        >
          로그아웃
        </button>
      </section>

      {/* 계정 삭제 */}
      <section className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-red-500">위험 구역</h2>
        <button
          className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-500 hover:bg-red-50"
          onClick={() => setShowDeleteConfirm(true)}
        >
          계정 삭제
        </button>
      </section>

      {showDeleteConfirm && (
        <ConfirmDialog
          message="계정을 삭제하면 모든 데이터가 사라집니다. 계속할까요?"
          danger
          onConfirm={async () => {
            setShowDeleteConfirm(false)
            await handleDeleteAccount()
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
