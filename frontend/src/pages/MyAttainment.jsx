import { useState, useEffect } from 'react'
import { TrendingUp, BookOpen, CheckCircle2, XCircle, AlertCircle, Loader2, Award, Target } from 'lucide-react'
import axios from 'axios'

export default function MyAttainment() {
  const [attainmentData, setAttainmentData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedSem, setSelectedSem] = useState(null)

  const userString = localStorage.getItem('user')
  const user = userString ? JSON.parse(userString) : null
  const className = user?.className || ''

  let availableSems = [1, 2, 3, 4, 5, 6]
  if (className.startsWith('FY')) availableSems = [1, 2]
  else if (className.startsWith('SY')) availableSems = [3, 4]
  else if (className.startsWith('TY')) availableSems = [5, 6]

  useEffect(() => {
    const sem = selectedSem || availableSems[0]
    setSelectedSem(sem)
    fetchAttainment(sem)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchAttainment = async (sem) => {
    try {
      setLoading(true)
      setError('')
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      const res = await axios.get(`http://localhost:5000/api/student/attainment?sem=${sem}`, config)
      setAttainmentData(res.data)
    } catch (err) {
      console.error(err)
      setError('Failed to load your attainment data.')
    } finally {
      setLoading(false)
    }
  }

  const handleSemChange = (sem) => {
    setSelectedSem(sem)
    fetchAttainment(sem)
  }

  // Compute overall attainment across all courses
  const totalCOs = attainmentData.reduce((sum, c) => sum + c.outcomes.length, 0)
  const metCOs = attainmentData.reduce((sum, c) => sum + c.outcomes.filter(o => o.isMet).length, 0)
  const overallPct = totalCOs > 0 ? Math.round((metCOs / totalCOs) * 100) : 0

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Award size={26} /> My CO Attainment
            </h2>
            <p className="text-indigo-200 text-sm mt-1">
              Your personal Course Outcome attainment breakdown for {className}
            </p>
          </div>

          {/* Sem Selector */}
          <div className="flex gap-2 flex-wrap">
            {availableSems.map(s => (
              <button
                key={s}
                onClick={() => handleSemChange(s)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  selectedSem === s
                    ? 'bg-white text-indigo-700 shadow-md'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                Sem {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-indigo-500 mb-3" size={32} />
          <p className="text-sm text-slate-500 dark:text-slate-400">Computing your attainment...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle size={20} className="shrink-0" />
          <p className="font-medium text-sm">{error}</p>
        </div>
      ) : attainmentData.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-16 text-center shadow-sm">
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp size={26} className="text-indigo-500" />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">No Marks Recorded Yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your teacher hasn't entered exam marks for Semester {selectedSem} yet. Check back later.
          </p>
        </div>
      ) : (
        <>
          {/* Overall Summary Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm text-center">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Total COs</p>
              <p className="text-4xl font-black text-slate-800 dark:text-slate-100">{totalCOs}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm text-center">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">COs Met (≥40%)</p>
              <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{metCOs}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm text-center">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Overall Attainment</p>
              <p className={`text-4xl font-black ${overallPct >= 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {overallPct}%
              </p>
            </div>
          </div>

          {/* Course Breakdown */}
          <div className="space-y-4">
            {attainmentData.map(course => {
              const courseMetCOs = course.outcomes.filter(o => o.isMet).length
              const courseTotal = course.outcomes.length
              const coursePct = courseTotal > 0 ? Math.round((courseMetCOs / courseTotal) * 100) : 0

              return (
                <div key={course.courseId} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  {/* Course Header */}
                  <div className="flex items-center justify-between px-6 py-4 bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-3">
                      <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold px-2.5 py-1 rounded-lg text-xs font-mono">
                        {course.code}
                      </span>
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{course.name}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="w-28 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${coursePct >= 60 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${coursePct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 w-8">{coursePct}%</span>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        courseMetCOs === courseTotal
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                      }`}>
                        {courseMetCOs}/{courseTotal} COs Met
                      </span>
                    </div>
                  </div>

                  {/* CO Rows */}
                  <div className="divide-y divide-slate-50 dark:divide-slate-700/30">
                    {course.outcomes.map(co => (
                      <div key={co.coId} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                          co.isMet
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : co.marksScored !== null
                              ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                        }`}>
                          {co.isMet
                            ? <CheckCircle2 size={16} />
                            : co.marksScored !== null
                              ? <XCircle size={16} />
                              : <Target size={14} />
                          }
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono mb-0.5">{co.coNumber}</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed break-words">{co.description}</p>
                        </div>

                        <div className="text-right shrink-0">
                          {co.marksScored !== null ? (
                            <>
                              <p className={`text-base font-black ${co.isMet ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {co.marksScored.toFixed(1)}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">/ {co.maxMarks.toFixed(1)} max</p>
                            </>
                          ) : (
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">No marks yet</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
