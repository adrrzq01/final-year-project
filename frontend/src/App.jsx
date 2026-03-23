import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import axios from 'axios'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Classes from './pages/Classes'
import Upload from './pages/Upload'
import Exams from './pages/Exams'
import MarksEntry from './pages/MarksEntry'
import POMapping from './pages/POMapping'
import Survey from './pages/Survey'
import Reports from './pages/Reports'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import StudentDashboard from './pages/StudentDashboard'
import PendingVerification from './pages/PendingVerification'
import { SemesterProvider } from './context/SemesterContext'

// JWT Auth Guard Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

// Role-Based Dashboard Router
const IndexDashboard = () => {
  const userString = localStorage.getItem('user')
  const user = userString ? JSON.parse(userString) : null

  if (user?.role === 'ADMIN') return <AdminDashboard />
  if (user?.role === 'STUDENT') return <StudentDashboard />
  
  // Default to Teacher Dashboard (which handles its own unapproved lock screen)
  return <Dashboard />
}

// Protected Layout Container
const ProtectedLayout = ({ children }) => {
  const userString = localStorage.getItem('user')
  const user = userString ? JSON.parse(userString) : null

  if (user && user.role !== 'ADMIN' && user.isApproved === false) {
    return <PendingVerification />
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

function App() {
  // Inject saved token into Axios on app load & handle 401 expired tokens globally
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }

    // Add interceptor to auto-kick user to login if their token naturally expires
    const interceptor = axios.interceptors.response.use(
      (res) => res,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )

    return () => axios.interceptors.response.eject(interceptor)
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Application Routes */}
        <Route 
          path="/*" 
          element={
            <ProtectedRoute>
              <SemesterProvider>
                <ProtectedLayout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<IndexDashboard />} />
                    <Route path="/classes" element={<Classes />} />
                    <Route path="/upload" element={<Upload />} />
                    <Route path="/exams" element={<Exams />} />
                    <Route path="/marks" element={<MarksEntry />} />
                    <Route path="/mapping" element={<POMapping />} />
                    <Route path="/survey" element={<Survey />} />
                    <Route path="/reports" element={<Reports />} />
                  </Routes>
                </ProtectedLayout>
              </SemesterProvider>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
