import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, Save, Loader2, Link } from 'lucide-react'
import axios from 'axios'

export default function POMapping() {
  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [courseOutcomes, setCourseOutcomes] = useState([])
  const [programOutcomes, setProgramOutcomes] = useState([])
  const [programSpecificOutcomes, setProgramSpecificOutcomes] = useState([])
  
  // Matrix format: mappings['co_id']['po_id'] = correlationLevel
  const [mappings, setMappings] = useState({})
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  // Initial Data Load
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [courseRes, poRes] = await Promise.all([
          axios.get('http://localhost:5000/api/courses'),
          axios.get('http://localhost:5000/api/pos')
        ])
        setCourses(courseRes.data)
        setProgramOutcomes(poRes.data.pos)
        setProgramSpecificOutcomes(poRes.data.psos)
      } catch (err) {
        console.error(err)
        setMessage({ text: 'Failed to load initial data. Check server connection.', type: 'error' })
      } finally {
        setLoading(false)
      }
    }
    fetchInitialData()
  }, [])

  // Fetch COs and existing logical PO Mappings when Course Changes
  useEffect(() => {
    if (!selectedCourseId) {
      setCourseOutcomes([])
      setMappings({})
      return
    }

    const fetchMappings = async () => {
      setLoading(true)
      try {
        const res = await axios.get(`http://localhost:5000/api/mappings/${selectedCourseId}`)
        setCourseOutcomes(res.data)
        
        // Rebuild existing database mappings into local state Matrix
        const matrix = {}
        res.data.forEach(co => {
          matrix[co.id] = {}
          co.coPoMappings.forEach(mapping => {
            matrix[co.id][mapping.programOutcomeId] = mapping.correlationLevel
          })
        })
        setMappings(matrix)
        setMessage({ text: '', type: '' }) // Clear previous messages
      } catch (err) {
        console.error(err)
        setMessage({ text: 'Failed to load Course Outcomes and Mappings.', type: 'error' })
      } finally {
        setLoading(false)
      }
    }

    fetchMappings()
  }, [selectedCourseId])

  const handleCellChange = (coId, poId, value) => {
    const parsedValue = parseInt(value, 10)
    setMappings(prev => ({
      ...prev,
      [coId]: {
        ...prev[coId],
        [poId]: isNaN(parsedValue) || parsedValue === 0 ? undefined : parsedValue
      }
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage({ text: '', type: '' })
    
    // Flatten 2D dictionary into 1D array for backend expected shape
    const flattenedMappings = []
    
    Object.keys(mappings).forEach(coId => {
      Object.keys(mappings[coId]).forEach(poId => {
        const level = mappings[coId][poId]
        if (level && level > 0 && level <= 3) {
          flattenedMappings.push({
            courseOutcomeId: coId,
            programOutcomeId: poId,
            correlationLevel: level
          })
        }
      })
    })

    if (flattenedMappings.length === 0) {
      setMessage({ text: 'No mappings defined. Please enter correlation levels (1-3) into the grid.', type: 'error' })
      setSaving(false)
      return
    }

    try {
      await axios.post('http://localhost:5000/api/mappings', { mappings: flattenedMappings })
      setMessage({ text: 'Mappings successfully explicitly saved to database!', type: 'success' })
      
      // Auto-hide success message after 4s
      setTimeout(() => setMessage({ text: '', type: '' }), 4000)
    } catch (err) {
      console.error(err)
      setMessage({ text: err.response?.data?.error || 'Failed to save mappings securely.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const allOutcomes = [...programOutcomes, ...programSpecificOutcomes]

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Link size={22} className="text-indigo-600 dark:text-indigo-400" />
            CO-PO/PSO Mapping Matrix
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Map Course Outcomes against Program Outcomes. Define correlation as 1 (Low), 2 (Medium), or 3 (High).
          </p>
        </div>
        
        <div className="w-full md:w-64">
           <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
             Select Target Course
           </label>
           <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-slate-200 text-sm font-medium transition-colors cursor-pointer shadow-sm"
              disabled={loading}
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

      {/* Messages */}
      {message.text && (
        <div className={`p-4 rounded-xl flex items-start gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 border ${
          message.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
          <p>{message.text}</p>
        </div>
      )}

      {/* The Matrix Grid */}
      {!selectedCourseId ? (
         <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40">
           <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
             <Link size={28} className="text-indigo-400" />
           </div>
           <p className="text-slate-500 dark:text-slate-400 font-medium">Select a Course from the dropdown to begin mapping.</p>
         </div>
      ) : loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
          </div>
      ) : courseOutcomes.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
             <p className="text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                No Course Outcomes found. Ensure you provided COs when creating this course.
             </p>
          </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden animate-in fade-in duration-500">
           
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
               <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                 <tr>
                   <th className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      Outcomes
                   </th>
                   {allOutcomes.map((outcome) => (
                     <th key={outcome.id} className="px-3 py-4 font-bold text-center text-slate-600 dark:text-slate-300 min-w-[60px]" title={outcome.description}>
                       {outcome.code}
                     </th>
                   ))}
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {courseOutcomes.map((co) => (
                    <tr key={co.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-800/80 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" title={co.description}>
                         <div className="flex flex-col">
                           <span>{co.coNumber}</span>
                           <span className="text-[10px] text-slate-400 font-normal truncate max-w-[150px] mt-0.5">{co.description}</span>
                         </div>
                      </td>
                      
                      {allOutcomes.map((outcome) => {
                         const cellValue = mappings[co.id]?.[outcome.id] || ''
                         return (
                           <td key={outcome.id} className="px-2 py-2 text-center text-slate-600 dark:text-slate-400">
                              <input
                                type="number"
                                min="1"
                                max="3"
                                placeholder="-"
                                value={cellValue}
                                onChange={(e) => handleCellChange(co.id, outcome.id, e.target.value)}
                                className={`w-12 h-10 text-center text-sm font-bold rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all dark:bg-slate-900 ${
                                  cellValue 
                                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700/50 dark:bg-indigo-900/30 dark:text-indigo-400' 
                                    : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:text-slate-300'
                                }`}
                              />
                           </td>
                         )
                      })}
                    </tr>
                  ))}
               </tbody>
             </table>
           </div>

           {/* Footer Action */}
           <div className="p-5 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end">
             <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-70 active:scale-[0.98] transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
             >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? 'Saving Matrix...' : 'Save Mapping'}
             </button>
           </div>
        </div>
      )}

    </div>
  )
}
