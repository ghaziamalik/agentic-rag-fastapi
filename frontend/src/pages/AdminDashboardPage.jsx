import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Users, FileText, MessageSquare, Database,
  Search, ChevronDown, Activity, Server, Clock,
  User, Folder, TrendingUp, Filter, X, Mail,
} from 'lucide-react'
import api from '../api/client'
import ThemeToggle from '../components/ThemeToggle'

export default function AdminDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('users') // 'users' | 'documents' | 'sessions'
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await api.get('/admin/dashboard')
      setData(res.data)
      setError('')
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (iso) => {
    if (!iso) return '—'
    try {
      const d = new Date(iso.replace(' ', 'T') + 'Z')
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return iso
    }
  }

  const formatUptime = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return `${h}h ${m}m`
  }

  // Filtered lists
  const filteredUsers = data?.users?.filter((u) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
  }) || []

  const filteredDocs = data?.documents?.filter((d) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      d.doc_name.toLowerCase().includes(q) ||
      d.user_email.toLowerCase().includes(q)
    )
  }) || []

  const filteredSessions = data?.sessions?.filter((s) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      s.title.toLowerCase().includes(q) ||
      s.user_email.toLowerCase().includes(q)
    )
  }) || []

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-ink-950">
        <div className="text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-emerald-500 items-center justify-center text-white font-black text-3xl shadow-glow-accent mb-4 animate-pulse">
            ◆
          </div>
          <p className="text-fog-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink-950 grid-bg">
      {/* ═══ Header ═══ */}
      <header className="border-b border-ink-800 sticky top-0 z-20 backdrop-blur-lg bg-ink-950/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/chat"
              className="text-fog-500 hover:text-white transition-colors p-1.5 hover:bg-ink-800 rounded-lg"
              title="Back to chat"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-black text-sm shadow-glow-accent">
              ◆
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-white tracking-[-0.02em]">
                Admin Dashboard
              </h1>
              <p className="text-[11px] text-fog-500">
                Platform overview · Users · Documents · Sessions
              </p>
            </div>
          </div>
          <ThemeToggle variant="icon" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 rounded-xl text-rose-300 text-sm">
            <X size={15} />
            {error}
          </div>
        )}

        {/* ═══ Top Stats ═══ */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <BigStat
              icon={Users}
              label="Total Users"
              value={data?.stats?.total_users ?? 0}
              color="#10b981"
              sub="Registered accounts"
            />
            <BigStat
              icon={FileText}
              label="Documents"
              value={data?.stats?.total_documents ?? 0}
              color="#3b82f6"
              sub="PDFs uploaded"
            />
            <BigStat
              icon={MessageSquare}
              label="Sessions"
              value={data?.stats?.total_sessions ?? 0}
              color="#8b5cf6"
              sub="Chat conversations"
            />
            <BigStat
              icon={Activity}
              label="Messages"
              value={data?.stats?.total_messages ?? 0}
              color="#f59e0b"
              sub="Exchanged in chats"
            />
          </div>
        </section>

        {/* ═══ System Status Bar ═══ */}
        <section>
          <div className="surface rounded-xl px-5 py-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-6 flex-wrap">
              <StatusItem
                icon={Server}
                label="Vector Store"
                value={data?.stats?.vector_store_ready ? 'Ready' : 'Down'}
                ok={data?.stats?.vector_store_ready}
              />
              <StatusItem
                icon={Clock}
                label="Uptime"
                value={formatUptime(data?.stats?.uptime_seconds || 0)}
                ok
              />
              <StatusItem
                icon={TrendingUp}
                label="Avg docs/user"
                value={
                  data?.stats?.total_users > 0
                    ? (
                        data.stats.total_documents / data.stats.total_users
                      ).toFixed(1)
                    : '0'
                }
                ok
              />
            </div>
          </div>
        </section>

        {/* ═══ Tabs + Search ═══ */}
        <section>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-1 bg-ink-900 border border-ink-800 rounded-xl p-1">
              <TabButton
                active={activeTab === 'users'}
                onClick={() => setActiveTab('users')}
                icon={Users}
                label="Users"
                count={filteredUsers.length}
              />
              <TabButton
                active={activeTab === 'documents'}
                onClick={() => setActiveTab('documents')}
                icon={FileText}
                label="Documents"
                count={filteredDocs.length}
              />
              <TabButton
                active={activeTab === 'sessions'}
                onClick={() => setActiveTab('sessions')}
                icon={MessageSquare}
                label="Sessions"
                count={filteredSessions.length}
              />
            </div>

            <div className="relative flex-1 max-w-sm">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-fog-500"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or title..."
                className="w-full pl-9 pr-9 py-2 bg-ink-900 border border-ink-800 rounded-lg text-white text-[13px] placeholder-fog-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fog-500 hover:text-white transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* ═══ Content ═══ */}
          <div className="surface rounded-xl overflow-hidden">
            {activeTab === 'users' && (
              <UsersTable users={filteredUsers} formatDate={formatDate} />
            )}
            {activeTab === 'documents' && (
              <DocumentsTable docs={filteredDocs} formatDate={formatDate} />
            )}
            {activeTab === 'sessions' && (
              <SessionsTable sessions={filteredSessions} formatDate={formatDate} />
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

// ═════════════════════════════════════════════════════════
// Sub-components
// ═════════════════════════════════════════════════════════

function BigStat({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="surface rounded-xl p-5 hover:border-fog-700 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
        >
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <div className="font-display text-3xl font-black text-white tracking-[-0.03em] mb-1">
        {value}
      </div>
      <div className="text-[11px] font-bold text-fog-500 uppercase tracking-wider">
        {label}
      </div>
      <div className="text-[11px] text-fog-600 mt-1">{sub}</div>
    </div>
  )
}

function StatusItem({ icon: Icon, label, value, ok }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className={ok ? 'text-emerald-400' : 'text-rose-400'} />
      <div>
        <div className="text-[10px] font-bold text-fog-500 uppercase tracking-wider">
          {label}
        </div>
        <div className="text-[13px] font-mono text-white">{value}</div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
        active
          ? 'bg-emerald-500 text-white shadow-glow-accent'
          : 'text-fog-400 hover:text-white hover:bg-ink-800'
      }`}
    >
      <Icon size={14} />
      {label}
      <span
        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
          active ? 'bg-white/20' : 'bg-ink-800'
        }`}
      >
        {count}
      </span>
    </button>
  )
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="p-12 text-center">
      <Icon size={32} className="text-fog-600 mx-auto mb-3" />
      <p className="text-fog-500 text-sm">{message}</p>
    </div>
  )
}

