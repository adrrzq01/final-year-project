import { ShieldAlert, LogOut } from 'lucide-react'

export default function PendingVerification() {
  const handleSignOut = () => {
    localStorage.clear()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl p-8 text-center shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700/60 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="w-24 h-24 bg-amber-50 dark:bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
          <div className="absolute inset-0 border-4 border-amber-100 dark:border-amber-500/20 rounded-full animate-ping opacity-20"></div>
          <ShieldAlert size={48} className="text-amber-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          Account Under Review
        </h1>
        
        <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-sm">
          Your registration was successful, but your account is currently pending verification by an Administrator. You will gain access to the Bridgify OBE system once your credentials have been verified.
        </p>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
          >
            Check Status Again
          </button>
          
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-3 px-6 rounded-xl transition-colors focus:outline-none"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>

      </div>
      
      <p className="mt-8 text-slate-400 dark:text-slate-500 text-sm font-medium">
        Bridgify Output-Based Education System
      </p>
    </div>
  )
}
