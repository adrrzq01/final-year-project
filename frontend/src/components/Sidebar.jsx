import { NavLink, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Users, BookOpen, Upload, LayoutDashboard,
  Settings, LogOut, GraduationCap, ClipboardList, PenTool, Link, ClipboardCheck, FileSpreadsheet, TableProperties
} from 'lucide-react'
import logo from '../assets/Logo.png'
import { useSemester } from '../context/SemesterContext'

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/classes', icon: Users, label: 'Classes & Courses' },
  { path: '/upload', icon: Upload, label: 'Upload Students' },
  { path: '/exams', icon: ClipboardList, label: 'Exam Blueprints' },
  { path: '/marks', icon: PenTool, label: 'Marks Entry' },
  { path: '/mapping', icon: Link, label: 'PO Mapping' },
  { path: '/survey', icon: ClipboardCheck, label: 'Exit Survey' },
  { path: '/reports', icon: FileSpreadsheet, label: 'CO Reports' },
  { path: '/custom-report', icon: TableProperties, label: 'Marks Matrix' },
]

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { activeSemester } = useSemester()

  return (
    <aside className="w-64 shrink-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700/60 flex flex-col shadow-sm z-10 transition-colors duration-300">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 flex items-center justify-center shrink-0 drop-shadow-sm">
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
        {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            const Icon = item.icon

            return (
              <RouterLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 font-semibold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'} />
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 dark:bg-indigo-400 rounded-r-full" />
                )}
              </RouterLink>
            )
          })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-col gap-3">
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/60 dark:to-violet-950/60 rounded-xl p-3 border border-indigo-100 dark:border-indigo-900/50">
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">Academic Year</p>
          <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mt-0.5">2025 – 2026</p>
          <p className="text-xs text-indigo-500 dark:text-indigo-500 mt-0.5">Semester {activeSemester} · Active</p>
        </div>

        <button 
          onClick={() => {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
          }}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 transition-colors border border-rose-100 dark:border-rose-900/30"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
