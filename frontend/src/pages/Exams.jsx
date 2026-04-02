import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Save, ChevronDown, FileText } from 'lucide-react'
import axios from 'axios'
import { useAlert } from '../context/AlertContext'

const bloomLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']
const coOptions = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6']

const bloomColor = {
  Remember: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  Understand: 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300',
  Apply: 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300',
  Analyze: 'bg-violet-50 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300',
  Evaluate: 'bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300',
  Create: 'bg-rose-50 dark:bg-rose-900/40 text-rose-500 dark:text-rose-300',
}

const allExams = [
  { name: 'ISA-1(T)', label: 'ISA-1 (Theory)', target: 15, isTheory: true },
  { name: 'ISA-1(P)', label: 'ISA-1 (Practical)', target: 15, isPractical: true },
  { name: 'ISA-2', label: 'ISA-2', target: 15, isTheory: true },
  { name: 'ISA-3', label: 'ISA-3', target: 15, isTheory: true },
  { name: 'SEE(T)', label: 'SEE (Theory)', target: 85, isTheory: true },
  { name: 'SEE(P)', label: 'SEE (Practical)', target: 85, isPractical: true }
]

const hindiVowels = ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ']
const hindiConsonants = ['क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज', 'झ', 'ञ', 'ट', 'ठ', 'ड', 'ढ', 'ण', 'त', 'थ', 'द', 'ध', 'न', 'प', 'फ', 'ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'श', 'ष', 'स', 'ह']

export default function Exams() {
  const [courses, setCourses] = useState([])
  const [questions, setQuestions] = useState([]) // start empty
  const [examType, setExamType] = useState('ISA-1(T)')
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [courseSelected, setCourseSelected] = useState('')
  const [existingExams, setExistingExams] = useState([])
  const [customTarget, setCustomTarget] = useState('')
  const { showAlert, showConfirm } = useAlert()

  const activeCourseObj = courses.find((c) => c.id === courseSelected)
  const isLangCourse = activeCourseObj && (activeCourseObj.name.toLowerCase().includes('hindi') || activeCourseObj.name.toLowerCase().includes('konkani'))

  let availableExams = []
  if (!activeCourseObj) {
    availableExams = allExams.filter(e => e.isTheory)
  } else {
    availableExams = allExams.filter(e => {
      if (e.isTheory && activeCourseObj.theoryCredits > 0) return true
      if (e.isPractical && activeCourseObj.practicalCredits > 0) return true
      return false
    })
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/courses')
      setCourses(res.data)
      if (res.data.length > 0) setCourseSelected(res.data[0].id)
    } catch (err) {
      console.error('Failed to fetch courses:', err)
    }
  }

  useEffect(() => {
    if (!courseSelected) return
    const fetchExisting = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        const res = await axios.get(`http://localhost:5000/api/courses/${courseSelected}/enrollments-exams`, config)
        setExistingExams(res.data.exams || [])
      } catch (e) {
        console.error('Failed to fetch existing exams:', e)
      }
    }
    fetchExisting()
  }, [courseSelected, saved])

  const handleDeleteExam = async (id) => {
    const ok = await showConfirm("Are you sure you want to permanently delete this exam blueprint? This will also wipe any student marks associated with it.")
    if (!ok) return
    
    // OPTIMISTIC UPDATE: Instantly remove it from the User's screen
    setExistingExams(prev => prev.filter(ex => ex.id !== id))
    
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      // Issue background deletion without freezing UI
      axios.delete(`http://localhost:5000/api/exams/${id}`, config).catch(err => {
         throw err
      })
      showAlert("Exam deleted successfully.", "success")
    } catch(err) {
      setSaved(prev => !prev) // Trigger refetch to restore state if deletion failed
      showAlert("Failed to delete exam", "error")
    }
  }

  const updateMainQNo = (id, value) => {
    setSaved(false)
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, qNo: value } : q)))
  }

  const updateSubQ = (qId, subId, field, value) => {
    setSaved(false)
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q
        return {
          ...q,
          subQuestions: q.subQuestions.map((sq) =>
            sq.id === subId ? { ...sq, [field]: value } : sq
          ),
        }
      })
    )
  }

  const toggleCO = (qId, subId, co) => {
    setSaved(false)
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q
        return {
          ...q,
          subQuestions: q.subQuestions.map((sq) => {
            if (sq.id !== subId) return sq
            const cos = sq.cos.includes(co) ? sq.cos.filter((c) => c !== co) : [...sq.cos, co]
            return { ...sq, cos }
          }),
        }
      })
    )
  }

  const addMainQuestion = () => {
    const nextId = questions.length > 0 ? Math.max(...questions.map((q) => q.id)) + 1 : 1
    const defaultQNo = isLangCourse 
      ? `प्रश्न ${hindiVowels[(nextId - 1) % hindiVowels.length]}` 
      : `Q${nextId}`
    
    setQuestions((prev) => [
      ...prev,
      { id: nextId, qNo: defaultQNo, subQuestions: [] },
    ])
    setSaved(false)
  }

  const addSubQuestion = (qId) => {
    setSaved(false)
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q
        const nextSubId =
          q.subQuestions.length > 0 ? Math.max(...q.subQuestions.map((sq) => sq.id)) + 1 : 1
        const char = isLangCourse
          ? hindiConsonants[q.subQuestions.length % hindiConsonants.length]
          : String.fromCharCode(96 + (q.subQuestions.length + 1)) // 'a', 'b', 'c'
        return {
          ...q,
          subQuestions: [
            ...q.subQuestions,
            { id: nextSubId, qNo: char, bloom: 'Apply', marks: 5, cos: ['CO1'] },
          ],
        }
      })
    )
  }

  const deleteMainQuestion = (id) => {
    setSaved(false)
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const deleteSubQuestion = (qId, subId) => {
    setSaved(false)
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q
        return { ...q, subQuestions: q.subQuestions.filter((sq) => sq.id !== subId) }
      })
    )
  }

  const totalMarks = questions.reduce((acc, q) => {
    return acc + q.subQuestions.reduce((sum, sq) => sum + Number(sq.marks || 0), 0)
  }, 0)

  const defaultTarget = availableExams.find(t => t.name === examType)?.target || 15
  const currentTarget = customTarget !== '' ? Number(customTarget) : defaultTarget
  const isMarksValid = totalMarks === currentTarget

  const handleSaveBlueprint = async () => {
    if (!courseSelected) return showAlert('Select a course first', 'warning')
    if (questions.length === 0) return showAlert('Add at least one question', 'warning')
    if (!isMarksValid) return showAlert(`Total marks must be exactly ${currentTarget} for ${examType}. Currently at ${totalMarks}.`, 'error')
    
    setIsSaving(true)
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      await axios.post('http://localhost:5000/api/exams/blueprint', {
        name: examType,
        courseId: courseSelected,
        totalMarks: totalMarks,
        questions: questions
      }, config)
      setSaved(true)
      setQuestions([])
      setCustomTarget('')
      showAlert('Blueprint securely saved!', 'success')
    } catch (err) {
      console.error(err)
      showAlert(err.response?.data?.error || 'Failed to save blueprint', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Exam Blueprint</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Map Sub-Questions to Course Outcomes and Bloom's Taxonomy</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={addMainQuestion}
            className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2.5 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 active:scale-95 transition-all"
          >
            <Plus size={15} /> Add Main Question
          </button>
          {questions.length > 0 && (
            <button
              onClick={handleSaveBlueprint}
              disabled={isSaving || !isMarksValid}
              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md ${
                !isMarksValid 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 shadow-none'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-indigo-200 dark:shadow-indigo-900/30 disabled:opacity-70'
              }`}
            >
              <Save size={15} /> {isSaving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Blueprint'}
            </button>
          )}
        </div>
      </div>

      {/* Course + Exam selectors */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select
            value={courseSelected}
            onChange={(e) => {
              setCourseSelected(e.target.value)
              setSaved(false)
            }}
            className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 pl-4 pr-8 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer transition-colors duration-300"
          >
            <option value="" disabled>Select Course</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        
        <div className="relative">
          <select 
            value={examType}
            onChange={e => {
              setExamType(e.target.value)
              setSaved(false)
            }}
            className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 pl-4 pr-8 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer min-w-40 transition-colors duration-300"
          >
            {availableExams.map(type => (
              <option key={type.name} value={type.name}>{type.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {questions.length > 0 && (
          <div className={`ml-auto flex items-center gap-2 text-xs font-bold border px-3 py-2 rounded-xl transition-colors ${
            isMarksValid 
              ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400'
          }`}>
            Total Marks: <span className="text-sm ml-1 flex items-center">{totalMarks} / 
               <input 
                  type="number"
                  step="0.5"
                  placeholder={currentTarget}
                  value={customTarget !== '' ? customTarget : currentTarget}
                  onChange={(e) => setCustomTarget(e.target.value)}
                  className="w-12 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-center py-0.5 ml-2 font-black shadow-inner focus:outline-none focus:ring-1 focus:ring-indigo-500"
               />
            </span>
          </div>
        )}
      </div>

      {/* Placeholder to retain logical layout spacing */}

      {/* Empty state OR table */}
      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 transition-colors duration-300">
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-5">
            <FileText size={34} className="text-indigo-400 dark:text-indigo-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No questions yet</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 text-center max-w-sm">
            Click <strong className="text-indigo-600 dark:text-indigo-400">Add Main Question</strong> to start building your hierarchical exam blueprint.
          </p>
          <button
            onClick={addMainQuestion}
            className="mt-6 flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
          >
            <Plus size={16} /> Add First Main Question
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden transition-colors duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-12">#</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Question / Sub-Q</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bloom's Level</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Marks</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mapped COs</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {questions.map((q, i) => (
                  <React.Fragment key={q.id}>
                    {/* Main Question Row */}
                    <tr key={`main-${q.id}`} className="bg-slate-50/50 dark:bg-slate-800/40 group border-t-2 border-slate-200 dark:border-slate-700/80">
                      <td className="px-5 py-3 text-slate-400 dark:text-slate-500 font-bold text-xs">{i + 1}</td>
                      <td className="px-5 py-3">
                        <input
                          value={q.qNo}
                          onChange={(e) => updateMainQNo(q.id, e.target.value)}
                          className="w-24 text-sm font-bold text-slate-800 dark:text-slate-200 bg-transparent border-b-2 border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:outline-none py-0.5"
                        />
                      </td>
                      {/* Blank cells for Main Q since only Sub-Qs have CO and Marks */}
                      <td colSpan={3} className="px-5 py-3">
                        <button
                          onClick={() => addSubQuestion(q.id)}
                          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                        >
                          <Plus size={14} /> Add Sub-Question
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => deleteMainQuestion(q.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-300 dark:text-slate-600 hover:text-rose-400 transition-all text-xs flex items-center gap-1 font-semibold"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </td>
                    </tr>

                    {/* Sub-Questions Rows */}
                    {q.subQuestions.map((sq, si) => (
                      <tr key={`sub-${q.id}-${sq.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors group">
                        <td className="px-5 py-3"></td>
                        <td className="px-5 py-3 pl-8 relative">
                          {/* Visual hierarchy tree line */}
                          <div className="absolute left-4 top-0 bottom-1/2 border-l-2 border-b-2 border-slate-200 dark:border-slate-600 w-3 rounded-bl-md"></div>
                          <div className="absolute left-4 top-1/2 bottom-0 border-l-2 border-slate-200 dark:border-slate-600"></div>

                          <div className="flex items-center gap-2 relative z-10 bg-white dark:bg-slate-800 pl-1">
                            <span className="text-xs font-semibold text-slate-400">{q.qNo}</span>
                            <input
                              value={sq.qNo}
                              onChange={(e) => updateSubQ(q.id, sq.id, 'qNo', e.target.value)}
                              className="w-12 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 focus:outline-none px-1.5 py-0.5 text-center"
                            />
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="relative inline-block w-full max-w-[130px]">
                            <select
                              value={sq.bloom}
                              onChange={(e) => updateSubQ(q.id, sq.id, 'bloom', e.target.value)}
                              className={`appearance-none text-xs w-full font-semibold px-3 py-1.5 rounded-lg pr-6 focus:outline-none cursor-pointer ${bloomColor[sq.bloom]}`}
                            >
                              {bloomLevels.map((l) => <option key={l} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">{l}</option>)}
                            </select>
                            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="number"
                            min={0.5}
                            step="0.5"
                            value={sq.marks}
                            onChange={(e) => updateSubQ(q.id, sq.id, 'marks', Number(e.target.value))}
                            className="w-14 text-sm font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {coOptions.map((co) => (
                              <button
                                key={co}
                                onClick={() => toggleCO(q.id, sq.id, co)}
                                className={`text-[10px] font-bold px-2 py-1 rounded border transition-all ${
                                  sq.cos.includes(co)
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600 hover:border-indigo-300 hover:text-indigo-500'
                                }`}
                              >
                                {co}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => deleteSubQuestion(q.id, sq.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 dark:text-slate-600 hover:text-rose-400 transition-all"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/60 p-4">
             <button
               onClick={addMainQuestion}
               className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 active:scale-95 transition-all"
             >
               <Plus size={15} /> Add Another Main Question
             </button>
          </div>
        </div>
      )}

      {/* Existing Exams Table */}
      {existingExams.length > 0 && (
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm mt-8 transition-all">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <FileText size={18} className="text-indigo-500" /> Created Blueprints
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700/60">
                <tr>
                  <th className="px-4 py-3 rounded-tl-xl">Subject</th>
                  <th className="px-4 py-3">Exam Type</th>
                  <th className="px-4 py-3">Total Marks</th>
                  <th className="px-4 py-3">Questions</th>
                  <th className="px-4 py-3 rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {existingExams.map(ex => (
                  <tr key={ex.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {activeCourseObj?.code} - {activeCourseObj?.name}
                    </td>
                    <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">
                      {ex.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-1 rounded text-xs font-bold">
                        {ex.totalMarks} Marks
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {ex.questions?.length || 0} Main Qs
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setExamType(ex.name)
                            setCustomTarget(ex.totalMarks.toString())
                            if (ex.questions) {
                              const restored = ex.questions.map((q, i) => ({
                                id: q.id || (i+1),
                                qNo: q.qNumber,
                                subQuestions: (q.subQuestions || []).map((sq, sqId) => ({
                                  id: sq.id || (sqId+1),
                                  qNo: sq.qNumber,
                                  bloom: 'Apply', // Not stored in schema currently
                                  marks: sq.maxMarks,
                                  cos: sq.courseOutcome ? [`CO${sq.courseOutcome.coNumber.replace('CO', '')}`] : []
                                }))
                              }))
                              setQuestions(restored)
                            }
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-400 dark:hover:bg-indigo-900/60 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                        >
                          View / Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteExam(ex.id)}
                          className="bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-900/60 p-1.5 rounded-lg transition-all focus:outline-none"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
