import { useState, useEffect } from 'react'
import { GraduationCap, CheckCircle2, AlertCircle, Loader2, Send } from 'lucide-react'
import axios from 'axios'

export default function Survey() {
  const [students, setStudents] = useState([])
  const [allStudents, setAllStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [courses, setCourses] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [courseOutcomes, setCourseOutcomes] = useState([])
  
  // surveyRatings[coId] = 1, 2, or 3
  const [surveyRatings, setSurveyRatings] = useState({})
  
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingCOs, setLoadingCOs] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const isStudent = user?.role === 'STUDENT';

  // Filter students by selected class for admin/teacher view
  useEffect(() => {
    if (!selectedClassId) {
      setStudents(allStudents)
    } else {
      setStudents(allStudents.filter(s => s.academicClassId === selectedClassId))
    }
    setSelectedStudentId('')
  }, [selectedClassId, allStudents])

  // Initial Data Load
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
        
        if (isStudent) {
          const res = await axios.get('http://localhost:5000/api/student/pending-surveys', config);
          const pendingCourses = res.data;
          
          if (pendingCourses.length > 0) {
             setCourses(pendingCourses);
             setSelectedStudentId(pendingCourses[0].studentId);
          } else {
             setCourses([]);
          }
        } else {
          const [studentRes, courseRes, classRes] = await Promise.all([
            axios.get('http://localhost:5000/api/students', config),
            axios.get('http://localhost:5000/api/courses?lean=true', config),
            axios.get('http://localhost:5000/api/academic-classes', config)
          ])
          setAllStudents(studentRes.data)
          setStudents(studentRes.data)
          setCourses(courseRes.data)
          setClasses(classRes.data)
        }
      } catch (err) {
        console.error(err)
        setMessage({ text: 'Failed to initialize survey portal. Check server connection.', type: 'error' })
      } finally {
        setLoadingInitial(false)
      }
    }
    fetchDropdowns()
  }, [])

  // Fetch COs when a Course is selected
  useEffect(() => {
    if (!selectedCourseId) {
      setCourseOutcomes([])
      setSurveyRatings({})
      return
    }

    const fetchCOs = async () => {
      setLoadingCOs(true)
      try {
        // Find the course in our pre-fetched list to extract its COs
        const targetCourse = courses.find(c => c.id === selectedCourseId)
        if (targetCourse && targetCourse.courseOutcomes) {
          // Sort COs nicely (CO1, CO2, etc)
          const sortedCOs = [...targetCourse.courseOutcomes].sort((a,b) => a.coNumber.localeCompare(b.coNumber))
          setCourseOutcomes(sortedCOs)
          
          // Pre-fill ratings state with nulls
          const initialRatings = {}
          sortedCOs.forEach(co => initialRatings[co.id] = null)
          setSurveyRatings(initialRatings)
        }
        setMessage({ text: '', type: '' })
      } catch (err) {
        console.error(err)
        setMessage({ text: 'Failed to load Course Outcomes for the survey.', type: 'error' })
      } finally {
        setLoadingCOs(false)
      }
    }

    fetchCOs()
  }, [selectedCourseId, courses])

  const handleRatingChange = (coId, ratingValue) => {
    setSurveyRatings(prev => ({
      ...prev,
      [coId]: ratingValue
    }))
  }

  const handleSubmit = async () => {
    if (!selectedStudentId || !selectedCourseId) {
      setMessage({ text: 'Please select both your Student Profile and the Course.', type: 'error' })
      return
    }

    // Validation: Ensure all COs are explicitly rated before submission
    const unratedCOs = courseOutcomes.filter(co => !surveyRatings[co.id])
    if (unratedCOs.length > 0) {
      setMessage({ text: `Please rate all Course Outcomes. Missing: ${unratedCOs.map(c => c.coNumber).join(', ')}`, type: 'error' })
      return
    }

    setSubmitting(true)
    setMessage({ text: '', type: '' })

    const payload = courseOutcomes.map(co => ({
      studentId: selectedStudentId,
      courseId: selectedCourseId,
      courseOutcomeId: co.id,
      rating: surveyRatings[co.id]
    }))

    try {
      await axios.post('http://localhost:5000/api/surveys', { surveys: payload })
      setMessage({ text: 'Survey submitted successfully! Thank you for your feedback.', type: 'success' })
      
      // Reset form
      setSelectedCourseId('')
      setSelectedStudentId('')
      setSurveyRatings({})
      
    } catch (err) {
      console.error(err)
      setMessage({ text: err.response?.data?.error || 'Failed to submit survey.', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-4 border-4 border-white dark:border-slate-900 shadow-sm">
           <GraduationCap size={32} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Course Exit Survey</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xl mx-auto">
          Your honest feedback directly influences our Outcome-Based Education (OBE) metrics. Please rate your confidence in achieving each Course Outcome.
        </p>
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

      {/* Identifiers Card */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
         <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-100 dark:border-slate-700/50 pb-3">
            1. Identify Yourself
         </h3>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!isStudent ? (
              <>
                <div>
                   <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                     Filter by Class / Batch
                   </label>
                   <select
                     value={selectedClassId}
                     onChange={(e) => setSelectedClassId(e.target.value)}
                     disabled={loadingInitial}
                     className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-slate-200 text-sm font-medium transition-colors"
                   >
                     <option value="">-- All Classes --</option>
                     {classes.map(c => (
                       <option key={c.id} value={c.id}>{c.name}</option>
                     ))}
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                     Student
                   </label>
                   <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      disabled={loadingInitial}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-slate-200 text-sm font-medium transition-colors"
                   >
                      <option value="">-- Select Student --</option>
                      {students.map(s => (
                         <option key={s.id} value={s.id}>{s.rollNo} - {s.name}</option>
                      ))}
                   </select>
                </div>
              </>
            ) : (
              <div>
                 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                   Your Profile
                 </label>
                 <div className="w-full px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-700 dark:text-indigo-300 text-sm font-bold flex items-center">
                   <CheckCircle2 size={18} className="mr-2" />
                   {user?.name} ({user?.rollNo})
                 </div>
              </div>
            )}

            <div>
               <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                 Course to Evaluate
               </label>
               <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  disabled={loadingInitial}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-slate-200 text-sm font-medium transition-colors"
               >
                  {courses.length === 0 && isStudent ? (
                     <option value="">No pending surveys!</option>
                  ) : (
                     <>
                       <option value="">-- Select Course --</option>
                       {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                       ))}
                     </>
                  )}
               </select>
            </div>
         </div>
      </div>

      {/* Survey Body */}
      {selectedCourseId && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 pb-4 mb-4">
             <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                2. Evaluate Outcomes
             </h3>
             <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-md">
                {courseOutcomes.length} Questions
             </span>
          </div>

          {loadingCOs ? (
             <div className="flex justify-center flex-col items-center py-10">
                <Loader2 className="animate-spin text-indigo-500 mb-2" size={28} />
                <p className="text-sm text-slate-500">Loading outcomes...</p>
             </div>
          ) : courseOutcomes.length === 0 ? (
             <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
               <p className="text-slate-500 dark:text-slate-400 font-medium">No Course Outcomes defined for this course.</p>
             </div>
          ) : (
             <div className="space-y-6">
               {courseOutcomes.map((co, index) => (
                  <div key={co.id} className="p-5 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-colors">
                     <div className="flex gap-4">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                           Q{index + 1}
                        </div>
                        <div className="flex-1">
                           <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                              {co.coNumber}
                           </p>
                           <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                              {co.description}
                           </p>
                           
                           {/* Rating Scale */}
                           <div className="flex flex-col sm:flex-row gap-3">
                              {[
                                { val: 1, label: 'Low Confidence' },
                                { val: 2, label: 'Moderate Understanding' },
                                { val: 3, label: 'High Confidence / Mastery' }
                              ].map(choice => (
                                 <button
                                    key={choice.val}
                                    onClick={() => handleRatingChange(co.id, choice.val)}
                                    className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${
                                      surveyRatings[co.id] === choice.val
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/20'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                    }`}
                                 >
                                    <span className="block text-xs opacity-75 mb-0.5">Rating {choice.val}</span>
                                    {choice.label}
                                 </button>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>
               ))}
               
               {/* Submit Action */}
               <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50 flex justify-end">
                  <button
                     onClick={handleSubmit}
                     disabled={submitting}
                     className="flex items-center gap-2 bg-slate-900 dark:bg-indigo-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-70 active:scale-[0.98] transition-all shadow-md"
                  >
                     {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                     {submitting ? 'Transmitting Data...' : 'Submit Exit Survey'}
                  </button>
               </div>
             </div>
          )}
        </div>
      )}

    </div>
  )
}
