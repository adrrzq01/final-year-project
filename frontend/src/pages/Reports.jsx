import { useState, useEffect, useRef } from 'react'
import { useCachedState } from '../context/PageCacheContext'
import { FileSpreadsheet, Loader2, Download, AlertCircle, Printer, X, ClipboardList } from 'lucide-react'
import axios from 'axios'

export default function Reports() {
  const [courses, setCourses] = useState([])
  const [selectedClass, setSelectedClass] = useCachedState('rep_selectedClass', '')
  const [selectedDivision, setSelectedDivision] = useCachedState('rep_selectedDivision', '')
  const [selectedCourseId, setSelectedCourseId] = useCachedState('rep_selectedCourseId', '')
  const [reportData, setReportData] = useCachedState('rep_consolidatedData', null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const printRef = useRef(null)

  // Extract unique identifiers for filters
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
        const res = await axios.get('http://localhost:5000/api/courses?lean=true', config)
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
    fetchConsolidatedReport()
  }, [selectedCourseId])

  const fetchConsolidatedReport = async () => {
    setLoading(true)
    setError('')
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      const res = await axios.get(`http://localhost:5000/api/reports/consolidated/${selectedCourseId}`, config)
      setReportData(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate report data')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCSV = () => {
    if (!reportData?.students || !reportData?.exams) return

    const { students, exams, marksGrid } = reportData
    
    const headers = ['Roll Number', 'Name', ...exams.map(e => `${e.name} (Max: ${e.maxMarks})`), 'Total Score']
    const csvRows = [headers.join(',')]

    students.forEach(student => {
      let total = 0
      const row = [student.rollNo, `"${student.name}"`]
      exams.forEach(exam => {
        const mark = marksGrid[student.id]?.[exam.id] || 0
        total += mark
        row.push(mark)
      })
      row.push(total)
      csvRows.push(row.join(','))
    })

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('href', url)
    a.setAttribute('download', `Consolidated_Marks_${reportData.courseDetails.code}.csv`)
    a.click()
  }

  const handlePrintPDF = () => {
    if (!reportData?.students || !reportData?.exams) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow pop-ups for PDF export.')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Consolidated Marks Report — ${reportData.courseDetails.code}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #1e293b; }
          .report-header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #334155; padding-bottom: 16px; }
          .report-header h1 { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
          .report-header p { font-size: 11px; color: #64748b; }
          .report-meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 11px; color: #475569; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: center; }
          th { background: #f1f5f9; font-weight: 700; color: #334155; }
          .sticky-col { text-align: left; font-weight: 600; }
          .total-col { font-weight: 800; background: #f8fafc; }
          .report-footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>Bridgify — Consolidated Marks Report</h1>
          <p>${reportData.courseDetails.code} — ${reportData.courseDetails.name}</p>
        </div>
        <div class="report-meta">
          <span>Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span>Students: ${reportData.students.length} | Exams: ${reportData.exams.length}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th class="sticky-col" style="min-width:80px;">Roll No</th>
              <th class="sticky-col" style="min-width:140px;">Name</th>
              ${reportData.exams.map(e => `<th>${e.name}<br/><span style="font-size:8px;color:#64748b;">(Max: ${e.maxMarks})</span></th>`).join('')}
              <th class="total-col">Total Marks</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.students.map(student => {
              let total = 0;
              const cells = reportData.exams.map(exam => {
                const mark = reportData.marksGrid[student.id]?.[exam.id] || 0
                total += mark
                return `<td>${mark}</td>`
              }).join('')
              return `<tr><td class="sticky-col">${student.rollNo}</td><td class="sticky-col">${student.name}</td>${cells}<td class="total-col">${total}</td></tr>`
            }).join('')}
          </tbody>
        </table>
        <div class="report-footer">
          This report was auto-generated by Bridgify. For official institution use.
        </div>
      </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 400)
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ClipboardList size={22} className="text-blue-600 dark:text-blue-400" />
            Consolidated Marks Report
          </h2>
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

            <div className="flex-[2] min-w-[240px]">
               <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider text-center lg:text-left">Select Target Course</label>
               <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
               >
                  <option value="">-- Choose a Course --</option>
                  {filteredCourses.map(course => (
                     <option key={course.id} value={course.id}>
                        {course.code} - {course.name}
                     </option>
                  ))}
               </select>
            </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl flex items-start gap-3 text-sm font-medium bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-900/30 dark:border-rose-800/50 dark:text-rose-400">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {!selectedCourseId ? (
         <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40">
           <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
             <ClipboardList size={28} className="text-blue-500" />
           </div>
           <p className="text-slate-500 dark:text-slate-400 font-medium">Select a Course to generate its consolidated report.</p>
         </div>
      ) : loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
      ) : reportData ? (
        <div ref={printRef} className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm animate-in fade-in">
          <button onClick={() => { setSelectedCourseId(''); setReportData(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors z-50">
             <X size={20} />
          </button>
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
             <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                   {reportData?.courseDetails?.code} — {reportData?.courseDetails?.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{reportData?.students?.length || 0} students · {reportData?.exams?.length || 0} exams</p>
             </div>
             <div className="flex items-center gap-2">
               <button 
                  onClick={handlePrintPDF}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
               >
                  <Printer size={16} /> Export to PDF
               </button>
               <button 
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-2 bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-sm"
               >
                  <Download size={16} /> Export to CSV
               </button>
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  <th className="px-6 py-4 font-semibold text-left border-r border-slate-200 dark:border-slate-700 sticky left-0 z-10 bg-slate-50 dark:bg-slate-800">Roll No</th>
                  <th className="px-6 py-4 font-semibold text-left border-r border-slate-200 dark:border-slate-700 sticky left-[120px] z-10 bg-slate-50 dark:bg-slate-800">Name</th>
                  {reportData.exams.map(exam => (
                    <th key={exam.id} className="px-4 py-4 font-bold text-center border-r border-slate-200 dark:border-slate-700">
                      <div className="flex flex-col items-center">
                         <span>{exam.name}</span>
                         <span className="text-[10px] text-slate-500 font-normal uppercase tracking-wider mt-1">Max: {exam.maxMarks}</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-4 font-black text-center bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200">Total Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {reportData.students.map((student) => {
                  let grandTotal = 0;
                  return (
                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-3 border-r border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-mono text-xs sticky left-0 z-10 bg-white dark:bg-slate-800">
                        {student.rollNo}
                      </td>
                      <td className="px-6 py-3 border-r border-slate-100 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px] sticky left-[120px] z-10 bg-white dark:bg-slate-800">
                        {student.name}
                      </td>
                      {reportData.exams.map(exam => {
                        const mark = reportData.marksGrid[student.id]?.[exam.id] || 0
                        grandTotal += mark
                        return (
                          <td key={exam.id} className="px-4 py-3 text-center border-r border-slate-100 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300">
                            {mark}
                          </td>
                        )
                      })}
                      <td className="px-6 py-3 text-center font-black bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 text-base">
                        {grandTotal}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

    </div>
  )
}
