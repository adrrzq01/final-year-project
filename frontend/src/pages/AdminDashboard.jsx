import { useState, useEffect } from 'react'
import { useCachedState } from '../context/PageCacheContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ShieldCheck, UserCheck, AlertCircle, Loader2, GraduationCap, Users, BookOpen, TrendingUp, Award, RefreshCcw } from 'lucide-react'
import StatCard from '../components/StatCard'
import AttainmentChart from '../components/AttainmentChart'
import { useAlert } from '../context/AlertContext'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [facultyDir, setFacultyDir] = useState([])
  const [studentDir, setStudentDir] = useState([])

  const [loading, setLoading] = useState(true)
  const [dirLoading, setDirLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useCachedState('admin_activeTab', 'PENDING')
  const [searchTerm, setSearchTerm] = useCachedState('admin_searchTerm', '')
  const { showAlert } = useAlert()

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [globalParity, setGlobalParity] = useState('ODD')
  const [parityLoading, setParityLoading] = useState(true)

  // Directory Filters
  const [facultyDeptFilter, setFacultyDeptFilter] = useCachedState('admin_facDept', '')
  const [studentDeptFilter, setStudentDeptFilter] = useCachedState('admin_studDept', '')
  const [studentClassFilter, setStudentClassFilter] = useCachedState('admin_studClass', '')
  const [studentDivFilter, setStudentDivFilter] = useCachedState('admin_studDiv', '')

  useEffect(() => {
    fetchPendingUsers()
    fetchDirectories()
    fetchAnalytics()
    fetchSettings()
  }, [])

  const fetchDirectories = async () => {
    try {
      setDirLoading(true)
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      const [facRes, studRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/users/faculty', config),
        axios.get('http://localhost:5000/api/admin/users/students', config)
      ])
      setFacultyDir(facRes.data)
      setStudentDir(studRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setDirLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/settings')
      setGlobalParity(res.data.activeParity || 'ODD')
    } catch(err) {
      console.error(err)
    } finally {
      setParityLoading(false)
    }
  }

  const toggleParity = async () => {
    const nextParity = globalParity === 'ODD' ? 'EVEN' : 'ODD'
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      await axios.put('http://localhost:5000/api/admin/settings', { activeParity: nextParity }, config)
      setGlobalParity(nextParity)
      showAlert(`Global Semester Parity shifted to ${nextParity}`, 'success')
    } catch (err) {
      showAlert('Failed to update parity settings', 'error')
    }
  }

  const fetchPendingUsers = async () => {
    try {
      setLoading(true)
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      const res = await axios.get('http://localhost:5000/api/admin/pending-users', config)
      setUsers(res.data)
    } catch (err) {
      console.error(err)
      setError('Failed to load pending users.')
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      const res = await axios.get('http://localhost:5000/api/dashboard', config)
      setAnalyticsData(res.data)
    } catch (err) {
      console.error('Analytics fetch skipped:', err.message)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const handleApprove = async (id, isTeacher) => {
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      await axios.put(`http://localhost:5000/api/admin/approve-user/${id}`, {}, config)
      setUsers(prev => prev.filter(u => u.id !== id))
      showAlert(`${isTeacher ? 'Teacher' : 'Student'} approved successfully!`, 'success')
    } catch (err) {
      showAlert(`Failed to approve ${isTeacher ? 'teacher' : 'student'}`, 'error')
    }
  }

  const pendingTeachers = users.filter(u => u.role === 'TEACHER')
  const pendingStudents = users.filter(u => u.role === 'STUDENT')
  const currentList = activeTab === 'TEACHER' ? pendingTeachers : pendingStudents

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck size={22} className="text-indigo-600 dark:text-indigo-400" />
            Admin Master Control
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">System analytics, access management, and unified registrations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { fetchPendingUsers(); fetchDirectories(); fetchAnalytics(); fetchSettings(); }}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
          >
            <RefreshCcw size={16} className={analyticsLoading ? 'animate-spin' : ''} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Global System Settings */}
      {!parityLoading && (
        <div className="bg-linear-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/40 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
              <BookOpen size={20} className="text-indigo-600 dark:text-indigo-400" />
              Global Academic Cycle Parity
            </h3>
            <p className="text-sm text-indigo-700/80 dark:text-indigo-300/80 max-w-xl mt-1">
              Command the active semesters recognized by the application. ODD maps active rosters to [1st, 3rd, 5th] semesters. EVEN maps to [2nd, 4th, 6th] semesters. Student registrations rigidly sync to this cycle constraint.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <button
               onClick={() => globalParity !== 'ODD' && toggleParity()}
               className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex 1 ${globalParity === 'ODD' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              ODD Cycle
            </button>
            <button
               onClick={() => globalParity !== 'EVEN' && toggleParity()}
               className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex 1 ${globalParity === 'EVEN' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              EVEN Cycle
            </button>
          </div>
        </div>
      )}

      {/* Analytics Summary */}
      {analyticsLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="animate-spin text-indigo-500" size={24} />
        </div>
      ) : analyticsData ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Students" value={analyticsData.stats[0]?.value || 0} subtitle="All departments" icon={Users} color="indigo" />
            <StatCard title="Active Courses" value={analyticsData.stats[1]?.value || 0} subtitle="Current semester" icon={BookOpen} color="violet" />
            <StatCard title="Avg CO Attainment" value={analyticsData.stats[2]?.value || '0.00 / 3.0'} subtitle="Institution wide" icon={TrendingUp} color="emerald" />
            <StatCard title="COs Meeting Target" value={analyticsData.stats[3]?.value || 0} subtitle="Secured outcomes" icon={Award} color="amber" />
          </div>

          {analyticsData.chartData && analyticsData.chartData.length > 0 && (
            <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Institution-Wide CO Attainment</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Target Level (2.0) vs Actual — All Active Courses</p>
              </div>
              <AttainmentChart data={analyticsData.chartData} />
            </div>
          )}
        </div>
      ) : null}

      {/* Master Data Sections */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/60 transition-colors duration-300">
        
        {/* Tab Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 border-b border-slate-200 dark:border-slate-700/60 pb-4">
           <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 custom-scrollbar">
             <button 
               onClick={() => { setActiveTab('PENDING'); setSearchTerm(''); }}
               className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all focus:outline-none ${
                 activeTab === 'PENDING' 
                   ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 shadow-sm' 
                   : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
               }`}
             >
               <ShieldCheck size={18} />
               Pending Approvals
               {users.length > 0 && (
                 <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 px-2 py-0.5 rounded-md text-xs ml-1">
                   {users.length}
                 </span>
               )}
             </button>
             <button 
               onClick={() => { setActiveTab('FACULTY'); setSearchTerm(''); }}
               className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all focus:outline-none ${
                 activeTab === 'FACULTY' 
                   ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 shadow-sm' 
                   : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
               }`}
             >
               <UserCheck size={18} />
               Faculty Directory
             </button>
             <button 
               onClick={() => { setActiveTab('STUDENTS'); setSearchTerm(''); }}
               className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all focus:outline-none ${
                 activeTab === 'STUDENTS' 
                   ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 shadow-sm' 
                   : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
               }`}
             >
               <GraduationCap size={18} />
               Student Directory
             </button>
           </div>
           
           {(activeTab === 'FACULTY' || activeTab === 'STUDENTS') && (
             <div className="flex items-center gap-3 w-full sm:w-auto mt-3 sm:mt-0">
               {activeTab === 'FACULTY' && (
                   <select
                     value={facultyDeptFilter}
                     onChange={(e) => setFacultyDeptFilter(e.target.value)}
                     className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                   >
                     <option value="">All Departments</option>
                     <option value="Unassigned">Unassigned</option>
                     <option value="BCA">BCA</option>
                     <option value="BBA">BBA</option>
                     <option value="BCOM">BCOM</option>
                     <option value="BA">BA</option>
                   </select>
               )}

               {activeTab === 'STUDENTS' && (
                 <>
                   <select
                     value={studentDeptFilter}
                     onChange={(e) => {
                       setStudentDeptFilter(e.target.value)
                       setStudentClassFilter('')
                       setStudentDivFilter('')
                     }}
                     className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                   >
                     <option value="">All Departments</option>
                     <option value="BCA">BCA</option>
                     <option value="BBA">BBA</option>
                     <option value="BCOM">BCOM</option>
                     <option value="BA">BA</option>
                   </select>

                   {studentDeptFilter && (
                     <select
                       value={studentClassFilter}
                       onChange={(e) => {
                         setStudentClassFilter(e.target.value)
                         setStudentDivFilter('')
                       }}
                       className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                     >
                       <option value="">All Classes</option>
                       <option value={`FY${studentDeptFilter}`}>FY{studentDeptFilter}</option>
                       <option value={`SY${studentDeptFilter}`}>SY{studentDeptFilter}</option>
                       <option value={`TY${studentDeptFilter}`}>TY{studentDeptFilter}</option>
                     </select>
                   )}

                   {studentDeptFilter && studentClassFilter && (
                     <select
                       value={studentDivFilter}
                       onChange={(e) => setStudentDivFilter(e.target.value)}
                       className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                     >
                       <option value="">All Divs</option>
                       <option value="A">Div A</option>
                       <option value="B">Div B</option>
                       <option value="C">Div C</option>
                     </select>
                   )}
                 </>
               )}

               <input
                 type="text"
                 placeholder={`Search ${activeTab.toLowerCase()}...`}
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full sm:w-48 px-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
               />
             </div>
           )}
        </div>

        {activeTab === 'PENDING' && (
          <>
            {loading ? (
               <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-500" /></div>
            ) : error ? (
               <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm font-medium"><AlertCircle size={16}/> {error}</div>
            ) : users.length === 0 ? (
               <div className="text-center p-10 flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400 text-sm bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                 <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">
                   <ShieldCheck size={24} className="text-emerald-500" />
                 </div>
                 <p className="font-medium text-slate-600 dark:text-slate-300">All caught up!</p>
                 <p className="text-xs">No pending approvals at this time.</p>
               </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700/60">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-xl">Identify</th>
                      <th className="px-4 py-3">Full Name</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3 rounded-tr-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-700 dark:text-slate-300">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                          {user.role === 'STUDENT' ? `Roll: ${user.rollNo || 'N/A'}` : 'Faculty Entry'}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                          {user.fullName}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'TEACHER' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => handleApprove(user.id, user.role === 'TEACHER')}
                            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                          >
                            Approve Access
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'FACULTY' && (
          <div className="space-y-6">
            {Object.keys(facultyDir)
              .filter(dept => !facultyDeptFilter || dept === facultyDeptFilter)
              .map(dept => {
              const deptFaculty = facultyDir[dept].filter(f => f.fullName.toLowerCase().includes(searchTerm.toLowerCase()));
              if (deptFaculty.length === 0) return null;
              
              return (
                <div key={dept} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div className="bg-slate-100 dark:bg-slate-900/60 px-5 py-3 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Department: {dept}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700/60">
                        <tr>
                          <th className="px-4 py-3">Faculty Name</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">Departments</th>
                          <th className="px-4 py-3">Employment</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-700 dark:text-slate-300">
                        {deptFaculty.map(fac => (
                          <tr key={fac.id} onClick={() => navigate(`/admin/user/${fac.id}`)} className="hover:bg-indigo-50/50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group">
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{fac.fullName}</td>
                            <td className="px-4 py-3 text-slate-500">{fac.email}</td>
                            <td className="px-4 py-3">
                               <div className="flex gap-1 flex-wrap">
                                 {fac.departments && fac.departments.length > 0 ? fac.departments.map(d => (
                                    <span key={d} className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[10px] font-bold">{d}</span>
                                 )) : <span className="text-xs text-slate-400">N/A</span>}
                               </div>
                            </td>
                            <td className="px-4 py-3">
                               <span className={`px-2 py-1 rounded text-[10px] font-bold ${fac.employmentType === 'TEMPORARY' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                                 {fac.employmentType}
                               </span>
                            </td>
                            <td className="px-4 py-3">
                               {fac.isActive ? (
                                 <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">● Active</span>
                               ) : (
                                 <span className="text-red-600 dark:text-red-400 font-bold text-xs">● Expired/Suspended</span>
                               )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'STUDENTS' && (
          <div className="space-y-6">
            {Object.keys(studentDir)
              .filter(dept => !studentDeptFilter || dept === studentDeptFilter)
              .map(dept => (
              <div key={dept} className="space-y-4">
                {Object.keys(studentDir[dept])
                  .filter(cls => !studentClassFilter || cls === studentClassFilter)
                  .map(cls => (
                  <div key={cls} className="space-y-4">
                    {Object.keys(studentDir[dept][cls])
                      .filter(div => !studentDivFilter || div === studentDivFilter)
                      .map(div => {
                      const divStudents = studentDir[dept][cls][div].filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.rollNo.includes(searchTerm));
                      if (divStudents.length === 0) return null;

                      return (
                        <div key={`${dept}-${cls}-${div}`} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                          <div className="bg-slate-100 dark:bg-slate-900/60 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{dept} - {cls} (Div {div})</h3>
                            <span className="text-xs font-semibold text-slate-500 bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">{divStudents.length} Students</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                              <thead className="bg-slate-50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700/60">
                                <tr>
                                  <th className="px-4 py-3">Roll No</th>
                                  <th className="px-4 py-3">Student Name</th>
                                  <th className="px-4 py-3">Current Sem</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-700 dark:text-slate-300">
                                {divStudents.map(stud => (
                                  <tr key={stud.id} onClick={() => navigate(`/admin/user/${stud.id}`)} className="hover:bg-indigo-50/50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group">
                                    <td className="px-4 py-3 font-medium text-slate-500 group-hover:text-indigo-500">{stud.rollNo}</td>
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{stud.name}</td>
                                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                      <select
                                        value={stud.currentSemester}
                                        onChange={async (e) => {
                                          const newSem = parseInt(e.target.value);
                                          try {
                                            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
                                            await axios.put(`http://localhost:5000/api/admin/users/${stud.id}`, { currentSemester: newSem }, config);
                                            // Soft update UI by forcing a re-fetch since deep nested state is hard to update manually
                                            fetchDirectories();
                                            showAlert(`Semester updated to ${newSem} for ${stud.name}`, 'success');
                                          } catch (err) {
                                            showAlert('Failed to update semester', 'error');
                                          }
                                        }}
                                        className="text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                      >
                                        {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Sem {s}</option>)}
                                      </select>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
