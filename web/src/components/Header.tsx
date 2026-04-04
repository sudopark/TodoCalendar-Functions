import { NavLink } from 'react-router-dom'

export function Header() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-xs md:text-sm font-medium transition-colors ${
      isActive ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
    }`

  return (
    <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4">
      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">TodoCalendar</span>
      <nav className="flex gap-1">
        <NavLink to="/" end className={linkClass}>캘린더</NavLink>
        <NavLink to="/done" className={linkClass}>Done</NavLink>
        <NavLink to="/settings" className={linkClass}>설정</NavLink>
      </nav>
    </header>
  )
}
