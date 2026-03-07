import { useState, useEffect } from 'react'
import { ChevronDown, Save, RotateCcw, Download, Table2 } from 'lucide-react'
import axios from 'axios'

export default function MarksEntry() {
  const [courses, setCourses] = useState([])
  const [courseSelected, setCourseSelected] = useState('')
  
  const [exams, setExams] = useState([])
  const [examSelected, setExamSelected] = useState('')
  
  const [students, setStudents] = useState([])
  const [subQuestions, setSubQuestions] = useState([])
  
  // Matrix state: { "studentId-subQuestionId": obtainedMarks }
  const [marksData, setMarksData] = useState({})
  
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingGrid, setIsLoadingGrid] = useState(false)

  // 1. Fetch Courses on Mount
  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/courses')
      setCourses(res.data)
    } catch (err) {
      console.error('Failed to fetch courses:', err)
    }
  }

  // 2. Fetch Exams and Students when a Course is selected
  useEffect(() => {
    if (!courseSelected) {
      setExams([])
      setExamSelected('')
      setStudents([])
      setSubQuestions([])
      return
    }

    const fetchCourseData = async () => {
      try {
        // Fetch Exams for this specific course
        const examRes = await axios.get(`http://localhost:5000/api/exams?courseId=${courseSelected}`)
        setExams(examRes.data)
        
        // Fetch the Academic Class details connected to this course to get the Students
        const courseObj = courses.find(c => c.id === courseSelected)
        if (courseObj?.academicClassId) {
          // We need a route or we can just fetch students by academicClassId.
          // For now, let's assume we build a new /api/students endpoint or we fetch via classes.
          const stuRes = await axios.get(`http://localhost:5000/api/students?classId=${courseObj.academicClassId}`)
          setStudents(stuRes.data)
        }
      } catch (err) {
        console.error('Error fetching exams or students', err)
      }
    }

    fetchCourseData()
  }, [courseSelected, courses])

  // 3. Build the X-Axis (SubQuestions) when an Exam is selected
  useEffect(() => {
    if (!examSelected) {
      setSubQuestions([])
      return
    }

    const exam = exams.find(e => e.id === examSelected)
    if (exam && exam.questions) {
      // Flatten out the subQuestions from all main questions into a single array for the X-axis columns
      let subs = []
      exam.questions.forEach(mainQ => {
        mainQ.subQuestions.forEach(sq => {
          subs.push({
            id: sq.id,
            label: `${mainQ.qNumber}${sq.qNumber}`, // e.g. "Q1a"
            maxMarks: sq.maxMarks
          })
        })
      })
      setSubQuestions(subs)
    }
  }, [examSelected, exams])

  // Handlers
  const handleMarkChange = (studentId, subQId, value) => {
    setMarksData(prev => ({
      ...prev,
      [`${studentId}-${subQId}`]: value
    }))
  }

  const handleSaveMarks = async () => {
    if (Object.keys(marksData).length === 0) return alert('No marks entered.')
    
    setIsSaving(true)
    
    // Transform flat dictionary into array of objects for the backend
    const payload = Object.entries(marksData).map(([key, obtainedMarks]) => {
      const [studentId, questionId] = key.split('-')
      return {
        studentId,
        questionId,
        obtainedMarks: Number(obtainedMarks)
      }
    })

    try {
      await axios.post('http://localhost:5000/api/marks', { marks: payload })
      alert('Marks saved successfully!')
    } catch (err) {
      console.error(err)
      alert('Failed to save marks')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to clear all currently entered marks on this screen?')) {
      setMarksData({})
    }
  }


  return (
    <div className="space-y-5 max-w-full pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Marks Entry</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Enter and edit student marks directly in the grid</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={handleReset} className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all">
            <RotateCcw size={14} /> Reset
          </button>
          <button className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all">
            <Download size={14} /> Export
          </button>
          <button 
            onClick={handleSaveMarks}
            disabled={isSaving || subQuestions.length === 0}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 active:scale-95 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
          >
            <Save size={14} /> {isSaving ? 'Saving...' : 'Save Marks'}
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="flex items-center flex-wrap gap-3 p-4 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
        <div className="relative">
          <select
            value={courseSelected}
            onChange={(e) => setCourseSelected(e.target.value)}
            className="appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 pl-4 pr-10 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer transition-colors duration-300 min-w-[200px]"
          >
            <option value="">— Select Course —</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={examSelected}
            onChange={(e) => setExamSelected(e.target.value)}
            disabled={!courseSelected || exams.length === 0}
            className="appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 pl-4 pr-10 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer transition-colors duration-300 disabled:opacity-50 min-w-[200px]"
          >
            <option value="">— Select Exam —</option>
            {exams.map(e => (
              <option key={e.id} value={e.id}>{e.name} (Max {e.totalMarks})</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        
        {subQuestions.length > 0 && (
          <div className="ml-auto text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800">
            {subQuestions.length} Questions Loaded
          </div>
        )}
      </div>

      {/* Grid or Empty State */}
      {students.length === 0 || subQuestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 transition-colors duration-300">
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-5">
            <Table2 size={34} className="text-indigo-400 dark:text-indigo-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Assessment Data Ready</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 text-center max-w-md">
            To view the entry grid, please ensure you have selected a <strong>Course</strong> that has enrolled students, and an <strong>Exam</strong> that has a configured blueprint.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden transition-colors duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
                  <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 text-left px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[200px] border-r border-slate-200 dark:border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    Student Information
                  </th>
                  {subQuestions.map(sq => (
                    <th key={sq.id} className="text-center px-3 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700/50 min-w-[70px]">
                      <div className="text-lg text-slate-800 dark:text-slate-100">{sq.label}</div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">Max: {sq.maxMarks}</div>
                    </th>
                  ))}
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right bg-slate-50 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {students.map((student, i) => {
                  // Calculate local row total physically present in the state right now
                  const rowTotal = subQuestions.reduce((sum, sq) => {
                    return sum + Number(marksData[`${student.id}-${sq.id}`] || 0)
                  }, 0)

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-800 group-hover:bg-slate-50/50 dark:group-hover:bg-slate-800/40 px-5 py-3 border-r border-slate-200 dark:border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{student.rollNo}</div>
                        <div className="text-xs text-slate-500 font-medium truncate w-[180px]" title={student.name}>{student.name}</div>
                      </td>
                      
                      {subQuestions.map(sq => (
                        <td key={sq.id} className="px-2 py-2 text-center border-r border-slate-100 dark:border-slate-700/30">
                          <input
                            type="number"
                            min="0"
                            max={sq.maxMarks}
                            step="0.5"
                            value={marksData[`${student.id}-${sq.id}`] || ''}
                            onChange={(e) => handleMarkChange(student.id, sq.id, e.target.value)}
                            className="w-16 text-center text-sm font-semibold text-slate-800 dark:text-slate-200 bg-transparent border-b-2 border-transparent focus:border-indigo-500 focus:bg-indigo-50 dark:focus:bg-indigo-900/20 focus:outline-none transition-all py-1 placeholder-slate-300 dark:placeholder-slate-600"
                            placeholder="-"
                          />
                        </td>
                      ))}

                      <td className="px-5 py-3 text-right bg-slate-50/50 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-700 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] font-bold text-slate-800 dark:text-slate-200">
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
