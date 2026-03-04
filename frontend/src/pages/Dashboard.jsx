import { Users, BookOpen, TrendingUp, Award, Activity, BarChart2 } from 'lucide-react'
import StatCard from '../components/StatCard'
import AttainmentChart from '../components/AttainmentChart'

export default function Dashboard() {
  const hasData = false // flip to true when backend is connected

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Greeting Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="relative">
          <p className="text-indigo-200 text-sm font-medium">Wednesday, March 4, 2026</p>
          <h2 className="text-2xl font-bold mt-1">Good morning, Prof. Ahmed! 👋</h2>
          <p className="text-indigo-200 text-sm mt-1">
            {hasData
              ? 'Semester 1 is active. Here\'s your overview.'
              : 'No data yet — add classes and upload marks to get started.'}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value="—" subtitle="No data yet" icon={Users} color="indigo" />
        <StatCard title="Active Courses" value="—" subtitle="No courses added" icon={BookOpen} color="violet" />
        <StatCard title="Avg CO Attainment" value="—" subtitle="No marks recorded" icon={TrendingUp} color="emerald" />
        <StatCard title="COs Meeting Target" value="—" subtitle="No target set" icon={Award} color="amber" />
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart empty state */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm transition-colors duration-300">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">CO Attainment Overview</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Target vs Actual — All Courses</p>
          </div>
          {hasData ? (
            <AttainmentChart data={[]} />
          ) : (
            <div className="h-64 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <BarChart2 size={26} className="text-slate-400 dark:text-slate-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No attainment data yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Upload marks and map COs to see this chart</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity empty state */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm transition-colors duration-300">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
            <Activity size={16} className="text-indigo-500" /> Recent Activity
          </h3>
          <div className="h-52 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Activity size={18} className="text-slate-400 dark:text-slate-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No activity yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Actions will appear here</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Courses empty state */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm transition-colors duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/60">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Top Performing Courses</h3>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <BookOpen size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No courses yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add courses from the Classes page to see rankings here</p>
          </div>
        </div>
      </div>
    </div>
  )
}
