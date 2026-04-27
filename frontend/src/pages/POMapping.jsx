import { useState, useEffect } from 'react'
import { useCachedState } from '../context/PageCacheContext'
import { CheckCircle2, AlertCircle, Save, Loader2, Link as LinkIcon, X } from 'lucide-react'
import axios from 'axios'

export default function POMapping() {
  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useCachedState('po_selectedCourseId', '')
  const [courseOutcomes, setCourseOutcomes] = useCachedState('po_courseOutcomes', [])
  
  const [programOutcomes, setProgramOutcomes] = useState([])
  const [programSpecificOutcomes, setProgramSpecificOutcomes] = useState([])
  
  // Matrix format: mappings['co_id']['po_or_pso_id'] = correlationLevel
  const [mappings, setMappings] = useCachedState('po_mappings', {})
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  // Initial Data Load
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        const [courseRes, poRes] = await Promise.all([
          axios.get('http://localhost:5000/api/courses', config),
          axios.get('http://localhost:5000/api/pos', config)
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

  // Fetch COs and existing Mappings when Course Changes
  useEffect(() => {
    if (!selectedCourseId) {
      setCourseOutcomes([])
      setMappings({})
      setMessage({ text: '', type: '' })
      return
    }

    const fetchMappings = async () => {
      setLoading(true)
      try {
        const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        const res = await axios.get(`http://localhost:5000/api/mappings/${selectedCourseId}`, config)
        setCourseOutcomes(res.data)
        
        // Rebuild existing database mappings into local state Matrix (Merge POs and PSOs logically)
        const matrix = {}
        res.data.forEach(co => {
          matrix[co.id] = {}
          co.coPoMappings.forEach(m => {
            matrix[co.id][m.programOutcomeId] = m.correlationLevel
          })
          co.coPsoMappings.forEach(m => {
            matrix[co.id][m.programSpecificOutcomeId] = m.correlationLevel
          })
        })
        setMappings(matrix)
        setMessage({ text: '', type: '' })
      } catch (err) {
        console.error(err)
        setMessage({ text: 'Failed to load Course Outcomes and existing mappings.', type: 'error' })
      } finally {
        setLoading(false)
      }
    }

    fetchMappings()
  }, [selectedCourseId])

  const handleCellChange = (coId, outcomeId, value) => {
    // Restrict strictly to 1, 2, 3 or Empty string natively at the input level
    if (value !== '' && value !== '1' && value !== '2' && value !== '3') {
      return // block keystroke
    }

    const parsedValue = value === '' ? undefined : parseInt(value, 10)
    setMappings(prev => ({
      ...prev,
      [coId]: {
        ...prev[coId],
        [outcomeId]: parsedValue
      }
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage({ text: '', type: '' })
    
    const flattenedMappings = []
    
    // We iterate through our matrix. For each outcomeId, we determine if it's a PO or PSO by checking our master arrays.
    Object.keys(mappings).forEach(coId => {
      Object.keys(mappings[coId]).forEach(outcomeId => {
        const level = mappings[coId][outcomeId]
        if (level && level > 0 && level <= 3) {
          
          const isPO = programOutcomes.some(po => po.id === outcomeId)
          
          flattenedMappings.push({
            courseOutcomeId: coId,
            targetId: outcomeId,
            type: isPO ? 'PO' : 'PSO',
            correlationLevel: level
          })
        }
      })
    })

    if (flattenedMappings.length === 0) {
      setMessage({ text: 'Warning: No mappings defined to save.', type: 'error' })
      setSaving(false)
      return
    }

    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      await axios.post('http://localhost:5000/api/mappings/co-po', { mappings: flattenedMappings }, config)
      setMessage({ text: 'Articulation Matrix successfully locked and saved!', type: 'success' })
      setTimeout(() => setMessage({ text: '', type: '' }), 4000)
    } catch (err) {
      console.error(err)
      setMessage({ text: err.response?.data?.error || 'Failed to sync matrix parameters.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const allOutcomes = [...programOutcomes, ...programSpecificOutcomes]

  return (
    <div className="space-y-6 max-w-full pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <LinkIcon size={22} className="text-indigo-600 dark:text-indigo-400" />
            CO-PO/PSO Articulation Matrix
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Map Course Outcomes against Program Specifics. Value logic strictly supports 1 (Low), 2 (Medium), or 3 (High).
          </p>
        </div>
        
        <div className="w-full md:w-72 relative">
           <label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider ml-1">
             Active Curriculum Course
           </label>
           <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full appearance-none px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-slate-200 text-sm font-bold transition-colors cursor-pointer shadow-sm"
              disabled={loading && courses.length === 0}
           >
              <option value="">— Select Target Course —</option>
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
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-bold shadow-sm animate-in fade-in slide-in-from-top-2 border ${
          message.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400'
            : 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <p>{message.text}</p>
        </div>
      )}

      {/* The Matrix Grid */}
      {!selectedCourseId ? (
         <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40">
           <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-6 shadow-sm">
             <LinkIcon size={34} className="text-indigo-400" />
           </div>
           <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Matrix Framework Offline</h3>
           <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Target a Course from the dropdown to initialize the matrix grid arrays.</p>
         </div>
      ) : loading ? (
          <div className="flex flex-col items-center py-24 border border-slate-100 dark:border-slate-700/60 rounded-2xl bg-white dark:bg-slate-800/50">
            <Loader2 className="animate-spin text-indigo-500 mb-4" size={36} />
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Synchronizing relational schema...</div>
          </div>
      ) : courseOutcomes.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60">
             <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Target Outcomes Configured</h3>
             <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-2">
                This course lacks logical Course Outcomes (COs). Inject CO records to unlock mapping.
             </p>
          </div>
      ) : (
        <div className="space-y-8">
        <div className="relative bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in duration-500">
           <button onClick={() => setSelectedCourseId('')} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors z-50">
             <X size={20} />
           </button>
           <div className="overflow-x-auto custom-scrollbar">
             <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-700">
                 <tr>
                   <th className="px-6 py-5 font-extrabold text-slate-600 dark:text-slate-400 tracking-widest uppercase text-xs sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      Internal Core Outcomes (COs)
                   </th>
                   {allOutcomes.map((outcome) => (
                     <th key={outcome.id} className="px-3 py-4 font-bold text-center text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700/50 min-w-[65px]" title={outcome.description}>
                       {outcome.code}
                     </th>
                   ))}
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {courseOutcomes.map((co) => (
                    <tr key={co.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 z-10 border-r border-slate-200 dark:border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" title={co.description}>
                         <div className="flex flex-col min-w-[200px]">
                           <span className="text-[13px] font-bold">{co.coNumber}</span>
                           <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-1 break-words">{co.description}</span>
                         </div>
                      </td>
                      
                      {allOutcomes.map((outcome) => {
                         const cellValue = mappings[co.id]?.[outcome.id] || ''
                         return (
                           <td key={outcome.id} className="px-1.5 py-1 text-center border-r border-slate-100 dark:border-slate-700/50">
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="-"
                                value={cellValue}
                                onChange={(e) => handleCellChange(co.id, outcome.id, e.target.value)}
                                className={`w-12 h-10 text-center text-[15px] font-black rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all dark:bg-slate-900/40 ${
                                  cellValue 
                                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700/50 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-[inset_0_1px_3px_rgba(99,102,241,0.1)]' 
                                    : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:text-slate-400'
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

          <div className="flex justify-end pt-4 pb-8 pr-6">
            <button
              onClick={handleSave}
              disabled={saving || !selectedCourseId}
              className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 disabled:opacity-50 disabled:pointer-events-none"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? 'Synchronizing...' : 'Lock Articulation Matrix'}
            </button>
          </div>

          {/* Reference Table for POs and PSOs */}
          <div className="mt-12 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
             <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                   <LinkIcon size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                   <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Outcome Reference Glossary</h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400">Definitions of National Program Outcomes and Program Specific Outcomes.</p>
                </div>
             </div>

             <div className="grid md:grid-cols-2 gap-10">
                {/* POs */}
                <div className="space-y-4">
                   <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest border-b border-indigo-100 dark:border-indigo-900/30 pb-2">National Program Outcomes (PO1 - PO12)</h4>
                   <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {programOutcomes.map(po => (
                         <div key={po.id} className="flex gap-4 items-start group">
                            <span className="font-black text-slate-400 dark:text-slate-600 group-hover:text-indigo-500 transition-colors text-xs mt-0.5">{po.code}</span>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{po.description}</p>
                         </div>
                      ))}
                   </div>
                </div>

                {/* PSOs */}
                <div className="space-y-4">
                   <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest border-b border-emerald-100 dark:border-emerald-900/30 pb-2">Program Specific Outcomes (PSOs)</h4>
                   <div className="space-y-4">
                      {programSpecificOutcomes.map(pso => (
                         <div key={pso.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 group">
                            <div className="flex items-center gap-2 mb-2">
                               <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-md uppercase">{pso.code}</span>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">{pso.description}</p>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
           </div>
          </div>
         </div>
        )}
      </div>
    )
  }
