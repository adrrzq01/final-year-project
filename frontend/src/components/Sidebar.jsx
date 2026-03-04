import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, Upload, FileText,
  Table2, GraduationCap, ChevronRight,
} from 'lucide-react'
import logo from '../assets/Logo.png'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/classes', icon: BookOpen, label: 'Classes' },
  { to: '/upload', icon: Upload, label: 'Upload Data' },
  { to: '/exams', icon: FileText, label: 'Exam Blueprint' },
  { to: '/marks', icon: Table2, label: 'Marks Entry' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700/60 flex flex-col shadow-sm z-10 transition-colors duration-300">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center shrink-0 drop-shadow-sm">
            <img src={logo} alt="Bridgify Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">Bridgify</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">OBE Management</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest px-3 mb-3">
          Navigation
        </p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'nav-active text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="text-indigo-200" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-700/60">
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/60 dark:to-violet-950/60 rounded-xl p-3 border border-indigo-100 dark:border-indigo-900/50">
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">Academic Year</p>
          <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mt-0.5">2025 – 2026</p>
          <p className="text-xs text-indigo-500 dark:text-indigo-500 mt-0.5">Semester 1 · Active</p>
        </div>
      </div>
    </aside>
  )
}
