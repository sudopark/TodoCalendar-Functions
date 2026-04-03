import { NavLink } from 'react-router-dom'

export function Header() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-xs md:text-sm font-medium transition-colors ${
      isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'
    }`

  return (
    <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-gray-200 bg-white px-4">
      <span className="text-sm font-bold text-gray-900">TodoCalendar</span>
      <nav className="flex gap-1">
        <NavLink to="/" end className={linkClass}>캘린더</NavLink>
        <NavLink to="/done" className={linkClass}>Done</NavLink>
        <NavLink to="/settings" className={linkClass}>설정</NavLink>
      </nav>
    </header>
  )
}