// ─── USERS TABLE ───
function UsersTable({ users, formatDate }) {
  if (users.length === 0) {
    return <EmptyState icon={Users} message="No users found" />
  }

  return (
    <table className="w-full text-left">
      <thead className="bg-ink-800/50 border-b border-ink-800">
        <tr>
          <Th>User</Th>
          <Th>Email</Th>
          <Th align="right">Docs</Th>
          <Th align="right">Sessions</Th>
          <Th align="right">Messages</Th>
          <Th align="right">Joined</Th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr
            key={u.id}
            className="border-b border-ink-800/50 last:border-0 hover:bg-ink-800/30 transition-colors"
          >
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(u.name || u.email || '?')[0].toUpperCase()}
                </div>
                <span className="font-display text-[13px] font-semibold text-white">
                  {u.name}
                </span>
              </div>
            </td>
            <td className="px-4 py-3">
              <span className="flex items-center gap-2 text-[12px] text-fog-400 font-mono">
                <Mail size={11} className="text-fog-500" />
                {u.email}
              </span>
            </td>
            <td className="px-4 py-3 text-right">
              <Pill value={u.doc_count} color="#3b82f6" />
            </td>
            <td className="px-4 py-3 text-right">
              <Pill value={u.session_count} color="#8b5cf6" />
            </td>
            <td className="px-4 py-3 text-right">
              <Pill value={u.message_count} color="#f59e0b" />
            </td>
            <td className="px-4 py-3 text-right text-[11px] text-fog-500 font-mono">
              {formatDate(u.created_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── DOCUMENTS TABLE ───
function DocumentsTable({ docs }) {
  if (docs.length === 0) {
    return <EmptyState icon={FileText} message="No documents uploaded yet" />
  }

  return (
    <table className="w-full text-left">
      <thead className="bg-ink-800/50 border-b border-ink-800">
        <tr>
          <Th>Document</Th>
          <Th>Owner</Th>
          <Th align="right">User ID</Th>
        </tr>
      </thead>
      <tbody>
        {docs.map((d) => (
          <tr
            key={d.id}
            className="border-b border-ink-800/50 last:border-0 hover:bg-ink-800/30 transition-colors"
          >
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-accent flex-shrink-0" />
                <span className="text-[13px] text-white font-medium truncate max-w-[400px]" title={d.doc_name}>
                  {d.doc_name}
                </span>
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  {(d.user_name || d.user_email || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] text-white font-semibold truncate">
                    {d.user_name}
                  </div>
                  <div className="text-[10px] text-fog-500 font-mono truncate">
                    {d.user_email}
                  </div>
                </div>
              </div>
            </td>
            <td className="px-4 py-3 text-right text-[11px] text-fog-500 font-mono">
              #{d.user_id}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── SESSIONS TABLE ───
function SessionsTable({ sessions, formatDate }) {
  if (sessions.length === 0) {
    return <EmptyState icon={MessageSquare} message="No sessions yet" />
  }

  return (
    <table className="w-full text-left">
      <thead className="bg-ink-800/50 border-b border-ink-800">
        <tr>
          <Th>Title</Th>
          <Th>Owner</Th>
          <Th align="right">Messages</Th>
          <Th align="right">Created</Th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((s) => (
          <tr
            key={s.id}
            className="border-b border-ink-800/50 last:border-0 hover:bg-ink-800/30 transition-colors"
          >
            <td className="px-4 py-3">
              <span className="text-[13px] text-white font-medium truncate max-w-[400px]" title={s.title}>
                {s.title}
              </span>
            </td>
            <td className="px-4 py-3">
              <span className="text-[12px] text-fog-400 font-mono">
                {s.user_email}
              </span>
            </td>
            <td className="px-4 py-3 text-right">
              <Pill value={s.message_count} color="#8b5cf6" />
            </td>
            <td className="px-4 py-3 text-right text-[11px] text-fog-500 font-mono">
              {formatDate(s.timestamp)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Small helpers ───
function Th({ children, align = 'left' }) {
  return (
    <th
      className={`px-4 py-3 text-[10px] font-bold text-fog-500 uppercase tracking-wider text-${align}`}
    >
      {children}
    </th>
  )
}

function Pill({ value, color }) {
  return (
    <span
      className="inline-block text-[11px] font-mono font-bold px-2 py-0.5 rounded-md"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}
    >
      {value}
    </span>
  )
}