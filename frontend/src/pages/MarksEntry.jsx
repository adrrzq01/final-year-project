import { useState, useEffect, useRef, Fragment } from 'react'
import { useCachedState } from '../context/PageCacheContext'
import { ChevronDown, Save, RotateCcw, Download, Table2, UploadCloud, CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet, X } from 'lucide-react'
import axios from 'axios'
import Papa from 'papaparse'
import { useAlert } from '../context/AlertContext'

const MarksInputCell = ({ sIdx, sqIdx, studentId, sq, cellVal, isInvalid, handleMarkChange, handleKeyDown }) => {
  const [isGlowing, setIsGlowing] = useState(false)
  const inputRef = useRef(null)
  
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    
    const handleWheel = (e) => {
      // Must be globally focused to intercept the wheel safely
      if (document.activeElement !== el) return
      
      e.preventDefault() // Completely neutralize global page scroll without blurring focus!
      
      const dir = e.deltaY < 0 ? 0.5 : -0.5
      const numVal = cellVal === '' ? 0 : Number(cellVal)
      const nextVal = Math.max(0, Math.min(sq.maxMarks, numVal + dir))
      
      if (nextVal !== numVal) {
        handleMarkChange(studentId, sq.id, nextVal, sq.maxMarks)
        setIsGlowing(true)
      }
    }
    
    // Bind native non-passive interceptor
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [cellVal, sq.maxMarks, studentId, sq.id, handleMarkChange])

  // Automatically drain the glow
  useEffect(() => {
    if (isGlowing) {
      const t = setTimeout(() => setIsGlowing(false), 2500)
      return () => clearTimeout(t)
    }
  }, [isGlowing])

  return (
    <td className={`relative px-1 py-1 text-center border-r border-slate-100 dark:border-slate-700/50 
      ${isInvalid ? 'bg-rose-50 dark:bg-rose-900/20' : ''}
      ${isGlowing ? 'bg-amber-100/90 dark:bg-amber-900/50 ring-2 ring-inset ring-amber-400 dark:ring-amber-500 shadow-inner' : 'transition-colors duration-700'}
    `}>
      <input
        ref={inputRef}
        id={`mark-${sIdx}-${sqIdx}`}
        type="number"
        min="0"
        max={sq.maxMarks}
        step="0.5"
        value={cellVal}
        onChange={(e) => handleMarkChange(studentId, sq.id, e.target.value, sq.maxMarks)}
        onKeyDown={(e) => handleKeyDown(e, sIdx, sqIdx)}
        onFocus={(e) => e.target.select()}
        className={`w-14 text-center text-[13px] font-bold bg-transparent border-b-2 focus:outline-none transition-all py-1 rounded-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
          ${isInvalid 
            ? 'text-rose-600 border-rose-400 focus:bg-rose-100 dark:focus:bg-rose-900/40' 
            : 'text-slate-800 dark:text-slate-200 border-transparent focus:border-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-indigo-100 dark:focus:bg-indigo-900/40 placeholder-slate-300 dark:placeholder-slate-600'
          }`}
        placeholder="-"
      />
    </td>
  )
}

