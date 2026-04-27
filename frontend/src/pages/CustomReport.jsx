import { useState, useEffect, useRef, useMemo } from 'react'
import { useCachedState } from '../context/PageCacheContext'
import { FileSpreadsheet, Loader2, ChevronDown, Download, TableProperties, Award, X } from 'lucide-react'
import axios from 'axios'

const ATTAINMENT_COLOR = {
  0: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  1: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  2: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  3: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
}

function groupColumnsByExam(columns) {
  const groups = []
  let last = null
  columns.forEach((col, idx) => {
    if (!last || last.examName !== col.examName) {
      last = { examName: col.examName, startIdx: idx, count: 0 }
      groups.push(last)
    }
    last.count++
  })
  return groups
}

export default function CustomReport() {
  const [courses, setCourses] = useState([])
  const [selectedClass, setSelectedClass] = useCachedState('cust_selectedClass', '')
  const [selectedDivision, setSelectedDivision] = useCachedState('cust_selectedDivision', '')
  const [selectedCourseId, setSelectedCourseId] = useCachedState('cust_selectedCourseId', '')
  const [report, setReport] = useCachedState('cust_report', null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const tableRef = useRef(null)

  const uniqueClasses = [...new Set(courses.map(c => c.academicClass?.name))].filter(Boolean).sort()
  const uniqueDivisions = [...new Set(courses.map(c => c.academicClass?.division))].filter(Boolean).sort()

  const filteredCourses = courses.filter(c => {
    const classMatch = !selectedClass || c.academicClass?.name === selectedClass
    const divMatch = !selectedDivision || c.academicClass?.division === selectedDivision
    return classMatch && divMatch
  })

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        const res = await axios.get('http://localhost:5000/api/courses', config)
        setCourses(res.data)
      } catch (err) {
        console.error('Failed to load courses', err)
      }
    }
    fetchCourses()
  }, [])

  useEffect(() => {
    if (!selectedCourseId) { setReport(null); return }
    const fetchReport = async () => {
      setLoading(true)
      setError('')
      try {
        const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        const res = await axios.get(`http://localhost:5000/api/reports/custom/${selectedCourseId}`, config)
        setReport(res.data)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to generate report.')
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [selectedCourseId])

  const examGroups = useMemo(() => report ? groupColumnsByExam(report.columns) : [], [report])

  const handleDownloadCSV = () => {
    if (!report) return
    const headers = ['Roll No', 'Name', ...report.columns.map(c => `${c.examName}:${c.qLabel}`)]
    const rows = report.studentRows.map(row => [
      row.rollNo, row.name, ...row.marks.map(m => m ?? '')
    ])
    const footer40 = ['', '≥40% Count', ...report.passCountPerCol.map(c => c)]
    const content = [headers, ...rows, footer40].map(r => r.join(',')).join('\n')
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.courseCode}_custom_report.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-full pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TableProperties size={22} className="text-indigo-600 dark:text-indigo-400" />
            CO Articulation Matrix
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ultra-detailed sub-question breakdown with CO attainment mapping for accreditation.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-300">
          <div className="flex-1 min-w-[140px]">
             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Select Class</label>
             <select
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setSelectedCourseId(''); }}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
             >
                <option value="">-- All Classes --</option>
                {uniqueClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
             </select>
          </div>

          <div className="flex-1 min-w-[140px]">
             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Select Division</label>
             <select
                value={selectedDivision}
                onChange={(e) => { setSelectedDivision(e.target.value); setSelectedCourseId(''); }}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
             >
                <option value="">-- All Divisions --</option>
                {uniqueDivisions.map(div => <option key={div} value={div}>Division {div}</option>)}
             </select>
          </div>

          <div className="flex-[2] min-w-[240px] relative">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Select Course</label>
            <select
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 pl-4 pr-10 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent cursor-pointer transition-all shadow-sm"
            >
              <option value="">— Select Course —</option>
              {filteredCourses.map(c => (
                <option key={c.id} value={c.id}>{c.code} – {c.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3.5 top-[38px] text-slate-400 pointer-events-none" />
          </div>
          
          <button 
            disabled={!report}
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50"
          >
            <Download size={16} /> Export CSV
          </button>
      </div>
      </div>

      {/* States */}
      {!selectedCourseId && (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40">
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-5">
            <FileSpreadsheet size={34} className="text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Select a Course</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Choose a course above to render the marks matrix.</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center py-24 border border-slate-100 dark:border-slate-700/60 rounded-2xl bg-white dark:bg-slate-800/50">
          <Loader2 className="animate-spin text-indigo-500 mb-4" size={36} />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Aggregating marks matrix…</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-400 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Main Table */}
      {report && !loading && (
        <>
          <div className="relative bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <button onClick={() => { setSelectedCourseId(''); setReport(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors z-50">
               <X size={20} />
            </button>
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {report.courseCode} – {report.courseName}
              </h3>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {report.studentRows.length} students · {report.columns.length} sub-questions
              </span>
            </div>
            <div ref={tableRef} className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                <thead>
                  {/* Row 1: Exam Name (grouped headers) */}
                  <tr className="bg-slate-900 dark:bg-slate-950 text-white">
                    <th className="px-4 py-3 font-bold sticky left-0 bg-slate-900 dark:bg-slate-950 z-20 border-r border-slate-700 min-w-[70px]">Roll No</th>
                    <th className="px-4 py-3 font-bold sticky left-[70px] bg-slate-900 dark:bg-slate-950 z-20 border-r border-slate-700 min-w-[160px]">Name</th>
                    {examGroups.map(g => (
                      <th
                        key={g.examName}
                        colSpan={g.count}
                        className="px-3 py-3 font-bold text-center border-r border-slate-700 bg-indigo-800"
                      >
                        {g.examName}
                      </th>
                    ))}
                  </tr>
                  {/* Row 2: Sub-question labels */}
                  <tr className="bg-slate-800 dark:bg-slate-900 text-slate-200">
                    <th className="px-4 py-2 sticky left-0 bg-slate-800 dark:bg-slate-900 z-20 border-r border-slate-700">–</th>
                    <th className="px-4 py-2 sticky left-[70px] bg-slate-800 dark:bg-slate-900 z-20 border-r border-slate-700">–</th>
                    {report.columns.map((col, ci) => (
                      <th key={ci} className="px-3 py-2 text-center border-r border-slate-700 text-indigo-300 font-bold">
                        {col.qLabel}
                      </th>
                    ))}
                  </tr>
                  {/* Row 3: CO per sub-question */}
                  <tr className="bg-slate-700 dark:bg-slate-800 text-slate-300">
                    <th className="px-4 py-2 sticky left-0 bg-slate-700 dark:bg-slate-800 z-20 border-r border-slate-600 text-[10px] uppercase tracking-widest font-bold">CO</th>
                    <th className="px-4 py-2 sticky left-[70px] bg-slate-700 dark:bg-slate-800 z-20 border-r border-slate-600"></th>
                    {report.columns.map((col, ci) => (
                      <th key={ci} className="px-3 py-2 text-center border-r border-slate-600 text-amber-300 font-bold">
                        {col.coNumber}
                      </th>
                    ))}
                  </tr>
                  {/* Row 4: Max Marks */}
                  <tr className="bg-slate-600 dark:bg-slate-700 text-slate-200">
                    <th className="px-4 py-2 sticky left-0 bg-slate-600 dark:bg-slate-700 z-20 border-r border-slate-500 text-[10px] uppercase tracking-widest font-bold">Max</th>
                    <th className="px-4 py-2 sticky left-[70px] bg-slate-600 dark:bg-slate-700 z-20 border-r border-slate-500"></th>
                    {report.columns.map((col, ci) => (
                      <th key={ci} className="px-3 py-2 text-center border-r border-slate-500 font-black text-emerald-300">
                        {col.maxMarks}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {report.studentRows.length === 0 ? (
                    <tr>
                      <td colSpan={report.columns.length + 2} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 text-sm font-semibold">
                        No students found in this class.
                      </td>
                    </tr>
                  ) : report.studentRows.map((row, ri) => (
                    <tr key={row.studentId} className={`transition-colors ${ri % 2 === 0 ? 'bg-white dark:bg-slate-800/30' : 'bg-slate-50/60 dark:bg-slate-800/60'} hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20`}>
                      <td className={`px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300 sticky left-0 z-10 border-r border-slate-100 dark:border-slate-700 ${ri % 2 === 0 ? 'bg-white dark:bg-slate-800/30' : 'bg-slate-50 dark:bg-slate-800/60'}`}>
                        {row.rollNo}
                      </td>
                      <td className={`px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200 sticky left-[70px] z-10 border-r border-slate-100 dark:border-slate-700 min-w-[160px] truncate max-w-[200px] ${ri % 2 === 0 ? 'bg-white dark:bg-slate-800/30' : 'bg-slate-50 dark:bg-slate-800/60'}`}>
                        {row.name}
                      </td>
                      {row.marks.map((mark, ci) => {
                        const max = report.columns[ci].maxMarks
                        const threshold = max * 0.4
                        const isPass = mark !== null && mark >= threshold
                        const isFail = mark !== null && mark < threshold
                        return (
                          <td
                            key={ci}
                            className={`px-3 py-2.5 text-center font-bold border-r border-slate-100 dark:border-slate-700/50 ${
                              mark === null ? 'text-slate-300 dark:text-slate-600' :
                              isPass ? 'text-emerald-700 dark:text-emerald-400' :
                              'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {mark === null ? '–' : mark}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>

                {/* Footer: ≥40% count */}
                <tfoot>
                  <tr className="bg-amber-50 dark:bg-amber-900/30 border-t-2 border-amber-200 dark:border-amber-700">
                    <td className="px-4 py-3 font-black text-amber-800 dark:text-amber-300 sticky left-0 bg-amber-50 dark:bg-amber-900/30 z-10 border-r border-amber-200 dark:border-amber-700 text-[10px] uppercase tracking-wider" colSpan={2}>
                      Students ≥ 40%
                    </td>
                    {report.passCountPerCol.map((count, ci) => {
                      const total = report.studentRows.length
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0
                      return (
                        <td key={ci} className="px-3 py-3 text-center font-black text-amber-800 dark:text-amber-300 border-r border-amber-200 dark:border-amber-700">
                          <div>{count}/{total}</div>
                          <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">{pct}%</div>
                        </td>
                      )
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* CO Attainment Summary */}
          {report.coAttainment.length > 0 && (
            <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-5">
                <Award size={18} className="text-amber-500" /> CO Attainment Levels
                <span className="ml-auto text-xs font-semibold text-slate-400">Based on 50/60/70% Thresholds</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {report.coAttainment.map(co => (
                  <div key={co.coNumber} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-700 text-center">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">{co.coNumber}</p>
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl text-2xl font-black mb-2 ${ATTAINMENT_COLOR[co.level]}`}>
                      {co.level}
                    </div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{co.percentage.toFixed(1)}% pass rate</p>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full transition-all ${
                          co.level === 3 ? 'bg-emerald-500' : co.level === 2 ? 'bg-sky-500' : co.level === 1 ? 'bg-amber-500' : 'bg-rose-400'
                        }`}
                        style={{ width: `${Math.min(co.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold">
                {[
                  { level: 0, label: 'Level 0 — < 50%', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
                  { level: 1, label: 'Level 1 — 50–59%', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
                  { level: 2, label: 'Level 2 — 60–69%', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
                  { level: 3, label: 'Level 3 — ≥ 70%', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
                ].map(item => (
                  <span key={item.level} className={`px-3 py-1.5 rounded-lg ${item.color}`}>{item.label}</span>
                ))}
              </div>
            </div>
          )}

          {report.columns.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <FileSpreadsheet size={30} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No exam blueprints found for this course.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Create an exam blueprint in the Exams page first.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
