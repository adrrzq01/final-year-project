import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Search, ChevronDown, Sun, Moon, Clock } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const routeTitles = {
  '/dashboard': 'Dashboard',
  '/classes': 'Classes & Courses',
  '/upload': 'Upload Data',
  '/exams': 'Exam Blueprint',
  '/marks': 'Marks Entry',
}

export default function Topbar() {
  const { pathname } = useLocation()
  const title = routeTitles[pathname] || 'Bridgify'
  const { dark, toggle } = useTheme()

  const [tString, setTString] = useState('')

  useEffect(() => {
    const fn = () => {
      const d = new Date()
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      
      const day = days[d.getDay()]
      const date = d.getDate()
      const month = months[d.getMonth()]
      const year = d.getFullYear()
      
      // Time logic
      let hours = d.getHours()
      const ampm = hours >= 12 ? 'PM' : 'AM'
      hours = hours % 12
      hours = hours ? hours : 12 // the hour '0' should be '12'
      const mins = d.getMinutes().toString().padStart(2, '0')
      const secs = d.getSeconds().toString().padStart(2, '0')

      setTString(`${day}, ${date} ${month} ${year} | ${hours}:${mins}:${secs} ${ampm}`)
    }
    fn()
    const intv = setInterval(fn, 1000)
    return () => clearInterval(intv)
  }, [])

  return (
    <header className="h-16 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between px-6 shadow-sm z-10 transition-colors duration-300">
      {/* Page title */}
      <div className="flex flex-col">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <Clock size={12} className="text-indigo-400" />
          <span>{tString}</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="topbar-search"
            name="topbarSearch"
            aria-label="Search across the application"
            type="text"
            placeholder="Search…"
            className="pl-8 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-48 focus:w-60 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-slate-400 dark:text-slate-200"
          />
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="relative w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all"
          title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all">
          <Bell size={16} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">0</span>
        </button>

        {/* Avatar with Logout Dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-2.5 pl-3 pr-4 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow">
              PA
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none">Prof. Ahmed</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Faculty</p>
            </div>
            <ChevronDown size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
          </button>
          
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right">
            <button 
              onClick={() => {
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                window.location.href = '/login'
              }}
              className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
