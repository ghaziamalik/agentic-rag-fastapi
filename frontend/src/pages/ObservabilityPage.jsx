import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Activity, Database, Cpu, Gauge, Zap,
  FileText, BarChart3, Clock, CheckCircle2, AlertCircle,
  Layers, Server, Target, Users, Home,
} from 'lucide-react'
import api from '../api/client'
import ThemeToggle from '../components/ThemeToggle'

export default function ObservabilityPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(new Date())

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const res = await api.get('/observability')
      setData(res.data)
      setLastRefresh(new Date())
      setError('')
    } catch (e) {
      setError('Observability endpoint not available. Add /observability to backend.')
      setData(generateMockData())
    } finally {
      setLoading(false)
    }
  }

  const generateMockData = () => ({
    system: {
      status: 'healthy',
      uptime_seconds: 3600,
      vector_store_ready: true,
      docs_indexed: 3,
      total_sessions: 5,
      total_messages: 32,
    },
    models: [
      {
        name: 'Llama 3.3 70B',
        role: 'LLM',
        provider: 'Groq',
        latency_ms: 850,
        status: 'active',
      },
      {
        name: 'all-MiniLM-L6-v2',
        role: 'Embeddings',
        provider: 'Local',
        latency_ms: 45,
        status: 'active',
      },
      {
        name: 'bge-reranker-base',
        role: 'Reranker',
        provider: 'Local',
        latency_ms: 320,
        status: 'active',
      },
    ],
    retrieval: {
      total_queries: 47,
      avg_candidates: 12,
      avg_reranked: 4,
      avg_latency_ms: 1250,
    },
    pipeline: [
      { stage: 'Route', count: 47, avg_ms: 120, success: 47 },
      { stage: 'Retrieve', count: 47, avg_ms: 340, success: 47 },
      { stage: 'Rerank', count: 47, avg_ms: 420, success: 47 },
      { stage: 'Reason', count: 47, avg_ms: 890, success: 46 },
      { stage: 'Map-Reduce', count: 8, avg_ms: 2100, success: 8 },
      { stage: 'Re-route', count: 5, avg_ms: 180, success: 5 },
    ],
    chunks: [
      { id: 'c-001', doc: 'May-Short-Stories.pdf', page: 3, tokens: 512, score: 0.87, used: true },
      { id: 'c-002', doc: 'May-Short-Stories.pdf', page: 5, tokens: 480, score: 0.79, used: true },
      { id: 'c-003', doc: 'May-Short-Stories.pdf', page: 8, tokens: 502, score: 0.72, used: true },
      { id: 'c-004', doc: 'notes.pdf', page: 1, tokens: 610, score: 0.45, used: false },
      { id: 'c-005', doc: 'notes.pdf', page: 2, tokens: 590, score: 0.38, used: false },
    ],
    evaluation: {
      relevance: 0.89,
      faithfulness: 0.92,
      answer_completeness: 0.85,
      context_precision: 0.91,
      sample_size: 47,
    },
  })

  const formatUptime = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return `${h}h ${m}m`
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-ink-950">
        <div className="text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-emerald-500 items-center justify-center text-white font-black text-3xl shadow-glow-accent mb-4 animate-pulse">
            ◆
          </div>
          <p className="text-fog-400 text-sm">Loading metrics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink-950 grid-bg">
      {/* Header */}
      <header className="border-b border-ink-800 sticky top-0 z-20 backdrop-blur-lg bg-ink-950/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="text-fog-500 hover:text-white transition-colors p-1.5 hover:bg-ink-800 rounded-lg"
              title="Go to home"
            >
              <Home size={16} />
            </Link>
            <Link
              to="/chat"
              className="text-fog-500 hover:text-white transition-colors p-1.5 hover:bg-ink-800 rounded-lg"
              title="Back to chat"
            >
              <ArrowLeft size={16} />
            </Link>
            <Link
              to="/admin"
              className="text-fog-500 hover:text-white transition-colors p-1.5 hover:bg-ink-800 rounded-lg"
              title="Admin dashboard"
            >
              <Users size={16} />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-black text-sm shadow-glow-accent ml-1">
              ◆
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-white tracking-[-0.02em]">
                Observability
              </h1>
              <p className="text-[11px] text-fog-500">
                Live metrics · Auto-refresh every 10s
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex text-[11px] text-fog-500 font-mono">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
            <ThemeToggle variant="icon" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-xl text-amber-300 text-sm">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* System Status */}
        <section>
          <h2 className="font-display text-[11px] font-bold text-fog-500 uppercase tracking-wider mb-3">
            System Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={Activity}
              label="Status"
              value={data.system.status}
              color="#10b981"
              badge
            />
            <StatCard
              icon={Clock}
              label="Uptime"
              value={formatUptime(data.system.uptime_seconds)}
              color="#3b82f6"
            />
            <StatCard
              icon={Database}
              label="Docs Indexed"
              value={data.system.docs_indexed}
              color="#8b5cf6"
            />
            <StatCard
              icon={Server}
              label="Vector Store"
              value={data.system.vector_store_ready ? 'Ready' : 'Down'}
              color={data.system.vector_store_ready ? '#22c55e' : '#f43f5e'}
            />
          </div>
        </section>

        {/* Models */}
        <section>
          <h2 className="font-display text-[11px] font-bold text-fog-500 uppercase tracking-wider mb-3">
            Active Models
          </h2>
          <div className="grid md:grid-cols-3 gap-3">
            {data.models.map((m) => (
              <div key={m.name} className="surface rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-accent-dim border border-accent-border flex items-center justify-center">
                      <Cpu size={14} className="text-accent-light" />
                    </div>
                    <div>
                      <div className="font-display text-[13px] font-bold text-white">
                        {m.role}
                      </div>
                      <div className="text-[10px] text-fog-500">{m.provider}</div>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
                </div>
                <div
                  className="text-[11px] font-mono text-fog-300 truncate mb-3"
                  title={m.name}
                >
                  {m.name}
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-fog-500">Latency</span>
                  <span className="text-fog-300 font-mono">{m.latency_ms}ms</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Retrieval Metrics */}
        <section>
          <h2 className="font-display text-[11px] font-bold text-fog-500 uppercase tracking-wider mb-3">
            Retrieval Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              icon={BarChart3}
              label="Total Queries"
              value={data.retrieval.total_queries}
              color="#3b82f6"
            />
            <MetricCard
              icon={Layers}
              label="Avg Candidates"
              value={data.retrieval.avg_candidates}
              color="#8b5cf6"
            />
            <MetricCard
              icon={Target}
              label="Avg Reranked"
              value={data.retrieval.avg_reranked}
              color="#10b981"
            />
            <MetricCard
              icon={Zap}
              label="Avg Latency"
              value={`${data.retrieval.avg_latency_ms}ms`}
              color="#f59e0b"
            />
          </div>
        </section>

        {/* Pipeline */}
        <section>
          <h2 className="font-display text-[11px] font-bold text-fog-500 uppercase tracking-wider mb-3">
            Agent Pipeline
          </h2>
          <div className="surface rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-ink-800/50 border-b border-ink-800">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold text-fog-500 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-fog-500 uppercase tracking-wider text-right">
                    Count
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-fog-500 uppercase tracking-wider text-right">
                    Avg Time
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-fog-500 uppercase tracking-wider text-right">
                    Success
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-fog-500 uppercase tracking-wider">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.pipeline.map((p) => {
                  const successRate = p.count > 0 ? (p.success / p.count) * 100 : 0
                  return (
                    <tr
                      key={p.stage}
                      className="border-b border-ink-800/50 last:border-0 hover:bg-ink-800/30"
                    >
                      <td className="px-4 py-3 font-display text-[13px] font-semibold text-white">
                        {p.stage}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-mono text-fog-300 text-right">
                        {p.count}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-mono text-fog-300 text-right">
                        {p.avg_ms}ms
                      </td>
                      <td className="px-4 py-3 text-[13px] font-mono text-fog-300 text-right">
                        {p.success}/{p.count}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-full h-1.5 bg-ink-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${successRate}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Chunks */}
        <section>
          <h2 className="font-display text-[11px] font-bold text-fog-500 uppercase tracking-wider mb-3">
            Retrieved Chunks ({data.chunks.length})
          </h2>
          <div className="surface rounded-xl overflow-hidden">
            {data.chunks.length === 0 ? (
              <div className="p-8 text-center text-fog-500 text-sm">
                No chunks yet. Upload a PDF to see chunks here.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-ink-800/50 border-b border-ink-800">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold text-fog-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-fog-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-fog-500 uppercase tracking-wider text-right">
                      Page
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-fog-500 uppercase tracking-wider text-right">
                      Tokens
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-fog-500 uppercase tracking-wider text-right">
                      Score
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-fog-500 uppercase tracking-wider text-right">
                      Used
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.chunks.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-ink-800/50 last:border-0 hover:bg-ink-800/30"
                    >
                      <td className="px-4 py-3 text-[11px] font-mono text-fog-500">
                        {c.id}
                      </td>
                      <td
                        className="px-4 py-3 text-[12px] text-fog-300 truncate max-w-[200px]"
                        title={c.doc}
                      >
                        <span className="flex items-center gap-2">
                          <FileText size={11} className="text-accent flex-shrink-0" />
                          {c.doc}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] font-mono text-fog-400 text-right">
                        p.{c.page}
                      </td>
                      <td className="px-4 py-3 text-[12px] font-mono text-fog-400 text-right">
                        {c.tokens}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className="text-[11px] font-mono font-bold"
                          style={{
                            color:
                              c.score > 0.7
                                ? '#34d399'
                                : c.score > 0.5
                                ? '#fbbf24'
                                : '#fb7185',
                          }}
                        >
                          {c.score.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.used ? (
                          <CheckCircle2 size={14} className="inline text-emerald-400" />
                        ) : (
                          <AlertCircle size={14} className="inline text-fog-600" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Evaluation */}
        <section>
          <h2 className="font-display text-[11px] font-bold text-fog-500 uppercase tracking-wider mb-3">
            Evaluation Metrics (n={data.evaluation.sample_size})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <EvalCard label="Relevance" value={data.evaluation.relevance} />
            <EvalCard label="Faithfulness" value={data.evaluation.faithfulness} />
            <EvalCard
              label="Completeness"
              value={data.evaluation.answer_completeness}
            />
            <EvalCard
              label="Context Precision"
              value={data.evaluation.context_precision}
            />
          </div>
        </section>
      </main>
    </div>
  )
}

// ═════════════════════════════════════════════════════════
function StatCard({ icon: Icon, label, value, color, badge }) {
  return (
    <div className="surface rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
        >
          <Icon size={13} style={{ color }} />
        </div>
        <span className="text-[11px] font-bold text-fog-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="font-display text-2xl font-black text-white tracking-[-0.02em]">
          {value}
        </div>
        {badge && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
        )}
      </div>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, color }) {
  return (
    <div className="surface rounded-xl p-5">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}
      >
        <Icon size={14} style={{ color }} />
      </div>
      <div className="text-[11px] font-bold text-fog-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="font-display text-2xl font-black text-white tracking-[-0.02em]">
        {value}
      </div>
    </div>
  )
}

function EvalCard({ label, value }) {
  const pct = Math.round(value * 100)
  const color = pct >= 90 ? '#34d399' : pct >= 75 ? '#fbbf24' : '#fb7185'
  return (
    <div className="surface rounded-xl p-5">
      <div className="text-[11px] font-bold text-fog-500 uppercase tracking-wider mb-3">
        {label}
      </div>
      <div className="flex items-end justify-between mb-2">
        <div
          className="font-display text-3xl font-black tracking-[-0.02em]"
          style={{ color }}
        >
          {pct}%
        </div>
      </div>
      <div className="w-full h-1.5 bg-ink-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}