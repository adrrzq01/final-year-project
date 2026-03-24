import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react'
import axios from 'axios'
import BridgifyLogo from '../assets/Logo.png'

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Registration specific fields
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('TEACHER') // Default
  const [department, setDepartment] = useState('BCA')
  const [phoneNo, setPhoneNo] = useState('')
  const [className, setClassName] = useState('')
  const [division, setDivision] = useState('')
  const [currentSemester, setCurrentSemester] = useState('1')
  const [activeParity, setActiveParity] = useState('ODD')

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
      const payload = { fullName, email, password, role, department, phoneNo }
      if (role === 'STUDENT') {
        payload.rollNo = rollNo
        payload.className = className
        payload.division = division
        payload.currentSemester = parseInt(currentSemester, 10)
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
                <div className="flex justify-center gap-2 mb-6">
                  {['TEACHER', 'STUDENT', 'ADMIN'].map((r) => (
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
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-900 dark:text-white sm:text-sm transition-colors duration-200"
                  placeholder="••••••••"
                />
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
                    <option value="IT">IT Administration</option>
                  </select>
                </div>

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
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
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
