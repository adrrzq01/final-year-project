import { useNavigate } from 'react-router-dom'
import { Home, AlertTriangle } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-100 dark:border-indigo-800">
          <AlertTriangle size={40} className="text-indigo-500" />
        </div>
        <h1 className="text-7xl font-black text-indigo-600 dark:text-indigo-400 mb-2">404</h1>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">Page Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
          The page you're looking for doesn't exist or you don't have permission to access it.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/30 active:scale-95"
        >
          <Home size={18} />
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}
