import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-600">404</h1>
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">{t('error.page_not_found')}</p>
      <Link
        to="/"
        className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        {t('error.go_home')}
      </Link>
    </div>
  )
}
