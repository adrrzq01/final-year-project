import { useState } from 'react'
import { User, Lock, Eye, EyeOff, Save, Shield, CheckCircle2, AlertCircle } from 'lucide-react'
import axios from 'axios'
import { useAlert } from '../context/AlertContext'

export default function Profile() {
  const { showAlert } = useAlert()

  const userString = localStorage.getItem('user')
  const user = userString ? JSON.parse(userString) : null

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  const passwordStrength = () => {
    if (!newPassword) return null
    if (newPassword.length < 6) return { label: 'Too Short', color: 'text-rose-500', bg: 'bg-rose-500', width: '25%' }
    if (newPassword.length < 8) return { label: 'Weak', color: 'text-amber-500', bg: 'bg-amber-500', width: '50%' }
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) return { label: 'Fair', color: 'text-blue-500', bg: 'bg-blue-500', width: '75%' }
    return { label: 'Strong', color: 'text-emerald-500', bg: 'bg-emerald-500', width: '100%' }
  }

  const strength = passwordStrength()

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!oldPassword || !newPassword || !confirmPassword) return showAlert('All fields are required.', 'warning')
    if (newPassword !== confirmPassword) return showAlert('New passwords do not match.', 'error')
    if (newPassword.length < 6) return showAlert('Password must be at least 6 characters.', 'error')
    if (newPassword === oldPassword) return showAlert('New password must be different from the current one.', 'warning')

    setSaving(true)
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      await axios.put('http://localhost:5000/api/auth/change-password', { oldPassword, newPassword }, config)
      showAlert('Password changed successfully!', 'success')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      showAlert(err.response?.data?.error || 'Failed to change password.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const roleColors = {
    ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    TEACHER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    STUDENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Profile Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 pt-8 pb-14 relative">
          <h2 className="text-white font-bold text-xl">My Profile</h2>
          <p className="text-indigo-200 text-sm mt-1">Manage your account information</p>
        </div>
        <div className="px-6 pb-6 -mt-8 relative">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border-4 border-white dark:border-slate-800 flex items-center justify-center mb-4">
            <User size={28} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{user?.name || 'User'}</h3>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${roleColors[user?.role] || ''}`}>
                {user?.role}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-1">Email</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">{user?.email || '—'}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-1">Department</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">{user?.department || '—'}</p>
              </div>
              {user?.rollNo && (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-1">Roll No</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{user.rollNo}</p>
                </div>
              )}
              {user?.className && (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-1">Class</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{user.className} {user.division ? `- ${user.division}` : ''}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700/60">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <Lock size={18} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Change Password</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Keep your account secure with a strong password</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Old Password */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
              />
              <button type="button" onClick={() => setShowOld(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
              />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {strength && (
              <div className="mt-2 space-y-1">
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full ${strength.bg} rounded-full transition-all duration-500`} style={{ width: strength.width }} />
                </div>
                <p className={`text-xs font-bold ${strength.color}`}>{strength.label}</p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={`w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-900/50 border rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all ${
                  confirmPassword && newPassword !== confirmPassword
                    ? 'border-rose-400 dark:border-rose-600'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {confirmPassword && newPassword === confirmPassword && (
                <CheckCircle2 size={14} className="absolute right-10 top-1/2 -translate-y-1/2 text-emerald-500" />
              )}
              {confirmPassword && newPassword !== confirmPassword && (
                <AlertCircle size={14} className="absolute right-10 top-1/2 -translate-y-1/2 text-rose-500" />
              )}
            </div>
          </div>

          {/* Security tip */}
          <div className="flex items-start gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl">
            <Shield size={14} className="text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
              Use a mix of uppercase letters, numbers, and symbols. Avoid reusing previous passwords.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/30 active:scale-95 disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
