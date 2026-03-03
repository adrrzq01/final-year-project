import { useState, useEffect } from 'react'
import { Search, Plus, BookOpen, Users, MoreVertical } from 'lucide-react'
import axios from 'axios'
import AddCourseModal from '../components/AddCourseModal'

export default function Classes() {
  const [search, setSearch] = useState('')
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/courses')
      setCourses(res.data)
    } catch (err) {
      console.error('Failed to fetch courses:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCourseAdded = (newCourse) => {
    setCourses(prev => [newCourse, ...prev])
  }

  const filtered = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  )

  // Array of tailwind color combinations for cards
  const themeColors = [
    { bg: 'bg-indigo-50 dark:bg-indigo-900/30', border: 'border-indigo-200 dark:border-indigo-800', text: 'text-indigo-700 dark:text-indigo-400', progress: 'bg-indigo-500' },
    { bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', progress: 'bg-emerald-500' },
    { bg: 'bg-violet-50 dark:bg-violet-900/30', border: 'border-violet-200 dark:border-violet-800', text: 'text-violet-700 dark:text-violet-400', progress: 'bg-violet-500' },
    { bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', progress: 'bg-amber-500' },
    { bg: 'bg-sky-50 dark:bg-sky-900/30', border: 'border-sky-200 dark:border-sky-800', text: 'text-sky-700 dark:text-sky-400', progress: 'bg-sky-500' },
    { bg: 'bg-rose-50 dark:bg-rose-900/30', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-400', progress: 'bg-rose-500' },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Classes & Courses</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Manage your registered courses</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
        >
          <Plus size={16} />
          Add Course
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id="classes-search"
          name="classesSearch"
          aria-label="Search classes by code or name"
          type="text"
          placeholder="Search by code or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-slate-400 dark:text-slate-200 transition-colors duration-300"
        />
      </div>

      {/* State rendering */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 transition-colors duration-300">
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-5">
            <BookOpen size={34} className="text-indigo-400 dark:text-indigo-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
            {search ? 'No matches found' : 'No courses yet'}
          </h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 text-center max-w-sm">
            {search 
              ? 'Try changing your search keywords.'
              : <span>Click <strong className="text-indigo-600 dark:text-indigo-400">Add Course</strong> above to register your first class.</span>}
          </p>
          {!search && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="mt-6 flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
            >
              <Plus size={16} />
              Add Your First Course
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((course, index) => {
            const theme = themeColors[index % themeColors.length]
            const totalCredits = course.theoryCredits + course.practicalCredits
            
            // Derive attainment % based on mapped CO threshold logic (placeholder 0 for now)
            // Once marks are computed, we will display real attainment
            const attainment = 0 

            return (
              <div 
                key={course.id} 
                className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700/50 transition-all duration-300 group overflow-hidden"
              >
                {/* Header block */}
                <div className={`p-5 pb-4 border-b border-transparent group-hover:border-slate-100 dark:group-hover:border-slate-700/40 transition-colors ${theme.bg}`}>
                  <div className="flex justify-between items-start">
                    <div className={`text-xs font-bold px-2 py-1 rounded-md bg-white/70 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm ${theme.text}`}>
                      {course.code}
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-3 truncate" title={course.name}>
                    {course.name}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                    {course.academicClass?.name || 'Unassigned Batch'}
                  </p>
                </div>
                
                {/* Content block */}
                <div className="p-5">
                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-100 dark:border-slate-700">
                      <Users size={14} className="text-slate-400" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">0</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-100 dark:border-slate-700">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{totalCredits}</span> 
                      <span className="text-xs">Credits</span>
                    </div>
                  </div>

                  {/* CO Attainment Progress Bar */}
                  <div className="mt-5">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">CO Attainment</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{attainment}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full transition-all duration-1000 ${theme.progress}`} 
                        style={{ width: `${attainment}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <AddCourseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCourseAdded={handleCourseAdded} 
      />
    </div>
  )
}
