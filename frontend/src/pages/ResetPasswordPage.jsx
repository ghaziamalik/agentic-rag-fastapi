import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Lock, KeyRound, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { authApi } from '../api/client'
import ThemeToggle from '../components/ThemeToggle'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const initialToken =
    location.state?.token ||
    new URLSearchParams(location.search).get('token') ||
    ''

  const [token, setToken] = useState(initialToken)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!token) return setError('Reset token is required.')
    if (!newPassword) return setError('New password is required.')
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.')
    if (newPassword !== confirmPassword) return setError('Passwords do not match.')

    setLoading(true)
    try {
      await authApi.resetPassword(token, newPassword)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed. Token may be expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden grid-bg flex items-center justify-center px-4">
      <div className="glow-orb w-[500px] h-[500px] bg-emerald-500/15 -top-40 -left-40" />
      <div className="glow-orb w-[500px] h-[500px] bg-blue-500/10 -bottom-40 -right-40" />

      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle variant="icon" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] animate-fade-in">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-fog-400 hover:text-white text-sm font-medium mb-8 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to login
        </Link>

        <div className="mb-8">
          <div className="inline-flex w-11 h-11 rounded-xl bg-emerald-500 items-center justify-center text-white shadow-glow-accent mb-5">
            <Lock size={20} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-1.5">
            Reset password
          </h1>
          <p className="text-fog-400 text-[15px]">
            Choose a strong new password for your account
          </p>
        </div>

        <div className="surface rounded-2xl p-7">
          {success ? (
            <div className="text-center py-6">
              <div className="inline-flex w-14 h-14 rounded-full bg-success/15 border border-success/40 items-center justify-center mb-4">
                <CheckCircle2 size={26} className="text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Password reset!</h2>
              <p className="text-fog-400 text-sm mb-5">Redirecting you to login...</p>
              <Link
                to="/login"
                className="btn-accent inline-block px-5 py-2.5 rounded-lg font-semibold text-sm"
              >
                Go to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 rounded-lg text-rose-300 text-[13px]">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-fog-300 mb-1.5">
                  Reset token
                </label>
                <div className="relative">
                  <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fog-500" />
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste your reset token"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-ink-900 border border-ink-700 rounded-lg text-white text-xs placeholder-fog-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-fog-300 mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fog-500" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-ink-900 border border-ink-700 rounded-lg text-white text-sm placeholder-fog-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-fog-300 mb-1.5">
                  Confirm new password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fog-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-ink-900 border border-ink-700 rounded-lg text-white text-sm placeholder-fog-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-accent w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset password'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}