
import { useState, useEffect } from 'react'
import { 
  Users, BookOpen, Search, Plus, ListFilter, Trash2, Edit2, ChevronDown, CheckCircle2, ShieldAlert,
  Database, MoreVertical
} from 'lucide-react'
import axios from 'axios'
import AddCourseModal from '../components/AddCourseModal'
import { useSemester } from '../context/SemesterContext'

export default function Classes() {
  const [error, setError] = useState('')
  
  // Filtering States
  const [selectedDepartment, setSelectedDepartment] = useState('BCA')
  const { activeSemester: selectedSemester, setActiveSemester: setSelectedSemester } = useSemester()
  const [searchQuery, setSearchQuery] = useState('')
  
  // Data states
  const [courses, setCourses] = useState([])
  const [filteredCourses, setFilteredCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false) // Renamed from isModalOpen
  const [activeDropdown, setActiveDropdown] = useState(null)
  
  const userString = localStorage.getItem('user')
  const user = userString ? JSON.parse(userString) : null

  useEffect(() => {
    fetchCourses()
    
    // Close dropdown on outside click
    const handleClickOutside = () => setActiveDropdown(null)
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment, selectedSemester])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      setError('')
      // Pass filters to backend if BCA is selected
      const queryParams = new URLSearchParams()
      if (selectedDepartment) queryParams.append('department', selectedDepartment)
      if (selectedDepartment === 'BCA' && selectedSemester) {
        queryParams.append('semester', selectedSemester)
      }

      const currentToken = localStorage.getItem('token')
      const config = { headers: { Authorization: `Bearer ${currentToken}` } }

      const res = await axios.get(`http://localhost:5000/api/courses?${queryParams.toString()}`, config)
      setCourses(res.data)
      setFilteredCourses(res.data) // Initialize filteredCourses with all courses
    } catch (err) {
      console.error('Failed to load courses', err)
      setError('Failed to connect to the server or retrieve courses.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query) => {
    setSearchQuery(query)
    if (query) {
      const lowercasedQuery = query.toLowerCase()
      const filtered = courses.filter(
        (c) =>
          c.name.toLowerCase().includes(lowercasedQuery) ||
          c.code.toLowerCase().includes(lowercasedQuery)
      )
      setFilteredCourses(filtered)
    } else {
      setFilteredCourses(courses) // If search is empty, show all courses
    }
  }

  const handleCourseAdded = (newCourse) => {
    setCourses(prev => [newCourse, ...prev])
    setFilteredCourses(prev => [newCourse, ...prev]) // Also update filtered list
  }

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm("Are you sure? This will permanently delete the course, exams, and marks associated with it.")) return
    
    try {
      const currentToken = localStorage.getItem('token')
      await axios.delete(`http://localhost:5000/api/courses/${courseId}`, { headers: { Authorization: `Bearer ${currentToken}` } })
      setCourses(prev => prev.filter(c => c.id !== courseId))
      setFilteredCourses(prev => prev.filter(c => c.id !== courseId)) // Also update filtered list
      setActiveDropdown(null)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.error || "Failed to delete course")
    }
  }

  const handlePurgeAll = async () => {
    if (!window.confirm("Are you absolutely sure you want to purge ALL data? This action cannot be undone.")) return
    try {
      const currentToken = localStorage.getItem('token')
      await axios.delete('http://localhost:5000/api/courses/clear-all', { headers: { Authorization: `Bearer ${currentToken}` } })
      setCourses([])
      setFilteredCourses([])
      alert('All data purged successfully!')
    } catch (err) {
      console.error('Failed to purge data:', err)
      alert(err.response?.data?.error || "Failed to purge data.")
    }
  }

  const handleSeedBca = async () => {
    if (!window.confirm("Are you sure you want to seed BCA data? This will add 36 BCA courses.")) return
    try {
       const currentToken = localStorage.getItem('token')
       const config = { headers: { Authorization: `Bearer ${currentToken}` } }
      await axios.post('http://localhost:5000/api/courses/seed-bca', {}, config)
      fetchCourses() // Re-fetch courses to show seeded data
      alert('BCA data seeded successfully!')
    } catch (err) {
      console.error('Failed to seed BCA data:', err)
      alert(err.response?.data?.error || "Failed to seed BCA data.")
    }
  }

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
      {/* Header & Global Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen size={22} className="text-indigo-600 dark:text-indigo-400" />
            Curriculum Structure
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage and track course outcomes across departments and semesters.</p>
        </div>
        
        {user?.role === 'ADMIN' && (
          <div className="flex items-center gap-3">
             <button 
                onClick={handlePurgeAll}
                className="flex items-center gap-2 bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 px-4 py-2.5 rounded-xl hover:bg-rose-200 dark:hover:bg-rose-900/60 font-semibold text-sm transition-all"
                title="Wipe database clean of all Courses"
             >
                <Trash2 size={18} /> Purge All Data
             </button>
             <button 
                onClick={handleSeedBca}
                className="flex items-center gap-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-4 py-2.5 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/60 font-semibold text-sm transition-all shadow-sm shadow-emerald-200 dark:shadow-none"
             >
                <Database size={18} /> Seed 36 BCA Courses
             </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-semibold text-sm transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
            >
              <Plus size={18} /> Add Individual Course
            </button>
          </div>
        )}
      </div>

      {/* Main Filters Toolbar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700/60 flex flex-col md:flex-row gap-4">
        
        {/* Department Filter */}
        <div className="flex-1 max-w-[200px]">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Department</label>
          <select 
            value={selectedDepartment}
            onChange={e => setSelectedDepartment(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
          >
            <option value="BCA">BCA (Bachelors in Comp Apps)</option>
            <option value="BCOM">BCOM (Bachelors in Commerce)</option>
            <option value="BA">BA (Bachelors in Arts)</option>
            <option value="BBA">BBA (Bachelors in Business)</option>
          </select>
        </div>

        {/* Semester Filter (Only if BCA) */}
        {true /* Always show Semester */ && (
          <div className="flex-1 max-w-[150px] animate-in fade-in slide-in-from-left-2 duration-300">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Semester</label>
            <select 
              value={selectedSemester}
              onChange={e => setSelectedSemester(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            >
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
              <option value="3">Semester 3</option>
              <option value="4">Semester 4</option>
              <option value="5">Semester 5</option>
              <option value="6">Semester 6</option>
            </select>
          </div>
        )}

        {/* Existing Search bar */}
        <div className="flex-1 flex flex-col justify-end">
           <div className="relative group">
             <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
             <input 
               type="text"
               placeholder="Search by course code or name..."
               value={searchQuery}
               onChange={(e) => handleSearch(e.target.value)}
               className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all dark:text-slate-100 placeholder:text-slate-400 font-medium"
             />
           </div>
        </div>
      </div>

      {/* State rendering */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30 transition-colors duration-300">
          <ShieldAlert size={34} className="text-red-500 dark:text-red-400 mb-5" />
          <h3 className="text-lg font-bold text-red-700 dark:text-red-300">
            Error Loading Courses
          </h3>
          <p className="text-sm text-red-500 dark:text-red-400 mt-2 text-center max-w-sm">
            {error}
          </p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 transition-colors duration-300">
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-5">
            <BookOpen size={34} className="text-indigo-400 dark:text-indigo-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
            {searchQuery ? 'No matches found' : 'No courses yet'}
          </h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 text-center max-w-sm">
            {searchQuery 
              ? 'Try changing your search keywords or filter options.'
              : <span>Click <strong className="text-indigo-600 dark:text-indigo-400">Add Individual Course</strong> above to register your first class.</span>}
          </p>
          {!searchQuery && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="mt-6 flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
            >
              <Plus size={16} />
              Add Your First Course
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course, index) => {
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
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveDropdown(activeDropdown === course.id ? null : course.id)
                        }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {activeDropdown === course.id && (
                        <div 
                          className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1.5 z-20 animate-in fade-in slide-in-from-top-2 duration-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button 
                            className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            onClick={() => {
                              alert('Edit feature coming soon!')
                              setActiveDropdown(null)
                            }}
                          >
                            Edit Course
                          </button>
                          <button 
                            className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            onClick={() => handleDeleteCourse(course.id)}
                          >
                            Delete Course
                          </button>
                        </div>
                      )}
                    </div>
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
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onCourseAdded={handleCourseAdded} 
      />
    </div>
  )
}
