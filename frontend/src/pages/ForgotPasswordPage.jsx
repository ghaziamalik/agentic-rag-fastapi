import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { authApi } from '../api/client'
import ThemeToggle from '../components/ThemeToggle'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!email) {
      setError('Please enter your email.')
      return
    }
    setLoading(true)
    try {
      const res = await authApi.forgotPassword(email)
      const msg = res.data.message || ''
      if (msg.startsWith('DEV_TOKEN:')) {
        const token = msg.replace('DEV_TOKEN:', '')
        navigate('/reset-password', { state: { token } })
      } else {
        setSuccess('If that email exists, a reset link has been sent.')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
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
            <Mail size={20} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-1.5">
            Forgot password?
          </h1>
          <p className="text-fog-400 text-[15px]">
            We'll generate a reset token for your account
          </p>
        </div>

        <div className="surface rounded-2xl p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 rounded-lg text-rose-300 text-[13px]">
                <AlertCircle size={15} className="flex-shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded-lg text-emerald-300 text-[13px]">
                <CheckCircle2 size={15} className="flex-shrink-0" />
                {success}
              </div>
            )}

            <div>
              <label className="block text-[13px] font-medium text-fog-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fog-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
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
                  Generating token...
                </>
              ) : (
                'Send reset token'
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-ink-700 text-center text-[13px] text-fog-400">
            Remembered it?{' '}
            <Link to="/login" className="text-accent-light hover:text-accent font-semibold transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}