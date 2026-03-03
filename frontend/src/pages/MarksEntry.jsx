import { useState } from 'react'
import { ChevronDown, Save, RotateCcw, Download, Table2 } from 'lucide-react'

export default function MarksEntry() {
  const [students] = useState([]) // will be populated from backend
  const [courseSelected, setCourseSelected] = useState('')
  const [examSelected, setExamSelected] = useState('')

  return (
    <div className="space-y-5 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Marks Entry</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Enter and edit student marks directly in the grid</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all">
            <RotateCcw size={14} /> Reset
          </button>
          <button className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all">
            <Download size={14} /> Export
          </button>
          <button className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/30">
            <Save size={14} /> Save Marks
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="flex items-center flex-wrap gap-3">
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
      </div>

      {/* Empty State */}
      {students.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 transition-colors duration-300">
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-5">
            <Table2 size={34} className="text-indigo-400 dark:text-indigo-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No student data</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 text-center max-w-sm">
            Select a course and exam above, or upload a student list from the <strong className="text-indigo-600 dark:text-indigo-400">Upload Data</strong> page to begin entering marks.
          </p>
        </div>
      )}
    </div>
  )
}
