import { useState, useEffect, useRef } from 'react'
import { useCachedState } from '../context/PageCacheContext'
import { FileSpreadsheet, Loader2, Download, AlertCircle, Printer, X } from 'lucide-react'
import axios from 'axios'

export default function Reports() {
  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useCachedState('rep_selectedCourseId', '')
  const [reportData, setReportData] = useCachedState('rep_reportData', null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const printRef = useRef(null)

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        // Load lean list (no courseOutcomes) for the dropdown — much faster
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
    fetchDetailedReport()
  }, [selectedCourseId])

  const fetchDetailedReport = async () => {
    setLoading(true)
    setError('')
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      const res = await axios.get(`http://localhost:5000/api/reports/detailed/${selectedCourseId}`, config)
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

    csvRows.push(',,,,') // Empty gap
    
    // Calculate final CO Aggregation
    const coMap = {}
    questions.forEach(q => {
       const co = calculations[q.id]?.co
       if (co && co !== 'N/A') {
          if (!coMap[co]) coMap[co] = { sum: 0, count: 0 }
          coMap[co].sum += (calculations[q.id]?.level || 0)
          coMap[co].count += 1
       }
    })
    
    csvRows.push('FINAL CO ATTAINMENT,')
    Object.keys(coMap).sort().forEach(co => {
      const avg = (coMap[co].sum / coMap[co].count).toFixed(2)
      csvRows.push(`${co},${avg}`)
    })

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('href', url)
    a.setAttribute('download', `OBE_Report_${reportData.courseDetails.code}.csv`)
    a.click()
  }

  const handlePrintPDF = () => {
    if (!reportData) return

    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow pop-ups for PDF export.')
      return
    }

    // Compute the Final CO HTML for the PDF
    let coSummaryHTML = ''
    const coMapPDF = {}
    reportData.questions.forEach(q => {
      const co = reportData.calculations[q.id]?.co
      if (co && co !== 'N/A') {
        if (!coMapPDF[co]) coMapPDF[co] = { sum: 0, count: 0 }
        coMapPDF[co].sum += (reportData.calculations[q.id]?.level || 0)
        coMapPDF[co].count += 1
      }
    })
    
    if (Object.keys(coMapPDF).length > 0) {
      const cards = Object.keys(coMapPDF).sort().map(co => {
        const avg = (coMapPDF[co].sum / coMapPDF[co].count).toFixed(2)
        return `<div class="co-card"><div class="co-card-title">${co}</div><div class="co-card-val">${avg}</div></div>`
      }).join('')
      
      coSummaryHTML = `
        <div class="co-summary-container">
          <div class="co-summary-title">Final Course Outcome Attainment</div>
          <div class="co-grid">${cards}</div>
        </div>
      `
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OBE Attainment Report — ${reportData.courseDetails.code}</title>
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
          .max-marks-row th { background: #ecfdf5; color: #059669; font-size: 9px; }
          .footer-row td { background: #f0fdf4; font-weight: 700; }
          .level-row td { background: #dcfce7; font-weight: 900; font-size: 13px; }
          .pass-mark { color: #059669; }
          .fail-mark { color: #94a3b8; }
          
          .co-summary-container { margin-top: 30px; page-break-inside: avoid; border: 2px solid #334155; border-radius: 8px; padding: 15px; }
          .co-summary-title { font-size: 12px; font-weight: 800; color: #1e293b; text-align: center; margin-bottom: 15px; text-transform: uppercase; }
          .co-grid { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
          .co-card { border: 1px solid #cbd5e1; padding: 10px 15px; text-align: center; background: #f8fafc; border-radius: 4px; min-width: 80px; }
          .co-card-title { font-size: 10px; font-weight: 700; color: #64748b; margin-bottom: 4px; }
          .co-card-val { font-size: 18px; font-weight: 900; color: #0f172a; }

          .report-footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>Bridgify — OBE Attainment Report</h1>
          <p>${reportData.courseDetails.code} — ${reportData.courseDetails.name}</p>
        </div>
        <div class="report-meta">
          <span>Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span>Students: ${reportData.students.length} | Questions: ${reportData.questions.length}</span>
        </div>
        <table>
          <thead>
            <tr class="max-marks-row">
              <th colspan="2" style="text-align:right;">Max Marks</th>
              ${reportData.questions.map(q => `<th>${q.maxMarks}</th>`).join('')}
            </tr>
            <tr>
              <th class="sticky-col" style="min-width:80px;">Roll No</th>
              <th class="sticky-col" style="min-width:140px;">Name</th>
              ${reportData.questions.map(q => `<th>${q.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${reportData.students.map(student => {
              const cells = reportData.questions.map(q => {
                const mark = reportData.marksGrid[student.id]?.[q.id]
                const threshold = reportData.calculations[q.id]?.thresholdMark || 0
                const isPass = mark >= threshold
                return `<td class="${mark !== undefined && mark !== null ? (isPass ? 'pass-mark' : 'fail-mark') : ''}">${mark !== undefined && mark !== null ? mark : '-'}</td>`
              }).join('')
              return `<tr><td class="sticky-col">${student.rollNo}</td><td class="sticky-col">${student.name}</td>${cells}</tr>`
            }).join('')}
            <tr><td colspan="${reportData.questions.length + 2}" style="height:8px;background:#f8fafc;"></td></tr>
            <tr class="footer-row">
              <td colspan="2" style="text-align:right;">Students ≥ 40% Threshold</td>
              ${reportData.questions.map(q => `<td>${reportData.calculations[q.id]?.passedCount || 0}</td>`).join('')}
            </tr>
            <tr class="footer-row">
              <td colspan="2" style="text-align:right;">% of Students Passed</td>
              ${reportData.questions.map(q => `<td>${reportData.calculations[q.id]?.passPct || 0}%</td>`).join('')}
            </tr>
            <tr class="level-row">
              <td colspan="2" style="text-align:right;">Attainment Level (0-3)</td>
              ${reportData.questions.map(q => `<td>${reportData.calculations[q.id]?.level || 0}</td>`).join('')}
            </tr>
          </tbody>
        </table>

        ${coSummaryHTML}

        <div class="report-footer">
          This report was auto-generated by Bridgify OBE Platform. For official accreditation use only.
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
        <div className="p-4 rounded-xl flex items-start gap-3 text-sm font-medium bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-900/30 dark:border-rose-800/50 dark:text-rose-400">
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
        <div ref={printRef} className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm animate-in fade-in">
          <button onClick={() => { setSelectedCourseId(''); setReportData(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors z-50">
             <X size={20} />
          </button>
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
             <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                   {reportData.courseDetails.code} — {reportData.courseDetails.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{reportData.students.length} students · {reportData.questions.length} questions</p>
             </div>
             <div className="flex items-center gap-2">
               <button 
                  onClick={handlePrintPDF}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
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

          {/* React UI CO Summary Footer */}
          {(() => {
             const coMap = {}
             reportData.questions.forEach(q => {
                const co = reportData.calculations[q.id]?.co
                if (co && co !== 'N/A') {
                   if (!coMap[co]) coMap[co] = { sum: 0, count: 0 }
                   coMap[co].sum += (reportData.calculations[q.id]?.level || 0)
                   coMap[co].count += 1
                }
             })
             
             if (Object.keys(coMap).length === 0) return null

             return (
               <div className="p-8 bg-slate-50 dark:bg-slate-900 shadow-inner border-t border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mb-6 uppercase tracking-widest text-center">Final Course Outcome Attainment</h4>
                  <div className="flex flex-wrap justify-center gap-5">
                    {Object.keys(coMap).sort().map(coVal => {
                      const avg = (coMap[coVal].sum / coMap[coVal].count).toFixed(2)
                      const isPass = parseFloat(avg) >= 2.0
                      return (
                        <div key={coVal} className={`px-6 py-4 rounded-2xl border-2 flex flex-col items-center gap-1 w-32 shadow-sm ${
                          isPass ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-700/50' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700/50'
                        }`}>
                          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{coVal}</span>
                          <span className={`text-2xl font-black ${isPass ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>{avg}</span>
                        </div>
                      )
                    })}
                  </div>
               </div>
             )
          })()}

        </div>
      ) : null}

    </div>
  )
}
