import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, BookOpen, TrendingUp, Award, Activity, BarChart2, Trophy } from 'lucide-react'
import axios from 'axios'
import StatCard from '../components/StatCard'
import AttainmentChart from '../components/AttainmentChart'
import { useSemester } from '../context/SemesterContext'

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { activeSemester } = useSemester()
  
  const userString = localStorage.getItem('user')
  const user = userString ? JSON.parse(userString) : null

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const currentToken = localStorage.getItem('token')
        const config = { headers: { Authorization: `Bearer ${currentToken}` } }
        const res = await axios.get('http://localhost:5000/api/dashboard', config)
        setDashboardData(res.data)
      } catch (err) {
        console.error('Failed to load dashboard:', err)
        setError('Could not connect to analytics engine.')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  const hasData = dashboardData && dashboardData.stats && dashboardData.stats[0].value > 0

  // Sort chart data by attainment level descending for the "Top Courses" list
  const topCourses = dashboardData?.chartData
    ? [...dashboardData.chartData].sort((a, b) => b.Attainment - a.Attainment).slice(0, 5)
    : []

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Greeting Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="relative">
          <p className="text-indigo-200 text-sm font-medium">{todayFormatted}</p>
          <h2 className="text-2xl font-bold mt-1">{getGreeting()}, {user?.fullName || 'Professor'}! 👋</h2>
          <p className="text-indigo-200 text-sm mt-1">
            {hasData
              ? `Semester ${activeSemester} is active. Here's your overview.`
              : 'No data yet — add classes and upload marks to get started.'}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="flex justify-center py-6">
           <svg className="animate-spin h-6 w-6 text-indigo-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
           </svg>
        </div>
      ) : error ? (
        <div className="text-red-500 text-sm font-medium py-4 text-center bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Students" value={dashboardData?.stats[0]?.value || 0} subtitle="Across all batches" icon={Users} color="indigo" />
          <StatCard title="Active Courses" value={dashboardData?.stats[1]?.value || 0} subtitle="Mapped to DBE" icon={BookOpen} color="violet" />
          <StatCard title="Avg CO Attainment" value={dashboardData?.stats[2]?.value || '0.00 / 3.0'} subtitle="Institution wide" icon={TrendingUp} color="emerald" />
          <StatCard title="COs Meeting Target" value={dashboardData?.stats[3]?.value || 0} subtitle="Outcomes secured" icon={Award} color="amber" />
        </div>
      )}

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm transition-colors duration-300">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">CO Attainment Overview</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Target vs Actual — All Courses</p>
          </div>
          {dashboardData && dashboardData.chartData && dashboardData.chartData.length > 0 ? (
            <AttainmentChart data={dashboardData.chartData} />
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

        {/* Fast Actions & Activity */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm transition-colors duration-300 flex flex-col">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
            <Activity size={16} className="text-indigo-500" /> Fast Actions
          </h3>
          
          <div className="flex-1 flex flex-col gap-3">
            <button 
              onClick={() => navigate('/reports')}
              className="w-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50 p-4 rounded-xl flex items-center justify-between transition-all group focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center shadow-sm">
                  <Award size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Final Reports</p>
                  <p className="text-xs opacity-80">Extraction & Analytics</p>
                </div>
              </div>
              <Activity size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </div>

      {/* Top Performing Courses */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm transition-colors duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/60">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" /> Top Performing Courses
          </h3>
          {topCourses.length > 0 && (
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">By Avg CO Attainment Level</span>
          )}
        </div>
        {topCourses.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {topCourses.map((course, i) => {
              const pct = ((course.Attainment / 3) * 100).toFixed(0)
              const isAboveTarget = course.Attainment >= course.Target
              return (
                <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                    i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                    i === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                    'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{course.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isAboveTarget ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 w-12 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className={`text-lg font-black ${isAboveTarget ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {course.Attainment.toFixed(1)}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <BookOpen size={24} className="text-slate-400 dark:text-slate-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No courses yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add courses from the Classes page to see rankings here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
