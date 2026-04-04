import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import { useHolidayStore, type HolidayCountry } from '../stores/holidayStore'
import { useThemeStore } from '../stores/themeStore'
import { useEventDefaultsStore } from '../stores/eventDefaultsStore'
import { useEventTagStore } from '../stores/eventTagStore'
import { useTimezoneStore } from '../stores/timezoneStore'
import { useCalendarAppearanceStore } from '../stores/calendarAppearanceStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useTranslation } from 'react-i18next'
import { settingApi } from '../api/settingApi'
import { accountApi } from '../api/accountApi'
import { ColorPalette } from '../components/ColorPalette'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { DefaultTagColors } from '../models'

const TIMEZONES = [
  { label: '시스템 기본', value: '' },
  { label: 'Asia/Seoul (KST)', value: 'Asia/Seoul' },
  { label: 'Asia/Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'America/New_York (EST)', value: 'America/New_York' },
  { label: 'America/Los_Angeles (PST)', value: 'America/Los_Angeles' },
  { label: 'Europe/London (GMT)', value: 'Europe/London' },
  { label: 'Europe/Berlin (CET)', value: 'Europe/Berlin' },
  { label: 'UTC', value: 'UTC' },
]

const NOTIFICATION_PRESETS = [
  { label: '없음', value: null },
  { label: '5분 전', value: -300 },
  { label: '10분 전', value: -600 },
  { label: '30분 전', value: -1800 },
  { label: '1시간 전', value: -3600 },
]

const COUNTRIES = [
  { label: '한국', locale: 'ko', region: 'south_korea' },
  { label: '미국', locale: 'en', region: 'united_states' },
  { label: '일본', locale: 'ja', region: 'japan' },
  { label: '중국', locale: 'zh', region: 'china' },
  { label: '영국', locale: 'en', region: 'united_kingdom' },
  { label: '독일', locale: 'de', region: 'germany' },
  { label: '프랑스', locale: 'fr', region: 'france' },
]

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const account = useAuthStore(s => s.account)
  const signOut = useAuthStore(s => s.signOut)
  const holidayCountry = useHolidayStore(s => s.country)
  const setHolidayCountry = useHolidayStore(s => s.setCountry)
  const theme = useThemeStore(s => s.theme)
  const setTheme = useThemeStore(s => s.setTheme)
  const { defaultTagId, defaultNotificationSeconds, setDefaults } = useEventDefaultsStore()
  const tags = useEventTagStore(s => s.tags)
  const { rowHeight, fontSize: calFontSize, showEventNames, setAppearance, resetToDefaults: resetAppearance } = useCalendarAppearanceStore()
  const timezoneState = useTimezoneStore()
  const { timezone, isCustom, setTimezone } = timezoneState
  const notifPermission = useNotificationStore(s => s.permission)
  const requestNotifPermission = useNotificationStore(s => s.requestPermission)
  const [_colors, setColors] = useState<DefaultTagColors | null>(null)
  const [editColors, setEditColors] = useState<DefaultTagColors | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    settingApi.getDefaultTagColors()
      .then(c => { setColors(c); setEditColors(c) })
      .catch(e => { console.warn('색상 로드 실패:', e); useToastStore.getState().show('색상 로드에 실패했습니다', 'error') })
  }, [])

  const handleSaveColors = async () => {
    if (!editColors) return
    try {
      const updated = await settingApi.updateDefaultTagColors(editColors)
      setColors(updated)
      setEditColors(updated)
      useToastStore.getState().show('색상이 저장되었습니다', 'success')
    } catch (e) {
      console.warn('색상 저장 실패:', e)
      useToastStore.getState().show('색상 저장에 실패했습니다', 'error')
    }
  }

  const handleDeleteAccount = async () => {
    try {
      await accountApi.deleteAccount()
      await signOut()
    } catch (e) {
      console.warn('계정 삭제 실패:', e)
      useToastStore.getState().show('계정 삭제에 실패했습니다', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-8">
      <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('settings.title')}</h1>

      {/* 테마 */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.theme')}</h2>
        <div className="flex gap-2">
          {(['system', 'light', 'dark'] as const).map(th => (
            <button
              key={th}
              onClick={() => setTheme(th)}
              className={`rounded-lg px-3 py-2 text-sm ${theme === th ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
            >
              {th === 'system' ? t('settings.theme_system') : th === 'light' ? t('settings.theme_light') : t('settings.theme_dark')}
            </button>
          ))}
        </div>
      </section>

      {/* 언어 */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.language')}</h2>
        <select
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          value={i18n.language}
          onChange={e => {
            const lang = e.target.value
            i18n.changeLanguage(lang)
            localStorage.setItem('language', lang)
          }}
        >
          <option value="ko">한국어</option>
          <option value="en">English</option>
        </select>
      </section>

      {/* 캘린더 외형 */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.calendar_appearance')}</h2>
        <div>
          <label className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{t('settings.row_height')}</span>
            <span>{rowHeight}px</span>
          </label>
          <input
            type="range"
            min={50}
            max={120}
            value={rowHeight}
            onChange={e => setAppearance({ rowHeight: Number(e.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{t('settings.font_size')}</span>
            <span>{calFontSize}px</span>
          </label>
          <input
            type="range"
            min={10}
            max={18}
            value={calFontSize}
            onChange={e => setAppearance({ fontSize: Number(e.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('settings.show_event_names')}</span>
          <button
            onClick={() => setAppearance({ showEventNames: !showEventNames })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showEventNames ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${showEventNames ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <button
          className="rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={resetAppearance}
        >
          {t('settings.reset_defaults')}
        </button>
      </section>

      {/* 기본 태그 색상 */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.tag_colors')}</h2>
        {editColors && (
          <>
            <div>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{t('settings.holiday_color')}</p>
              <ColorPalette
                selected={editColors.holiday}
                onChange={hex => setEditColors(c => c ? { ...c, holiday: hex } : c)}
              />
            </div>
            <div>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{t('settings.default_color')}</p>
              <ColorPalette
                selected={editColors.default}
                onChange={hex => setEditColors(c => c ? { ...c, default: hex } : c)}
              />
            </div>
            <button
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
              onClick={handleSaveColors}
            >
              {t('settings.save_colors')}
            </button>
          </>
        )}
      </section>

      {/* 공휴일 국가 */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.holiday_country')}</h2>
        <select
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          value={`${holidayCountry.locale}:${holidayCountry.region}`}
          onChange={e => {
            const [locale, region] = e.target.value.split(':')
            setHolidayCountry({ locale, region } as HolidayCountry)
          }}
        >
          {COUNTRIES.map(c => (
            <option key={c.region} value={`${c.locale}:${c.region}`}>{c.label}</option>
          ))}
        </select>
      </section>

      {/* 타임존 */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.timezone')}</h2>
        <select
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          value={isCustom ? timezone : ''}
          onChange={e => setTimezone(e.target.value || null)}
        >
          {TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          현재: {timezone}
        </p>
      </section>

      {/* 이벤트 기본값 */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.defaults')}</h2>
        <div>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{t('settings.default_tag')}</p>
          <select
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            value={defaultTagId ?? ''}
            onChange={e => setDefaults({ defaultTagId: e.target.value || null })}
          >
            <option value="">{t('settings.none')}</option>
            {Array.from(tags.values()).map(tag => (
              <option key={tag.uuid} value={tag.uuid}>{tag.name}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{t('settings.default_notification')}</p>
          <select
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            value={defaultNotificationSeconds ?? ''}
            onChange={e => setDefaults({ defaultNotificationSeconds: e.target.value ? Number(e.target.value) : null })}
          >
            {NOTIFICATION_PRESETS.map(p => (
              <option key={p.label} value={p.value ?? ''}>{p.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* 알림 */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.notification')}</h2>
        {notifPermission === 'granted' ? (
          <p className="text-sm text-green-600 dark:text-green-400">{t('settings.notification_granted')}</p>
        ) : notifPermission === 'denied' ? (
          <p className="text-sm text-red-500">{t('settings.notification_denied')}</p>
        ) : (
          <button
            className="rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={requestNotifPermission}
          >
            {t('settings.notification_allow')}
          </button>
        )}
      </section>

      {/* 계정 정보 */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.account')}</h2>
        {account && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{account.email ?? account.uid}</p>
        )}
        <button
          className="rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={signOut}
        >
          {t('settings.logout')}
        </button>
      </section>

      {/* 계정 삭제 */}
      <section className="rounded-xl border border-red-100 dark:border-red-900 bg-white dark:bg-gray-800 p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-red-500">{t('settings.danger')}</h2>
        <button
          className="rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
          onClick={() => setShowDeleteConfirm(true)}
        >
          {t('settings.delete_account')}
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