const CSVUploader = ({ courseId, examId, subQuestions, refreshGrid, showAlert }) => {
  const [analysis, setAnalysis] = useState([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [conflictMap, setConflictMap] = useState({})
  const [isCommitting, setIsCommitting] = useState(false)
  const fileInputRef = useRef()

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if(!file) return
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setIsAnalyzing(true)
        try {
           const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
           const res = await axios.post('http://localhost:5000/api/marks/csv-analyze', {
              courseId,
              examId,
              parsedRows: results.data
           }, config)
           setAnalysis(res.data.analysis)
           setConflictMap({}) // Reset conflicts
        } catch(err) {
           showAlert(err.response?.data?.error || 'CSV Analysis failed', 'error')
        } finally {
           setIsAnalyzing(false)
           if(fileInputRef.current) fileInputRef.current.value = ''
        }
      }
    })
  }

  const resolveConflict = (rowIdx, studentId) => {
     setConflictMap(prev => ({ ...prev, [rowIdx]: studentId }))
  }

  const handleCommit = async () => {
     const hasUnresolved = analysis.some((row, i) => row.status === 'Fuzzy Match' && !conflictMap[i])
     if(hasUnresolved) return showAlert("Please resolve all Yellow conflicts before committing!", "warning")

     const cleanMarks = []
     analysis.forEach((row, i) => {
        if(row.status === 'Not Found') return 
        let targetStudentId = row.matchedStudentId
        if(row.status === 'Fuzzy Match') targetStudentId = conflictMap[i]
        if(!targetStudentId) return 

        subQuestions.forEach(sq => {
           const rawKey = Object.keys(row.originalRow).find(k => k.toLowerCase().replace(/\s/g,'') === sq.label.toLowerCase().replace(/\s/g,''))
           if(rawKey) {
             const obtainedMarks = row.originalRow[rawKey]
             if(obtainedMarks !== undefined && obtainedMarks !== '') {
                cleanMarks.push({
                   studentId: targetStudentId,
                   questionId: sq.id,
                   obtainedMarks: Number(obtainedMarks)
                })
             }
           }
        })
     })

     setIsCommitting(true)
     try {
       const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
       await axios.post('http://localhost:5000/api/marks/csv-commit', { cleanMarks }, config)
       showAlert("CSV Marks Committed Successfully", "success")
       setAnalysis([]) 
       refreshGrid() 
     } catch(e) {
       showAlert("Commit failed", "error")
     } finally {
       setIsCommitting(false)
     }
  }

  const hasUnresolved = analysis.some((row, i) => row.status === 'Fuzzy Match' && !conflictMap[i])

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 animate-in fade-in transition-all">
      {analysis.length === 0 ? (
         <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/40 relative hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
            <UploadCloud size={48} className="text-indigo-400 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Drag & Drop CSV File</h3>
            <p className="text-sm text-slate-500 max-w-sm text-center mt-2">Upload your marks sheet. Ensure it has columns like RollNo, Name, and Q1a, Q1b, etc.</p>
            <input 
               type="file" 
               accept=".csv" 
               ref={fileInputRef}
               onChange={handleFileUpload}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {isAnalyzing && <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center font-bold text-indigo-600 text-sm">Analyzing Algorithm Running...</div>}
         </div>
      ) : (
         <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
               <div>
                 <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><FileSpreadsheet size={18} className="text-indigo-500"/> Staging Area (Pre-Commit Analysis)</h3>
                 <p className="text-xs text-slate-500 mt-1">Review matches. Any typos must be resolved manually before saving.</p>
               </div>
               <div className="flex gap-3">
                  <button onClick={() => setAnalysis([])} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors bg-slate-100 dark:bg-slate-800 rounded-xl">Cancel</button>
                  <button 
                     onClick={handleCommit}
                     disabled={hasUnresolved || isCommitting}
                     className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     {isCommitting ? 'Committing...' : 'Confirm & Submit Marks'}
                  </button>
               </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wide">
                     <tr>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">CSV Row Data (Raw Input)</th>
                        <th className="px-4 py-3">Conflict Resolution</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                     {analysis.map((row, i) => {
                        const rollKey = Object.keys(row.originalRow).find(k => k.toLowerCase().replace(/[\s_.-]/g, '') === 'rollno') || Object.keys(row.originalRow)[0]
                        const nameKey = Object.keys(row.originalRow).find(k => k.toLowerCase().includes('name')) || Object.keys(row.originalRow)[1]
                        const rawRoll = row.originalRow[rollKey]
                        const rawName = row.originalRow[nameKey]

                        return (
                           <tr key={i} className={`
                              ${row.status === 'Exact Match' ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}
                              ${row.status === 'Fuzzy Match' ? 'bg-amber-50/60 dark:bg-amber-900/20' : ''}
                              ${row.status === 'Not Found' ? 'bg-rose-50/50 dark:bg-rose-900/10 opacity-75' : ''}
                           `}>
                              <td className="px-4 py-3">
                                 {row.status === 'Exact Match' && <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600"><CheckCircle2 size={14}/> Exact Match</span>}
                                 {row.status === 'Fuzzy Match' && <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600"><AlertTriangle size={14}/> Fuzzy Clash</span>}
                                 {row.status === 'Not Found' && <span className="flex items-center gap-1.5 text-xs font-bold text-rose-500"><XCircle size={14}/> Not Found</span>}
                              </td>
                              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                 <strong className="text-slate-900 dark:text-white">{rawRoll}</strong> — {rawName}
                              </td>
                              <td className="px-4 py-3 min-w-[200px]">
                                 {row.status === 'Exact Match' && <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-semibold italic">Automatically locked</span>}
                                 {row.status === 'Not Found' && <span className="text-xs text-rose-500/70 dark:text-rose-400/70 font-semibold italic">Row will be discarded</span>}
                                 {row.status === 'Fuzzy Match' && (
                                    <select 
                                      value={conflictMap[i] || ""}
                                      onChange={e => resolveConflict(i, e.target.value)}
                                      className="w-full max-w-xs text-xs font-semibold px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700/50 text-slate-800 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    >
                                      <option value="" disabled>Select Student Database Match...</option>
                                      {row.suggestions.map(s => (
                                         <option key={s.id} value={s.id}>{s.rollNo} - {s.name} ({s.score}% Match)</option>
                                      ))}
                                    </select>
                                 )}
                              </td>
                           </tr>
                        )
                     })}
                  </tbody>
               </table>
            </div>
         </div>
      )}
    </div>
  )
}

export default function MarksEntry() {
  const { showAlert, showConfirm } = useAlert()
  const [courses, setCourses] = useState([])
  const [selectedClass, setSelectedClass] = useCachedState('marks_selectedClass', '')
  const [selectedDivision, setSelectedDivision] = useCachedState('marks_selectedDivision', '')
  const [courseSelected, setCourseSelected] = useCachedState('marks_courseSelected', '')
  
  const uniqueClasses = [...new Set(courses.map(c => c.academicClass?.name))].filter(Boolean).sort()
  const uniqueDivisions = [...new Set(courses.map(c => c.academicClass?.division))].filter(Boolean).sort()

  const filteredCourses = courses.filter(c => {
    const classMatch = !selectedClass || c.academicClass?.name === selectedClass
    const divMatch = !selectedDivision || c.academicClass?.division === selectedDivision
    return classMatch && divMatch
  })
  
  const [exams, setExams] = useCachedState('marks_exams', [])
  const [examSelected, setExamSelected] = useCachedState('marks_examSelected', '')
  
  const [students, setStudents] = useCachedState('marks_students', [])
  const [subQuestions, setSubQuestions] = useCachedState('marks_subQuestions', [])
  
  // Matrix state: { "studentId-subQuestionId": obtainedMarks }
  const [marksData, setMarksData] = useCachedState('marks_marksData', {})
  
  const [activeTab, setActiveTab] = useCachedState('marks_activeTab', 'manual') // 'manual' | 'csv'
  const [isSaving, setIsSaving] = useState(false)
  const [loadingGrid, setLoadingGrid] = useState(false)
  const [savedSessions, setSavedSessions] = useState([])
  const [showGrid, setShowGrid] = useCachedState('marks_showGrid', false)
  const [currentPage, setCurrentPage] = useCachedState('marks_currentPage', 1)
  const PAGE_SIZE = 20

  // 1. Fetch Courses on Mount
  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      const res = await axios.get('http://localhost:5000/api/courses', config)
      setCourses(res.data)
    } catch (err) {
      console.error('Failed to fetch courses:', err)
    }
  }

  // 2. Fetch Aggregated Course Data (Students + Nested Blueprints)
  useEffect(() => {
    if (!courseSelected) {
      setExams([])
      setExamSelected('')
      setStudents([])
      setSubQuestions([])
      return
    }

    const fetchCourseGridData = async () => {
      try {
        setLoadingGrid(true)
        const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        const { data } = await axios.get(`http://localhost:5000/api/courses/${courseSelected}/enrollments-exams`, config)
        
        setStudents(data.students || [])
        setExams(data.exams || [])
        setCurrentPage(1) // Reset to page 1 on course change
        
        let existingMarksMap = {}
        if (data.exams) {
           data.exams.forEach(ex => {
             if (!ex.questions) return
             ex.questions.forEach(mainQ => {
               if (!mainQ.subQuestions) return
               mainQ.subQuestions.forEach(sq => {
                 if (sq.marks && sq.marks.length > 0) {
                   sq.marks.forEach(m => {
                     existingMarksMap[`${m.studentId}_${sq.id}`] = m.obtainedMarks
                   })
                 }
               })
             })
           })
        }
        setMarksData(existingMarksMap)

        // Pre-select first exam if available to save clicks
        if (data.exams && data.exams.length > 0) {
          setExamSelected(data.exams[0].id)
        } else {
          setExamSelected('')
        }
      } catch (err) {
        console.error('Error fetching enrollments/exams:', err)
      } finally {
        setLoadingGrid(false)
      }
    }

    fetchCourseGridData()
  }, [courseSelected])

  // 3. Build the X-Axis (SubQuestions) dynamically
  useEffect(() => {
    if (!examSelected || exams.length === 0) {
      setSubQuestions([])
      return
    }

    const exam = exams.find(e => e.id === examSelected)
    if (exam && exam.questions) {
      let subs = []
      exam.questions.forEach(mainQ => {
        mainQ.subQuestions.forEach(sq => {
          subs.push({
            id: sq.id,
            label: `${mainQ.qNumber}${sq.qNumber}`,
            maxMarks: sq.maxMarks
          })
        })
      })
      setSubQuestions(subs)
    }
  }, [examSelected, exams])

  // Handlers
  const handleKeyDown = (e, rIdx, cIdx) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault()
      let nextRow = rIdx
      let nextCol = cIdx
      
      if (e.key === 'ArrowUp') nextRow = Math.max(0, rIdx - 1)
      if (e.key === 'ArrowDown') nextRow = Math.min(students.length - 1, rIdx + 1)
      if (e.key === 'ArrowLeft') nextCol = Math.max(0, cIdx - 1)
      if (e.key === 'ArrowRight') nextCol = Math.min(subQuestions.length - 1, cIdx + 1)

      const nextInput = document.getElementById(`mark-${nextRow}-${nextCol}`)
      if (nextInput) {
        nextInput.focus()
        nextInput.select()
      }
    }
  }

  const handleMarkChange = (studentId, subQId, value, maxMarks) => {
    const numValue = Number(value)
    
    // Strict Input Validation Ceilings
    if (numValue > maxMarks) {
      showAlert(`Invalid Score: The max allowed is ${maxMarks}.`, 'error')
      return
    }
    if (numValue < 0) return

    setMarksData(prev => ({
      ...prev,
      [`${studentId}_${subQId}`]: value
    }))
  }

  const handleSaveMarks = async () => {
    if (Object.keys(marksData).length === 0) return showAlert('No marks entered.', 'warning')
    
    setIsSaving(true)
    
    const payload = Object.entries(marksData).map(([key, obtainedMarks]) => {
      const [studentId, questionId] = key.split('_')
      return { studentId, questionId, obtainedMarks: Number(obtainedMarks) }
    })

    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      await axios.post('http://localhost:5000/api/marks', { marks: payload }, config)
      showAlert('Marks saved successfully!', 'success')

      // Build a session summary card
      const courseName = courses.find(c => c.id === courseSelected)
      const examName = exams.find(e => e.id === examSelected)
      const entriesCount = Object.values(marksData).filter(v => v !== '' && v !== null && v !== undefined).length

      setSavedSessions(prev => [{
        id: Date.now(),
        courseId: courseSelected,
        examId: examSelected,
        courseName: courseName ? `${courseName.code} - ${courseName.name}` : 'Unknown Course',
        examName: examName ? examName.name : 'Unknown Exam',
        totalMarks: examName ? examName.totalMarks : '—',
        studentCount: students.length,
        entriesCount,
        savedAt: new Date().toLocaleString()
      }, ...prev])

      // Collapse the grid
      setShowGrid(false)
      setExamSelected('')
      setSubQuestions([])
      setMarksData({})
    } catch (err) {
      console.error(err)
      showAlert('Failed to save marks', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    const ok = await showConfirm('Are you sure you want to clear all currently entered marks on this screen?')
    if (ok) {
      setMarksData({})
    }
  }

  return (
    <div className="space-y-6 max-w-full pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Marks Entry Spreadsheets</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Cross-reference active student rosters with structured Exam Blueprints</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
           <button 
             onClick={() => setActiveTab('manual')}
             className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'manual' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
           >Manual Grid</button>
           <button 
             onClick={() => setActiveTab('csv')}
             className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'csv' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
           >Smart CSV Upload</button>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'manual' && (
            <>
              <button onClick={handleReset} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-sm">
                <RotateCcw size={15} /> Reset
              </button>
              <button className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-sm">
                <Download size={15} /> Export
              </button>
              <button 
                onClick={handleSaveMarks}
                disabled={isSaving || subQuestions.length === 0}
                className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 active:scale-95 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
              >
                <Save size={16} /> {isSaving ? 'Syncing...' : 'Save Matrix'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-8 bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
          <div className="flex-1 min-w-[140px]">
             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Select Class</label>
             <select
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setCourseSelected(''); }}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
             >
                <option value="">— All Classes —</option>
                {uniqueClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
             </select>
          </div>

          <div className="flex-1 min-w-[140px]">
             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Select Division</label>
             <select
                value={selectedDivision}
                onChange={(e) => { setSelectedDivision(e.target.value); setCourseSelected(''); }}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
             >
                <option value="">— All Divisions —</option>
                {uniqueDivisions.map(div => <option key={div} value={div}>Division {div}</option>)}
             </select>
          </div>

          <div className="flex-[2] min-w-[240px] relative">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
              Select Target Course
            </label>
            <select
              value={courseSelected}
              onChange={e => setCourseSelected(e.target.value)}
              className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 pl-4 pr-10 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent cursor-pointer transition-all shadow-sm"
            >
              <option value="">— Select Target Course —</option>
              {filteredCourses.map(c => (
                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3.5 top-[38px] text-slate-400 pointer-events-none" />
          </div>

          <div className="flex-1 min-w-[160px] relative">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
              Select Exam
            </label>
            <select
              disabled={!courseSelected}
              value={examSelected}
              onChange={e => setExamSelected(e.target.value)}
              className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 pl-4 pr-10 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent cursor-pointer transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">— Select Exam —</option>
              {exams.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3.5 top-[38px] text-slate-400 pointer-events-none" />
          </div>
        </div>
        
        {subQuestions.length > 0 && (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800">
              {students.length} Students
            </span>
            <span className="text-xs font-bold bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800">
              {subQuestions.length} Questions
            </span>
            {!showGrid ? (
              <button
                onClick={() => setShowGrid(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
              >
                <Table2 size={14} /> Open Grid
              </button>
            ) : (
              <button
                onClick={() => setShowGrid(false)}
                className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl hover:bg-slate-200 active:scale-95 transition-all"
              >
                Collapse Grid
              </button>
            )}
          </div>
        )}
      </div>

      {loadingGrid && (
        <div className="py-20 flex justify-center text-indigo-500 animate-pulse font-semibold">
          Synchronizing Academic Registries...
        </div>
      )}

      {/* Grid Area — only shown when showGrid is true */}
      {showGrid && !loadingGrid && (
        <>
          {(students.length === 0 || subQuestions.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 transition-colors duration-300">
              <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-6 shadow-sm">
                <Table2 size={36} className="text-indigo-500 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Grid Uninitialized</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center max-w-md leading-relaxed">
                Ensure you have completely mapped the <strong>Exam Blueprint</strong> and verified that the <strong>Student Roster</strong> is populated for your department.
              </p>
            </div>
          ) : activeTab === 'csv' ? (
            <CSVUploader
              courseId={courseSelected}
              examId={examSelected}
              subQuestions={subQuestions}
              refreshGrid={() => setCourseSelected(courseSelected)}
              showAlert={showAlert}
            />
          ) : (
            <div className="relative bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors duration-300">
              <button onClick={() => setShowGrid(false)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors z-50">
                <X size={20} />
              </button>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-700">
                      <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 text-left px-5 py-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest min-w-[220px] border-r border-slate-200 dark:border-slate-700 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                        Enrolled Student
                      </th>
                      {subQuestions.map(sq => (
                        <th key={sq.id} className="text-center px-2 py-3 border-r border-slate-200 dark:border-slate-700 min-w-[70px]">
                          <div className="text-[13px] font-black text-slate-800 dark:text-slate-200">{sq.label}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 bg-slate-100 dark:bg-slate-800 rounded px-1 py-0.5 inline-block border border-slate-200 dark:border-slate-700">Max {sq.maxMarks}</div>
                        </th>
                      ))}
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {students.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((student, sIdx) => {
                      const rowTotal = subQuestions.reduce((sum, sq) => {
                        return sum + Number(marksData[`${student.id}_${sq.id}`] || 0)
                      }, 0)
                      return (
                        <tr key={student.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group">
                          <td className="sticky left-0 z-10 bg-white dark:bg-slate-800/90 group-hover:bg-indigo-50/90 dark:group-hover:bg-slate-800 px-5 py-3 border-r border-slate-200 dark:border-slate-700 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)] transition-colors">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{student.rollNo}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate w-[190px]" title={student.name}>{student.name}</div>
                          </td>
                          {subQuestions.map((sq, sqIdx) => {
                            const cellVal = marksData[`${student.id}_${sq.id}`] || ''
                            const isInvalid = Number(cellVal) > sq.maxMarks
                            return (
                              <MarksInputCell
                                key={sq.id}
                                sIdx={sIdx}
                                sqIdx={sqIdx}
                                studentId={student.id}
                                sq={sq}
                                cellVal={cellVal}
                                isInvalid={isInvalid}
                                handleMarkChange={handleMarkChange}
                                handleKeyDown={handleKeyDown}
                              />
                            )
                          })}
                          <td className="px-5 py-3 text-right bg-slate-50/50 dark:bg-slate-900/30 border-l border-slate-200 dark:border-slate-700 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)] font-black text-slate-900 dark:text-slate-100 text-[13px]">
                            {rowTotal}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {/* Pagination Controls */}
              {students.length > PAGE_SIZE && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, students.length)}–{Math.min(currentPage * PAGE_SIZE, students.length)} of {students.length} students
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                    >
                      ← Prev
                    </button>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800">
                      Page {currentPage} / {Math.ceil(students.length / PAGE_SIZE)}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(students.length / PAGE_SIZE), p + 1))}
                      disabled={currentPage >= Math.ceil(students.length / PAGE_SIZE)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Empty state when no course/exam selected and grid not open */}
      {!showGrid && !loadingGrid && subQuestions.length === 0 && savedSessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 transition-colors duration-300">
          <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-6 shadow-sm">
            <Table2 size={36} className="text-indigo-500 dark:text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">No Marks Entered Yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center max-w-md leading-relaxed">
            Select a Course and Exam Blueprint above, then click <strong>Open Grid</strong> to begin entering marks.
          </p>
        </div>
      )}

      {/* Saved Sessions List */}
      {savedSessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Saved Mark Entries</h3>
          {savedSessions.map(session => (
            <div key={session.id} className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{session.courseName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{session.examName} &nbsp;·&nbsp; {session.studentCount} students &nbsp;·&nbsp; {session.entriesCount} marks saved</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block">{session.savedAt}</span>
                <button
                  onClick={() => {
                    setCourseSelected(session.courseId)
                    setExamSelected(session.examId)
                    setShowGrid(true)
                  }}
                  className="px-4 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700/50 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setSavedSessions(prev => prev.filter(s => s.id !== session.id))}
                  className="px-4 py-1.5 text-xs font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/30 rounded-xl hover:bg-rose-100 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
