import { Link } from 'react-router-dom'
import {
  ArrowRight, Target, Link2, Map,
  RefreshCw, MessageSquare, Shield,
  Zap, Database, GitBranch,
} from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'

const FEATURES = [
  {
    icon: Target,
    title: 'Cross-Encoder Reranking',
    desc: 'A dedicated reranking model scores every candidate chunk against your question for surgical precision.',
    accent: '#10b981',
  },
  {
    icon: GitBranch,
    title: 'Multi-Query + RRF',
    desc: 'Expands each question into multiple search queries and fuses results via Reciprocal Rank Fusion.',
    accent: '#3b82f6',
  },
  {
    icon: Map,
    title: 'Map-Reduce Reasoning',
    desc: 'For summaries and comparisons — analyzes every chunk in parallel then merges the answers.',
    accent: '#8b5cf6',
  },
  {
    icon: RefreshCw,
    title: 'Self-Re-Routing',
    desc: "If documents don't answer well, the agent automatically falls back to conversation history.",
    accent: '#f59e0b',
  },
  {
    icon: MessageSquare,
    title: 'Persistent Chat Memory',
    desc: 'Every conversation is stored and searchable. Follow-up questions just work.',
    accent: '#06b6d4',
  },
  {
    icon: Shield,
    title: 'Per-Account Isolation',
    desc: 'Documents and chats are scoped to your account. Deleting a doc cascades to its chats.',
    accent: '#f43f5e',
  },
]

const STATS = [
  { value: '4', label: 'Retrieval strategies' },
  { value: '10+', label: 'Vector candidates reranked' },
  { value: '< 5s', label: 'Average response time' },
  { value: '100%', label: 'Private by design' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden grid-bg bg-ink-950">
      {/* Ambient glows */}
      <div className="glow-orb w-[600px] h-[600px] bg-emerald-500/20 -top-40 -left-40" />
      <div className="glow-orb w-[500px] h-[500px] bg-blue-500/10 top-1/3 -right-40" />
      <div className="glow-orb w-[400px] h-[400px] bg-purple-500/10 bottom-0 left-1/3" />

      {/* ─── NAV ─── */}
      <nav className="relative z-10 flex items-center justify-between px-8 lg:px-12 py-5 max-w-7xl mx-auto border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-black text-base shadow-glow-accent">
            ◆
          </div>
          <span className="font-display font-bold text-[15px] text-white tracking-[-0.02em]">
            Agentic<span className="text-fog-400 font-normal">RAG</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle variant="icon" />
          <Link
            to="/login"
            className="px-4 py-2 text-fog-300 hover:text-white text-sm font-medium transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="group px-4 py-2 bg-white hover:bg-fog-100 text-ink-950 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5"
          >
            Get started
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-fog-300 mb-8 backdrop-blur">
          <Zap size={12} className="text-accent-light" />
          <span>Powered by Groq · ChromaDB · Cross-Encoders</span>
        </div>

        <h1 className="font-display text-5xl md:text-7xl font-black text-gradient leading-[1.02] tracking-[-0.035em] mb-6">
          Chat with your documents
          <br />
          <span className="text-gradient-accent">with surgical precision.</span>
        </h1>

        <p className="text-lg md:text-xl text-fog-400 max-w-2xl mx-auto leading-relaxed mb-10">
          Upload PDFs, ask questions in plain English, and get answers grounded in
          your data — powered by multi-query retrieval, cross-encoder reranking,
          and map-reduce reasoning.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            to="/signup"
            className="group btn-accent inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-[15px] shadow-glow-accent"
          >
            Start for free
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-semibold text-[15px] transition-all"
          >
            <Database size={16} className="text-fog-400" />
            I have an account
          </Link>
        </div>

        <p className="text-xs text-fog-500 mt-6">
          No credit card required · Free forever for individuals
        </p>
      </section>

      {/* ─── STATS ─── */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="surface rounded-xl p-5 text-center hover:border-fog-700 transition-colors"
            >
              <div className="font-display text-3xl font-black text-white tracking-[-0.02em] mb-1">
                {s.value}
              </div>
              <div className="text-xs text-fog-500 font-medium uppercase tracking-wide">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 pt-20 pb-24">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl md:text-4xl font-black text-white tracking-[-0.03em] mb-3">
            Everything you need for production-grade RAG
          </h2>
          <p className="text-fog-400 max-w-xl mx-auto">
            Not a wrapper. A full agentic pipeline — routing, retrieval, reranking, and reasoning.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="surface group rounded-2xl p-6 hover:border-fog-700 transition-all duration-200"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-105"
                style={{ background: `${f.accent}15`, border: `1px solid ${f.accent}30` }}
              >
                <f.icon size={18} style={{ color: f.accent }} />
              </div>
              <h3 className="font-display font-semibold text-[15px] text-white mb-1.5 tracking-[-0.015em]">
                {f.title}
              </h3>
              <p className="text-[13px] text-fog-400 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 pb-24">
        <div className="surface rounded-2xl p-12 text-center relative overflow-hidden">
          <div className="glow-orb w-[400px] h-[400px] bg-emerald-500/20 -top-32 left-1/2 -translate-x-1/2" />
          <div className="relative">
            <h2 className="font-display text-3xl md:text-4xl font-black text-white tracking-[-0.03em] mb-3">
              Ready to try it?
            </h2>
            <p className="text-fog-400 mb-6 max-w-md mx-auto">
              Sign up in 10 seconds and start chatting with your documents.
            </p>
            <Link
              to="/signup"
              className="group btn-accent inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-[15px] shadow-glow-accent"
            >
              Create free account
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center text-white font-black text-xs">
              ◆
            </div>
            <span className="text-xs text-fog-500">
              © 2025 AgenticRAG. Built for document intelligence.
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs text-fog-500">
            <span>Privacy</span>
            <span>Terms</span>
            <span className="text-fog-600">v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}