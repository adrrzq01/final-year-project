import { useState } from 'react'
import { Plus, Trash2, Save, ChevronDown, FileText } from 'lucide-react'

const bloomLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']
const coOptions = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5']

const bloomColor = {
  Remember: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  Understand: 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300',
  Apply: 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300',
  Analyze: 'bg-violet-50 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300',
  Evaluate: 'bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300',
  Create: 'bg-rose-50 dark:bg-rose-900/40 text-rose-500 dark:text-rose-300',
}

export default function Exams() {
  const [questions, setQuestions] = useState([]) // start empty
  const [saved, setSaved] = useState(false)
  const [courseSelected, setCourseSelected] = useState('')
  const [examSelected, setExamSelected] = useState('')

  const update = (id, field, value) => {
    setSaved(false)
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)))
  }

  const toggleCO = (id, co) => {
    setSaved(false)
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q
        const cos = q.cos.includes(co) ? q.cos.filter((c) => c !== co) : [...q.cos, co]
        return { ...q, cos }
      })
    )
  }

  const addRow = () => {
    const nextId = questions.length > 0 ? Math.max(...questions.map((q) => q.id)) + 1 : 1
    setQuestions((prev) => [
      ...prev,
      { id: nextId, qNo: `Q${nextId}`, bloom: 'Apply', marks: 5, cos: ['CO1'] },
    ])
    setSaved(false)
  }

  const deleteRow = (id) => setQuestions((prev) => prev.filter((q) => q.id !== id))
  const totalMarks = questions.reduce((a, b) => a + Number(b.marks), 0)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Exam Blueprint</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Map each question to Course Outcomes and Bloom's Taxonomy</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={addRow}
            className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2.5 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 active:scale-95 transition-all"
          >
            <Plus size={15} /> Add Question
          </button>
          {questions.length > 0 && (
            <button
              onClick={() => setSaved(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
            >
              <Save size={15} /> {saved ? 'Saved ✓' : 'Save Blueprint'}
            </button>
          )}
        </div>
      </div>

      {/* Course + Exam selectors */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select
            value={courseSelected}
            onChange={(e) => setCourseSelected(e.target.value)}
            className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 pl-4 pr-8 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer transition-colors duration-300"
          >
            <option value="">— Select Course —</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={examSelected}
            onChange={(e) => setExamSelected(e.target.value)}
            className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 pl-4 pr-8 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer transition-colors duration-300"
          >
            <option value="">— Select Exam —</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        {questions.length > 0 && (
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl">
            Total Marks: <strong className="text-slate-800 dark:text-slate-200 ml-1">{totalMarks}</strong>
          </div>
        )}
      </div>

      {/* Empty state OR table */}
      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 transition-colors duration-300">
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-5">
            <FileText size={34} className="text-indigo-400 dark:text-indigo-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No questions yet</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 text-center max-w-sm">
            Click <strong className="text-indigo-600 dark:text-indigo-400">Add Question</strong> to start building your exam blueprint and map questions to COs.
          </p>
          <button
            onClick={addRow}
            className="mt-6 flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
          >
            <Plus size={16} /> Add First Question
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden transition-colors duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">#</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Question No.</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bloom's Level</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Marks</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mapped COs</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
                {questions.map((q, i) => (
                  <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors group">
                    <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 font-medium text-xs">{i + 1}</td>
                    <td className="px-5 py-3.5">
                      <input
                        value={q.qNo}
                        onChange={(e) => update(q.id, 'qNo', e.target.value)}
                        className="w-20 text-sm font-semibold text-slate-800 dark:text-slate-200 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-600 focus:border-indigo-400 focus:outline-none py-0.5"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="relative inline-block">
                        <select
                          value={q.bloom}
                          onChange={(e) => update(q.id, 'bloom', e.target.value)}
                          className={`appearance-none text-xs font-semibold px-3 py-1.5 rounded-lg pr-6 focus:outline-none cursor-pointer ${bloomColor[q.bloom]}`}
                        >
                          {bloomLevels.map((l) => <option key={l}>{l}</option>)}
                        </select>
                        <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <input
                        type="number"
                        min={1}
                        value={q.marks}
                        onChange={(e) => update(q.id, 'marks', Number(e.target.value))}
                        className="w-14 text-sm font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {coOptions.map((co) => (
                          <button
                            key={co}
                            onClick={() => toggleCO(q.id, co)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                              q.cos.includes(co)
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600 hover:border-indigo-300 hover:text-indigo-500'
                            }`}
                          >
                            {co}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => deleteRow(q.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 dark:text-slate-600 hover:text-rose-400 transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700">
                  <td colSpan={3} className="px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</td>
                  <td className="px-5 py-3.5 text-sm font-extrabold text-slate-900 dark:text-slate-100">{totalMarks}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
