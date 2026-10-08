import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, ArrowLeft, Check } from 'lucide-react'
import { authApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ThemeToggle'

export default function SignupPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordChecks = [
    { label: 'At least 6 characters', valid: password.length >= 6 },
    { label: 'Passwords match', valid: password && password === confirmPassword },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Email and password are required.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const res = await authApi.signup({ email, password, name })
      login(res.data.access_token, {
        user_id: res.data.user_id,
        email: res.data.email,
        name: res.data.name,
      })
      navigate('/chat')
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Signup failed. Please try again.'
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
    <div className="min-h-screen relative overflow-hidden grid-bg bg-ink-950 flex items-center justify-center px-4 py-12">
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
            Create your account
          </h1>
          <p className="text-fog-400 text-[15px]">
            Start chatting with your documents in 30 seconds
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
                Name <span className="text-fog-500 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fog-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-ink-900 border border-ink-700 rounded-lg text-white text-sm placeholder-fog-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                />
              </div>
            </div>

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

            <div>
              <label className="block text-[13px] font-medium text-fog-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fog-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
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

            <div>
              <label className="block text-[13px] font-medium text-fog-300 mb-1.5">Confirm password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fog-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-ink-900 border border-ink-700 rounded-lg text-white text-sm placeholder-fog-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                />
              </div>
            </div>

            {(password || confirmPassword) && (
              <div className="space-y-1.5 pt-1">
                {passwordChecks.map((c) => (
                  <div
                    key={c.label}
                    className={`flex items-center gap-2 text-[12px] transition-colors ${
                      c.valid ? 'text-emerald-400' : 'text-fog-500'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
                      c.valid ? 'bg-emerald-500' : 'bg-ink-700'
                    }`}>
                      {c.valid && <Check size={9} className="text-white" strokeWidth={3} />}
                    </div>
                    {c.label}
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-ink-700 text-center text-[13px] text-fog-400">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-light hover:text-accent font-semibold transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}