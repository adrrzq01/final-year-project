import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { User, Loader2, ArrowLeft, Save, Edit3, ChevronDown, ChevronUp, Book, Activity, Building, Briefcase } from 'lucide-react'
import { useAlert } from '../context/AlertContext'

export default function UserProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showAlert } = useAlert()

  const [userData, setUserData] = useState(null)
  const [progressData, setProgressData] = useState(null)
  const [userType, setUserType] = useState(null)
  const [loading, setLoading] = useState(true)

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})

  const [expandedYears, setExpandedYears] = useState({})
  const [expandedSems, setExpandedSems] = useState({})

  useEffect(() => {
    fetchProfileData()
  }, [id])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      
      const progressRes = await axios.get(`http://localhost:5000/api/admin/users/${id}/academic-progress`, config)
      const type = progressRes.data.type
      setUserType(type)
      setProgressData(progressRes.data.progress)

      // Fetch basic details
      let detailsRes;
      if (type === 'STUDENT') {
         // Reusing student directory to find specific student details
         const allRes = await axios.get('http://localhost:5000/api/admin/users/students', config)
         let found = null;
         for (const dept in allRes.data) {
           for (const cls in allRes.data[dept]) {
             for (const div in allRes.data[dept][cls]) {
               const s = allRes.data[dept][cls][div].find(st => st.id === id)
               if (s) {
                 found = { ...s, department: dept, className: cls, division: div }
                 break
               }
             }
             if (found) break;
           }
           if (found) break;
         }
         setUserData(found || { name: 'Unknown Student' })
         if (found) setEditForm({ name: found.name, rollNo: found.rollNo, currentSemester: found.currentSemester })
      } else {
         const allRes = await axios.get('http://localhost:5000/api/admin/users/faculty', config)
         let found = null;
         for (const dept in allRes.data) {
           const f = allRes.data[dept].find(tc => tc.id === id)
           if (f) { found = f; break; }
         }
         setUserData(found || { fullName: 'Unknown Faculty' })
         if (found) setEditForm({ fullName: found.fullName, employmentType: found.employmentType, isActive: found.isActive })
      }

    } catch (err) {
      console.error(err)
      showAlert('Failed to load profile data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      await axios.put(`http://localhost:5000/api/admin/users/${id}`, editForm, config)
      showAlert('Profile updated successfully!', 'success')
      setIsEditing(false)
      fetchProfileData()
    } catch (err) {
      showAlert('Failed to update profile', 'error')
    }
  }

  const toggleYear = (year) => setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }))
  const toggleSem = (sem) => setExpandedSems(prev => ({ ...prev, [sem]: !prev[sem] }))

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
        <ArrowLeft size={16} /> Back to Directory
      </button>

      {/* Top Section: Profile Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden relative">
         <div className="h-32 bg-gradient-to-r from-indigo-500 to-violet-600"></div>
         <div className="px-6 pb-6 relative">
            <div className="flex justify-between items-end -mt-10 mb-4">
              <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-800 flex items-center justify-center shadow-md">
                <User size={40} className="text-indigo-500" />
              </div>
              <div>
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors">
                    <Edit3 size={16} /> Edit Profile
                  </button>
                ) : (
                  <button onClick={handleSave} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all">
                    <Save size={16} /> Save Changes
                  </button>
                )}
              </div>
            </div>

            {userType === 'STUDENT' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Student Name</label>
                  {isEditing ? <input value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500" /> : <p className="text-lg font-bold text-slate-900 dark:text-white">{userData?.name}</p>}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Roll Number</label>
                  {isEditing ? <input value={editForm.rollNo || ''} onChange={e => setEditForm({...editForm, rollNo: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500" /> : <p className="text-lg font-bold text-slate-900 dark:text-white">{userData?.rollNo}</p>}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Class & Div</label>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{userData?.department} - {userData?.className} (Div {userData?.division})</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Current Semester</label>
                  {isEditing ? (
                    <select value={editForm.currentSemester || ''} onChange={e => setEditForm({...editForm, currentSemester: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500">
                      {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  ) : <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Semester {userData?.currentSemester}</p>}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Faculty Name</label>
                  {isEditing ? <input value={editForm.fullName || ''} onChange={e => setEditForm({...editForm, fullName: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500" /> : <p className="text-lg font-bold text-slate-900 dark:text-white">{userData?.fullName}</p>}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Email</label>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{userData?.email}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Employment Type</label>
                  {isEditing ? (
                    <select value={editForm.employmentType || ''} onChange={e => setEditForm({...editForm, employmentType: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500">
                      <option value="PERMANENT">PERMANENT</option>
                      <option value="TEMPORARY">TEMPORARY</option>
                    </select>
                  ) : <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{userData?.employmentType}</p>}
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Status</label>
                   {isEditing ? (
                     <div className="flex items-center gap-2 mt-2">
                       <input type="checkbox" checked={editForm.isActive} onChange={e => setEditForm({...editForm, isActive: e.target.checked})} className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Active Account</span>
                     </div>
                   ) : <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{userData?.isActive ? 'Active' : 'Expired/Suspended'}</p>}
                </div>
              </div>
            )}
         </div>
      </div>

      {/* Bottom Section: Academic Progress Accordion */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
          <Activity className="text-indigo-500" size={20} />
          {userType === 'STUDENT' ? 'Academic Mark Sheet' : 'Course Management Overview'}
        </h3>

        {progressData && Object.keys(progressData).length === 0 && (
          <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500">
            No academic data found.
          </div>
        )}

        <div className="space-y-4">
          {progressData && Object.entries(progressData).map(([year, sems]) => (
            <div key={year} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <button onClick={() => toggleYear(year)} className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                <span className="font-bold text-slate-800 dark:text-slate-200">{year}</span>
                {expandedYears[year] ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </button>

              {expandedYears[year] && (
                <div className="p-4 space-y-4 border-t border-slate-200 dark:border-slate-700">
                  {Object.entries(sems).map(([sem, courses]) => (
                    <div key={sem} className="bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700/60 overflow-hidden">
                      <button onClick={() => toggleSem(sem)} className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{sem}</span>
                        {expandedSems[sem] ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </button>

                      {expandedSems[sem] && (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {userType === 'STUDENT' ? (
                            Object.entries(courses).map(([cId, course]) => (
                              <div key={cId} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                                <div>
                                  <div className="text-xs font-bold text-indigo-500 mb-1">{course.code}</div>
                                  <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-3">{course.name}</div>
                                </div>
                                <div className="flex gap-4 border-t border-slate-100 dark:border-slate-700 pt-3">
                                  <div className="flex-1">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">ISA Score</div>
                                    <div className={`font-bold text-sm ${course.exams.ISA?.obtained < 16 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                      {course.exams.ISA ? `${course.exams.ISA.obtained} / ${course.exams.ISA.max}` : 'N/A'}
                                    </div>
                                  </div>
                                  <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
                                  <div className="flex-1">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">SEE Score</div>
                                    <div className={`font-bold text-sm ${course.exams.SEE?.obtained < 24 ? 'text-rose-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                      {course.exams.SEE ? `${course.exams.SEE.obtained} / ${course.exams.SEE.max}` : 'N/A'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            courses.map(course => (
                              <div key={course.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="text-xs font-bold text-indigo-500 mb-1">{course.code}</div>
                                <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-3">{course.name}</div>
                                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                  <span className="text-xs font-bold text-slate-500">Overall Course Attainment</span>
                                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">{course.overallAttainment}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
