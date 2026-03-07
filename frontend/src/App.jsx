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
import Login from './pages/Login'

// JWT Auth Guard Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

// Protected Layout Container
const ProtectedLayout = ({ children }) => {
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
  // Inject saved token into Axios on app load
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
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
              <ProtectedLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/classes" element={<Classes />} />
                  <Route path="/upload" element={<Upload />} />
                  <Route path="/exams" element={<Exams />} />
                  <Route path="/marks" element={<MarksEntry />} />
                </Routes>
              </ProtectedLayout>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
