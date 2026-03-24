import { useState, useEffect, useRef, Fragment } from 'react'
import { ChevronDown, Save, RotateCcw, Download, Table2 } from 'lucide-react'
import axios from 'axios'
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

export default function MarksEntry() {
  const { showAlert, showConfirm } = useAlert()
  const [courses, setCourses] = useState([])
  const [courseSelected, setCourseSelected] = useState('')
  
  const [exams, setExams] = useState([])
  const [examSelected, setExamSelected] = useState('')
  
  const [students, setStudents] = useState([])
  const [subQuestions, setSubQuestions] = useState([])
  
  // Matrix state: { "studentId-subQuestionId": obtainedMarks }
  const [marksData, setMarksData] = useState({})
  
  const [isSaving, setIsSaving] = useState(false)
  const [loadingGrid, setLoadingGrid] = useState(false)

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
    
    // Transform dict to array mapping
    const payload = Object.entries(marksData).map(([key, obtainedMarks]) => {
      const [studentId, questionId] = key.split('_')
      return {
        studentId,
        questionId,
        obtainedMarks: Number(obtainedMarks)
      }
    })

    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      await axios.post('http://localhost:5000/api/marks', { marks: payload }, config)
      showAlert('Marks successfully bulk upserted to the database!', 'success')
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
        <div className="flex items-center gap-3">
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
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 p-5 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
        <div className="relative w-full sm:w-auto min-w-[240px]">
          <select
            value={courseSelected}
            onChange={(e) => setCourseSelected(e.target.value)}
            className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 pl-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer transition-colors duration-300"
          >
            <option value="">— Select Target Course —</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative w-full sm:w-auto min-w-[240px]">
          <select
            value={examSelected}
            onChange={(e) => setExamSelected(e.target.value)}
            disabled={!courseSelected || exams.length === 0}
            className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 pl-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer transition-colors duration-300 disabled:opacity-50"
          >
            <option value="">— Extract Exam Blueprint —</option>
            {exams.map(e => (
              <option key={e.id} value={e.id}>{e.name} (Max {e.totalMarks})</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        
        {subQuestions.length > 0 && (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800">
              {students.length} Students
            </span>
            <span className="text-xs font-bold bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800">
              {subQuestions.length} Questions
            </span>
          </div>
        )}
      </div>

      {loadingGrid && (
        <div className="py-20 flex justify-center text-indigo-500 animate-pulse font-semibold">
          Synchronizing Academic Registries...
        </div>
      )}

      {!loadingGrid && (students.length === 0 || subQuestions.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 transition-colors duration-300">
          <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-6 shadow-sm">
            <Table2 size={36} className="text-indigo-500 dark:text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Grid Uninitialized</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center max-w-md leading-relaxed">
            Ensure you have completely mapped the <strong>Exam Blueprint</strong> and verified that the <strong>Student Roster</strong> is populated for your department.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors duration-300">
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
                {students.map((student, sIdx) => {
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
        </div>
      )}
    </div>
  )
}
