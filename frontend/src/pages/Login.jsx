import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import axios from 'axios'
import BridgifyLogo from '../assets/Logo.png'

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  // Registration specific fields
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('TEACHER') // Default
  const [department, setDepartment] = useState('BCA') // Student fallback
  const [phoneNo, setPhoneNo] = useState('')
  const [rollNo, setRollNo] = useState('')
  const [studentClass, setStudentClass] = useState('')
  const [division, setDivision] = useState('')
  const [currentSemester, setCurrentSemester] = useState('1')
  const [activeParity, setActiveParity] = useState('ODD')
  
  // Faculty Advanced Role fields
  const [departments, setDepartments] = useState(['BCA'])
  const [employmentType, setEmploymentType] = useState('PERMANENT')
  const [assignedSemester, setAssignedSemester] = useState('1')
  const [assignedCourseIds, setAssignedCourseIds] = useState([])
  const [availableCourses, setAvailableCourses] = useState([])

  useEffect(() => {
    const fetchP = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/admin/settings')
        if (res.data?.activeParity) setActiveParity(res.data.activeParity)
      } catch (e) {
        console.error('Settings skip', e)
      }
    }
    fetchP()
  }, [])

  useEffect(() => {
    setCurrentSemester(activeParity === 'ODD' ? '1' : '2')
  }, [activeParity])

  const availableSemesters = activeParity === 'ODD' ? [1, 3, 5] : [2, 4, 6]

  useEffect(() => {
    if (role === 'TEACHER' && employmentType === 'TEMPORARY' && departments.length > 0) {
      const fetchTempCourses = async () => {
        try {
          const promises = departments.map(dep => 
            axios.get(`http://localhost:5000/api/courses?department=${dep}&semester=${assignedSemester}`)
          )
          const results = await Promise.all(promises)
          const flatCourses = results.flatMap(r => r.data)
          setAvailableCourses(flatCourses)
        } catch (e) {
          console.error('Failed to load courses for temp faculty', e)
        }
      }
      fetchTempCourses()
    }
  }, [role, employmentType, departments, assignedSemester])

  const handleDepartmentToggle = (dept) => {
    setDepartments(prev => 
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    )
  }

  const handleCourseToggle = (courseId) => {
    setAssignedCourseIds(prev => 
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    )
  }

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    if (e) e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      })

      // Store token and redirect
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      
      // Inject token into future Axios requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
      
      navigate('/') // Routing logic handles Admin/Teacher/Student paths automatically later
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || 'Failed to authenticate. Check credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const payload = { fullName, email, password, role, phoneNo }
      if (role === 'STUDENT') {
        payload.department = department // Native fallback
        payload.rollNo = rollNo
        payload.className = studentClass
        payload.division = division
        payload.currentSemester = parseInt(currentSemester, 10)
      } else {
        payload.departments = departments
        payload.employmentType = employmentType
        if (employmentType === 'TEMPORARY') {
          payload.assignedSemester = parseInt(assignedSemester, 10)
          payload.assignedCourseIds = assignedCourseIds.join(',')
        }
      }

      await axios.post('http://localhost:5000/api/auth/register', payload)
      // Auto-login after registration
      await handleLogin()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || 'Failed to register account.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img className="h-16 w-auto" src={BridgifyLogo} alt="Bridgify OBE" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white">
          Access your dashboard
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Sign in to manage Outcome-Based Education metrics.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow-xl border border-slate-200 dark:border-slate-700 sm:rounded-2xl sm:px-10 transition-colors duration-300">
          
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-start gap-3 text-sm font-medium">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={isRegistering ? handleRegister : handleLogin}>
            
            {isRegistering && (
              <>
                <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl mb-6">
                  {['TEACHER', 'STUDENT'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors ${
                        role === r 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {r.charAt(0) + r.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-2 block w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-900 dark:text-white sm:text-sm"
                    placeholder="John Doe"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Email address
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-900 dark:text-white sm:text-sm transition-colors duration-200"
                  placeholder="name@college.edu"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-900 dark:text-white sm:text-sm transition-colors duration-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-indigo-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {isRegistering && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNo}
                    onChange={(e) => setPhoneNo(e.target.value)}
                    className="mt-2 block w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-900 dark:text-white sm:text-sm"
                    placeholder="+91 9876543210"
                  />
                </div>

                {role === 'STUDENT' ? (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Department
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="mt-2 block w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-900 dark:text-white sm:text-sm"
                    >
                      <option value="BCA">BCA</option>
                      <option value="BBA">BBA</option>
                      <option value="BCOM">BCOM</option>
                      <option value="BA">BA</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Departments (Multi-Select)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['BCA', 'BBA', 'BCOM', 'BA'].map(dept => (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => handleDepartmentToggle(dept)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ring-1 ${
                              departments.includes(dept) 
                              ? 'bg-indigo-500 text-white ring-indigo-500 shadow-md' 
                              : 'bg-white dark:bg-slate-800 text-slate-500 ring-slate-200 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                            }`}
                          >
                            {dept}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Employment Type
                      </label>
                      <select
                        value={employmentType}
                        onChange={(e) => setEmploymentType(e.target.value)}
                        className="mt-2 block w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-900 dark:text-white sm:text-sm"
                      >
                        <option value="PERMANENT">Permanent Faculty</option>
                        <option value="TEMPORARY">Temporary / Visiting</option>
                      </select>
                    </div>

                    {employmentType === 'TEMPORARY' && (
                      <div className="space-y-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                        <div>
                          <label className="block text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                            Active Assignment Semester
                          </label>
                          <select
                            value={assignedSemester}
                            onChange={(e) => setAssignedSemester(e.target.value)}
                            className="mt-1.5 block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white sm:text-xs"
                          >
                            {availableSemesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-2">
                            Assigned Courses
                          </label>
                          {availableCourses.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No courses found for selected departments & semester.</p>
                          ) : (
                            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                              {availableCourses.map(course => (
                                <label key={course.id} className="flex items-start gap-2 cursor-pointer p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-md transition-colors">
                                  <input 
                                    type="checkbox" 
                                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    checked={assignedCourseIds.includes(course.id)}
                                    onChange={() => handleCourseToggle(course.id)}
                                  />
                                  <span className="text-xs text-slate-700 dark:text-slate-300 leading-tight">
                                    <strong className="text-slate-900 dark:text-white">{course.code}</strong> {course.name}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {role === 'STUDENT' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Roll No</label>
                      <input
                        type="text"
                        required
                        value={rollNo}
                        onChange={(e) => setRollNo(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-900 dark:text-white sm:text-sm"
                        placeholder="101"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Class</label>
                      <input
                        type="text"
                        required
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-900 dark:text-white sm:text-sm"
                        placeholder="FYBCA"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Division</label>
                      <input
                        type="text"
                        required
                        value={division}
                        onChange={(e) => setDivision(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-900 dark:text-white sm:text-sm"
                        placeholder="A"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Semester</label>
                      <select
                        value={currentSemester}
                        onChange={(e) => setCurrentSemester(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-900 dark:text-white sm:text-sm"
                      >
                        {[1, 2, 3, 4, 5, 6].map(sem => (
                          <option key={sem} value={sem} className={!availableSemesters.includes(sem) ? 'hidden' : ''}>{sem}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-[15px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 active:scale-[0.98] transition-all"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (isRegistering ? 'Create Account' : 'Sign in')}
              </button>
            </div>
            
            <div className="text-center mt-4">
               <button
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
               >
                  {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Register"}
               </button>
            </div>
          </form>
          
          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
            Bridgify Central Authentication Service for College Portals
          </div>
        </div>
      </div>
    </div>
  )
}
