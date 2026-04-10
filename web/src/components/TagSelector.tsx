import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEventTagStore } from '../stores/eventTagStore'

interface TagSelectorProps {
  value: string | null | undefined
  onChange: (tagId: string | null) => void
}

export function TagSelector({ value, onChange }: TagSelectorProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const tags = useEventTagStore(s => s.tags)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          className={`rounded-full border px-3 py-1 text-xs ${!value ? 'border-gray-700 bg-gray-700 text-white' : 'border-gray-300 text-gray-600'}`}
          onClick={() => onChange(null)}
        >
          {t('settings.none')}
        </button>
        {tags.size === 0 && (
          <span className="text-xs text-gray-400">{t('common.loading') ?? '...'}</span>
        )}
        {Array.from(tags.values()).map(tag => (
          <button
            key={tag.uuid}
            className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${value === tag.uuid ? 'border-gray-700 font-semibold' : 'border-gray-300'}`}
            onClick={() => onChange(tag.uuid)}
          >
            {tag.color_hex && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color_hex }} />}
            {tag.name}
          </button>
        ))}
      </div>
      <button
        className="text-xs text-blue-500 hover:underline"
        onClick={() => navigate('/tags', { state: { background: location } })}
      >
        {t('tag.manage_link')}
      </button>
    </div>
  )
}
