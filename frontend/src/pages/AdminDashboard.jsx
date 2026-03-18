import { useState, useEffect } from 'react'
import axios from 'axios'
import { ShieldCheck, UserCheck, AlertCircle, Loader2 } from 'lucide-react'

export default function AdminDashboard() {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPendingTeachers()
  }, [])

  const fetchPendingTeachers = async () => {
    try {
      setLoading(true)
      // We need a route to fetch unapproved teachers, but for now we'll fetch all users and filter
      // Alternatively, we should build a quick backend route if it doesn't exist.
      // Let's assume we build a quick GET /api/admin/pending-teachers or just fetch all users.
      // For simplicity in this step, I'll fetch `/api/users` if we had it. Since we don't, I will use a dummy state or assume we'll add the endpoint next.
      
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      const res = await axios.get('http://localhost:5000/api/admin/pending-teachers', config)
      setTeachers(res.data)
    } catch (err) {
      console.error(err)
      setError('Failed to load pending teachers. Endpoint may not exist yet.')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      await axios.put(`http://localhost:5000/api/admin/approve-teacher/${id}`, {}, config)
      setTeachers(prev => prev.filter(t => t.id !== id))
      alert('Teacher approved successfully!')
    } catch (err) {
      alert('Failed to approve teacher')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck size={22} className="text-indigo-600 dark:text-indigo-400" />
            Admin Master Control
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage system access and approve faculty registrations.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/60 transition-colors duration-300">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <UserCheck size={18} className="text-emerald-500" />
          Pending Faculty Approvals
        </h3>

        {loading ? (
           <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-500" /></div>
        ) : error ? (
           <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm font-medium"><AlertCircle size={16}/> {error}</div>
        ) : teachers.length === 0 ? (
           <div className="text-center p-8 text-slate-500 dark:text-slate-400 text-sm bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
             No pending teacher approvals at this time.
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700/60">
                <tr>
                  <th className="px-4 py-3 rounded-tl-xl">Full Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 rounded-tr-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-700 dark:text-slate-300">
                {teachers.map(teacher => (
                  <tr key={teacher.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{teacher.fullName}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{teacher.email}</td>
                    <td className="px-4 py-3">
                      <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-1 rounded text-xs font-bold">
                        {teacher.department}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => handleApprove(teacher.id)}
                        className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
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
      </div>
    </div>
  )
}
