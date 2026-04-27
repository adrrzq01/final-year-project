import { useState, useEffect } from 'react'
import { X, Save, BookOpen, Plus, Trash2 } from 'lucide-react'
import axios from 'axios'

export default function AddCourseModal({ isOpen, onClose, onCourseAdded }) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'Major',
    department: '',
    semester: 1,
    theoryCredits: 3,
    practicalCredits: 1,
    academicClassId: ''
  })
  
  // Default to 4 empty COs
  const [courseOutcomes, setCourseOutcomes] = useState([
    { coNumber: 'CO1', description: '', targetPct: 75 },
    { coNumber: 'CO2', description: '', targetPct: 75 },
    { coNumber: 'CO3', description: '', targetPct: 75 },
    { coNumber: 'CO4', description: '', targetPct: 75 },
  ])
  
  const [academicClasses, setAcademicClasses] = useState([])
  const [selectedClassName, setSelectedClassName] = useState('')
  const [selectedDivName, setSelectedDivName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const uniqueClassNames = [...new Set(academicClasses.map(c => c.name))]
    .filter(name => !formData.department || name.endsWith(formData.department))
    .sort()
  const uniqueDivs = [...new Set(academicClasses.filter(c => c.name === selectedClassName).map(c => c.division))].filter(Boolean).sort()

  useEffect(() => {
    const found = academicClasses.find(c => c.name === selectedClassName && c.division === selectedDivName)
    if (found) {
      setFormData(prev => ({ ...prev, academicClassId: found.id }))
    }
  }, [selectedClassName, selectedDivName, academicClasses])

  useEffect(() => {
    if (isOpen) {
      fetchClasses()
    }
  }, [isOpen])

  const fetchClasses = async () => {
    try {
      const currentToken = localStorage.getItem('token')
      const config = { headers: { Authorization: `Bearer ${currentToken}` } }
      const res = await axios.get('http://localhost:5000/api/academic-classes', config)
      setAcademicClasses(res.data)
      if (res.data.length > 0) {
        setFormData(prev => ({...prev, academicClassId: res.data[0].id}))
      }
    } catch (err) {
      console.error('Failed to fetch academic classes:', err)
    }
  }

  const filteredClasses = academicClasses.filter(ac => ac.name.endsWith(formData.department))

  useEffect(() => {
    if (filteredClasses.length > 0 && !filteredClasses.find(c => c.id === formData.academicClassId)) {
      setFormData(prev => ({ ...prev, academicClassId: filteredClasses[0].id }))
    }
  }, [formData.department, academicClasses])

  if (!isOpen) return null

  const addCO = () => {
    if (courseOutcomes.length >= 6) return
    const nextCO = `CO${courseOutcomes.length + 1}`
    setCourseOutcomes([...courseOutcomes, { coNumber: nextCO, description: '', targetPct: 75 }])
  }

  const removeCO = (index) => {
    if (courseOutcomes.length <= 4) return
    const newCOs = courseOutcomes.filter((_, i) => i !== index)
    // Renumber COs sequentially after removal to maintain CO1, CO2...
    const renumberedCOs = newCOs.map((co, i) => ({ ...co, coNumber: `CO${i + 1}` }))
    setCourseOutcomes(renumberedCOs)
  }

  const handleCOChange = (index, field, value) => {
    const updated = [...courseOutcomes]
    updated[index][field] = value
    setCourseOutcomes(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.academicClassId) {
      setError('Please select an Academic Class. If none exist, create one in the database first.')
      setLoading(false)
      return
    }

    if (courseOutcomes.some(co => !co.description.trim())) {
      setError('All Course Outcomes must have a description.')
      setLoading(false)
      return
    }

    try {
      const payload = {
        ...formData,
        courseOutcomes
      }
      const currentToken = localStorage.getItem('token')
      const config = { headers: { Authorization: `Bearer ${currentToken}` } }
      const res = await axios.post('http://localhost:5000/api/courses', payload, config)
      onCourseAdded(res.data)
      
      // Reset form on success
      setFormData({ code: '', name: '', category: 'Major', department: 'BCA', semester: 1, theoryCredits: 3, practicalCredits: 1, academicClassId: academicClasses[0]?.id || '' })
      setCourseOutcomes([
        { coNumber: 'CO1', description: '', targetPct: 75 },
        { coNumber: 'CO2', description: '', targetPct: 75 },
        { coNumber: 'CO3', description: '', targetPct: 75 },
        { coNumber: 'CO4', description: '', targetPct: 75 },
      ])
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add course')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <BookOpen size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-none">Add New Course</h3>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-semibold">With Outcomes (COs)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm font-semibold text-rose-600 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Section 1: Course Info */}
          <div>
            <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3 border-b border-indigo-100 dark:border-indigo-900 pb-2">Course Details</h4>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Academic Class (Batch)</label>
                    <select
                      required
                      value={selectedClassName}
                      disabled={!formData.department}
                      onChange={e => {
                        setSelectedClassName(e.target.value)
                        setSelectedDivName('')
                      }}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-slate-100 transition-all font-semibold disabled:opacity-50"
                    >
                      <option value="">— Select Class —</option>
                      {uniqueClassNames.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Division</label>
                    <select
                      required
                      value={selectedDivName}
                      disabled={!selectedClassName}
                      onChange={e => setSelectedDivName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-slate-100 transition-all font-semibold disabled:opacity-50"
                    >
                      <option value="">— Select Division —</option>
                      {uniqueDivs.map(div => (
                        <option key={div} value={div}>Division {div}</option>
                      ))}
                    </select>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-1 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Category</label>
                  <select 
                    required
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-slate-100 transition-all font-semibold"
                  >
                    <option value="Major">Major</option>
                    <option value="Minor">Minor</option>
                    <option value="MC">MC</option>
                    <option value="AEC">AEC</option>
                    <option value="SEC">SEC</option>
                    <option value="VAC">VAC</option>
                  </select>
                </div>
                <div className="col-span-1 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Code</label>
                  <input 
                    required
                    placeholder="CS401"
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-slate-100 transition-all font-mono"
                  />
                </div>
                <div className="col-span-3 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Course Name</label>
                  <input 
                    required
                    placeholder="Data Structures"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-slate-100 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Theory Credits</label>
                  <input 
                    type="number" min="0" required
                    value={formData.theoryCredits}
                    onChange={e => setFormData({...formData, theoryCredits: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-slate-100 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Practical Credits</label>
                  <input 
                    type="number" min="0" required
                    value={formData.practicalCredits}
                    onChange={e => setFormData({...formData, practicalCredits: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-slate-100 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Department</label>
                  <select 
                    required
                    value={formData.department}
                    onChange={e => {
                      setFormData({...formData, department: e.target.value})
                      setSelectedClassName('')
                      setSelectedDivName('')
                    }}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-slate-100 transition-all"
                  >
                    <option value="">— Select Dept —</option>
                    <option value="BCA">BCA</option>
                    <option value="BCOM">BCOM</option>
                    <option value="BA">BA</option>
                    <option value="BBA">BBA</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Semester</label>
                  <select 
                    required
                    value={formData.semester}
                    onChange={e => setFormData({...formData, semester: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-slate-100 transition-all"
                  >
                    {[1,2,3,4,5,6].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Course Outcomes */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3 border-b border-indigo-100 dark:border-indigo-900 pb-2">
              <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Course Outcomes (4 to 6)</h4>
              <button
                type="button"
                onClick={addCO}
                disabled={courseOutcomes.length >= 6}
                className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-800 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <Plus size={12} /> Add CO
              </button>
            </div>
            
            <div className="space-y-3">
              {courseOutcomes.map((co, index) => (
                <div key={index} className="flex gap-3 items-start group">
                  <div className="w-14 shrink-0 px-3 py-2 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                    {co.coNumber}
                  </div>
                  <input
                    required
                    placeholder="Enter outcome description..."
                    value={co.description}
                    onChange={(e) => handleCOChange(index, 'description', e.target.value)}
                    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-slate-100 transition-all"
                  />
                  <div className="w-24 shrink-0 relative">
                    <input
                      type="number" min="1" max="100" required
                      value={co.targetPct}
                      onChange={(e) => handleCOChange(index, 'targetPct', e.target.value)}
                      className="w-full pl-3 pr-6 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-slate-100 transition-all text-center"
                      title="Target %"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCO(index)}
                    disabled={courseOutcomes.length <= 4}
                    className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors disabled:opacity-30 disabled:hover:text-slate-300 disabled:hover:bg-transparent"
                    title={courseOutcomes.length <= 4 ? "Minimum 4 COs required" : "Remove CO"}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="shrink-0 pt-4 pb-4 px-6 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Exactly <strong className="text-slate-700 dark:text-slate-300">{courseOutcomes.length}</strong> COs actively defined.
          </p>
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-70 active:scale-95 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
            >
                {loading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <Save size={16} />
                )}
              {loading ? 'Creating...' : 'Create Course & COs'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
