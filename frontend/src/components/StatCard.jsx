import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const colorMap = {
  indigo: {
    icon: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    badge: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300',
  },
  emerald: {
    icon: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    badge: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
  },
  violet: {
    icon: 'bg-gradient-to-br from-violet-500 to-violet-600',
    badge: 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300',
  },
  amber: {
    icon: 'bg-gradient-to-br from-amber-500 to-amber-600',
    badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
  },
  rose: {
    icon: 'bg-gradient-to-br from-rose-500 to-rose-600',
    badge: 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300',
  },
}

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'indigo' }) {
  const c = colorMap[color] || colorMap.indigo
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-500' : 'text-slate-400'

  return (
    <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 card-hover shadow-sm transition-colors duration-300">
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl ${c.icon} flex items-center justify-center shadow-md`}>
          <Icon size={20} className="text-white" />
        </div>
        {trendValue && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${c.badge}`}>
            <TrendIcon size={12} className={trendColor} />
            {trendValue}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}
