import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { authApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ThemeToggle'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }
    setLoading(true)
    try {
      const res = await authApi.login({ email, password })
      login(res.data.access_token, {
        user_id: res.data.user_id,
        email: res.data.email,
        name: res.data.name,
      })
      navigate('/chat')
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Login failed. Please try again.'
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError('Cannot reach the server. Make sure the backend is running on port 8000.')
      } else {
        setError(detail)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden grid-bg bg-ink-950 flex items-center justify-center px-4">
      <div className="glow-orb w-[500px] h-[500px] bg-emerald-500/15 -top-40 -left-40" />
      <div className="glow-orb w-[500px] h-[500px] bg-blue-500/10 -bottom-40 -right-40" />

      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle variant="icon" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] animate-fade-in">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-fog-400 hover:text-white text-sm font-medium mb-8 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to home
        </Link>

        <div className="mb-8">
          <div className="inline-flex w-11 h-11 rounded-xl bg-emerald-500 items-center justify-center text-white font-black text-lg mb-5 shadow-glow-accent">
            ◆
          </div>
          <h1 className="font-display text-3xl font-black text-white tracking-[-0.03em] mb-1.5">
            Welcome back
          </h1>
          <p className="text-fog-400 text-[15px]">
            Sign in to continue to your workspace
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

            <div>
              <label className="block text-[13px] font-medium text-fog-300 mb-1.5">
                Email
              </label>
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[13px] font-medium text-fog-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[12px] text-accent-light hover:text-accent font-medium transition-colors"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fog-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-ink-900 border border-ink-700 rounded-lg text-white text-sm placeholder-fog-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fog-500 hover:text-fog-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
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
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-ink-700 text-center text-[13px] text-fog-400">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-accent-light hover:text-accent font-semibold transition-colors"
            >
              Create one
            </Link>
          </div>
        </div>

        <p className="text-center text-[11px] text-fog-500 mt-6">
          Protected by JWT authentication · Your data is isolated per account
        </p>
      </div>
    </div>
  )
}