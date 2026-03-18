import { useState, useEffect } from 'react'
import { FileSpreadsheet, Loader2, Download, AlertCircle } from 'lucide-react'
import axios from 'axios'

export default function Reports() {
  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/courses')
        setCourses(res.data)
      } catch (err) {
        console.error('Failed to load courses', err)
      }
    }
    fetchCourses()
  }, [])

  useEffect(() => {
    if (!selectedCourseId) {
      setReportData(null)
      return
    }
    fetchDetailedReport()
  }, [selectedCourseId])

  const fetchDetailedReport = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get(`http://localhost:5000/api/reports/detailed/${selectedCourseId}`)
      setReportData(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate report data')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCSV = () => {
    if (!reportData) return

    const { students, questions, marksGrid, calculations } = reportData
    
    // Header Row 1: Max Marks
    const row1 = ['Roll Number', 'Name', ...questions.map(q => `Max: ${q.maxMarks}`)]
    // Header Row 2: Q Labels
    const row2 = ['----', '----', ...questions.map(q => q.label)]

    const csvRows = [row1.join(','), row2.join(',')]

    // Student Rows
    students.forEach(student => {
      const row = [student.rollNo, `"${student.name}"`]
      questions.forEach(q => {
        const mark = marksGrid[student.id]?.[q.id]
        row.push(mark !== undefined && mark !== null ? mark : '-')
      })
      csvRows.push(row.join(','))
    })

    // Footer Rows
    const thresholdRow = ['>= 40% passed', '']
    questions.forEach(q => {
      thresholdRow.push(calculations[q.id]?.passedCount || 0)
    })
    csvRows.push(thresholdRow.join(','))

    const pctRow = ['% Passed', '']
    questions.forEach(q => {
      pctRow.push(`${calculations[q.id]?.passPct || 0}%`)
    })
    csvRows.push(pctRow.join(','))

    const levelRow = ['Calculated Level', '']
    questions.forEach(q => {
      levelRow.push(calculations[q.id]?.level || 0)
    })
    csvRows.push(levelRow.join(','))

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('href', url)
    a.setAttribute('download', `OBE_Report_${reportData.courseDetails.code}.csv`)
    a.click()
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet size={22} className="text-emerald-600 dark:text-emerald-400" />
            Detailed Attainment Reports
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Excel-style data grid showing strict 40% threshold verification.
          </p>
        </div>
        
        <div className="w-full md:w-72">
           <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
             Select Target Course
           </label>
           <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:text-slate-200 text-sm font-medium transition-colors cursor-pointer shadow-sm"
           >
              <option value="">-- Choose a Course --</option>
              {courses.map(course => (
                 <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                 </option>
              ))}
           </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl flex items-start gap-3 text-sm font-medium bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-900/30 dark:border-rose-800/50 dark:text-rose-400">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {!selectedCourseId ? (
         <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40">
           <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
             <FileSpreadsheet size={28} className="text-emerald-500" />
           </div>
           <p className="text-slate-500 dark:text-slate-400 font-medium">Select a Course to generate its report matrix.</p>
         </div>
      ) : loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
          </div>
      ) : reportData ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm animate-in fade-in">
          
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
             <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                   {reportData.courseDetails.code} — {reportData.courseDetails.name}
                </h3>
             </div>
             <button 
                onClick={handleDownloadCSV}
                className="flex items-center gap-2 bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors"
             >
                <Download size={16} /> Export to CSV
             </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                {/* Max Marks Row */}
                <tr className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  <th colSpan="2" className="px-4 py-2 text-right border-r border-slate-200 dark:border-slate-700">Max Marks</th>
                  {reportData.questions.map(q => (
                    <th key={'max'+q.id} className="px-3 py-2 text-center border-r border-slate-200 dark:border-slate-700 last:border-0 font-bold text-emerald-600 dark:text-emerald-400">
                      {q.maxMarks}
                    </th>
                  ))}
                </tr>
                {/* Headers */}
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  <th className="px-4 py-3 font-semibold text-left border-r border-slate-200 dark:border-slate-700 sticky left-0 z-10 bg-slate-50 dark:bg-slate-800">Roll No</th>
                  <th className="px-4 py-3 font-semibold text-left border-r border-slate-200 dark:border-slate-700 sticky left-[100px] z-10 bg-slate-50 dark:bg-slate-800">Name</th>
                  {reportData.questions.map(q => (
                    <th key={q.id} className="px-3 py-3 font-bold text-center border-r border-slate-200 dark:border-slate-700 last:border-0" title={q.label}>
                      {q.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {reportData.students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-mono text-xs sticky left-0 z-10 bg-white dark:bg-slate-800">
                      {student.rollNo}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px] sticky left-[100px] z-10 bg-white dark:bg-slate-800">
                      {student.name}
                    </td>
                    {reportData.questions.map(q => {
                      const mark = reportData.marksGrid[student.id]?.[q.id]
                      const threshold = reportData.calculations[q.id]?.thresholdMark || 0
                      const isPass = mark >= threshold
                      return (
                        <td key={q.id} className={`px-3 py-2 text-center border-r border-slate-100 dark:border-slate-700 last:border-0 font-semibold ${
                          mark === undefined || mark === null ? 'text-slate-300 dark:text-slate-600 font-normal' : 
                          isPass ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                        }`}>
                          {mark !== undefined && mark !== null ? mark : '-'}
                        </td>
                      )
                    })}
                  </tr>
                ))}

                {/* Blank Separator */}
                <tr><td colSpan={reportData.questions.length + 2} className="h-6 bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-700"></td></tr>

                {/* Footer Calcs */}
                <tr className="bg-emerald-50/50 dark:bg-emerald-900/10">
                  <td colSpan="2" className="px-4 py-3 font-semibold text-right border-r border-emerald-100 dark:border-emerald-800/30 text-emerald-800 dark:text-emerald-300 text-sm">
                    Students Scoring &gt;= 40% threshold
                  </td>
                  {reportData.questions.map(q => (
                    <td key={'count'+q.id} className="px-3 py-3 text-center border-r border-emerald-100 dark:border-emerald-800/30 font-bold text-slate-700 dark:text-slate-300">
                      {reportData.calculations[q.id]?.passedCount || 0}
                    </td>
                  ))}
                </tr>
                <tr className="bg-emerald-50/80 dark:bg-emerald-900/20">
                  <td colSpan="2" className="px-4 py-3 font-semibold text-right border-r border-emerald-100 dark:border-emerald-800/30 text-emerald-900 dark:text-emerald-200 text-sm">
                    % of Students Crossing Threshold
                  </td>
                  {reportData.questions.map(q => (
                    <td key={'pct'+q.id} className="px-3 py-3 text-center border-r border-emerald-100 dark:border-emerald-800/30 font-bold text-slate-800 dark:text-slate-200">
                      {reportData.calculations[q.id]?.passPct || 0}%
                    </td>
                  ))}
                </tr>
                <tr className="bg-emerald-100 dark:bg-emerald-900/40">
                  <td colSpan="2" className="px-4 py-4 font-bold text-right border-r border-emerald-200 dark:border-emerald-700/50 text-emerald-950 dark:text-emerald-100 uppercase tracking-widest text-xs">
                    Attainment Level (0-3)
                  </td>
                  {reportData.questions.map(q => {
                    const lvl = reportData.calculations[q.id]?.level || 0
                    return (
                      <td key={'lvl'+q.id} className={`px-3 py-4 text-center border-r border-emerald-200 dark:border-emerald-700/50 text-lg font-black ${
                        lvl >= 2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {lvl}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

    </div>
  )
}
