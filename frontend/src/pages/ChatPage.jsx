import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Plus, LogOut, Upload, Trash2, X, Send, Loader2,
  MessageSquare, FileText, ChevronDown, Brain, User as UserIcon,
  Sparkles, Activity, PanelLeftClose, PanelLeftOpen,
  Copy, Check, Users, Home, Zap, AlertCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api, { sessionsApi, documentsApi, askApi } from '../api/client'
import ThemeToggle from '../components/ThemeToggle'

export default function ChatPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const messagesEndRef = useRef(null)

  const [sessions, setSessions] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState('All Documents')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [pendingFiles, setPendingFiles] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    loadSessions()
    loadDocuments()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (currentSessionId) loadMessages(currentSessionId)
    else setMessages([])
  }, [currentSessionId])

  const loadSessions = async () => {
    try {
      const r = await sessionsApi.list()
      setSessions(r.data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadDocuments = async () => {
    try {
      const r = await documentsApi.list()
      setDocuments(r.data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadMessages = async (sid) => {
    try {
      const r = await sessionsApi.messages(sid)
      setMessages(r.data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleNewChat = async () => {
    try {
      const r = await sessionsApi.create('New Chat')
      setCurrentSessionId(r.data.session_id)
      setMessages([])
      await loadSessions()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteSession = async (id, e) => {
    e.stopPropagation()
    try {
      await sessionsApi.delete(id)
      if (currentSessionId === id) {
        setCurrentSessionId(null)
        setMessages([])
      }
      await loadSessions()
    } catch (e) {
      console.error(e)
    }
  }

  const handleClearAllChats = async () => {
    if (!window.confirm('Delete ALL chats? This cannot be undone.')) return
    try {
      await sessionsApi.clearAll()
      setCurrentSessionId(null)
      setMessages([])
      await loadSessions()
    } catch (e) {
      console.error(e)
    }
  }

  // ═══ File selection (add to pending list) ═══
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setPendingFiles((prev) => [...prev, ...files])
    setUploadError('')
    e.target.value = ''
  }

  const removePendingFile = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const clearPendingFiles = () => {
    setPendingFiles([])
    setUploadError('')
  }

  // ═══ Index button — actually uploads + indexes ═══
  const handleProcessFiles = async () => {
    if (!pendingFiles.length) return
    setUploading(true)
    setUploadError('')
    try {
      await documentsApi.upload(pendingFiles)
      setPendingFiles([])
      await loadDocuments()
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Indexing failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDoc = async (docName) => {
    try {
      // Fetch impact preview
      const impactRes = await api.get(
        `/documents/${encodeURIComponent(docName)}/impact`
      )
      const { chats_to_delete } = impactRes.data

      let message = `Delete "${docName}"?`
      if (chats_to_delete > 0) {
        message += `\n\n⚠️ This will also delete ${chats_to_delete} chat session(s) that used this document.`
      } else {
        message += `\n\nNo chats are linked to this document.`
      }
      message += `\n\nThis cannot be undone.`

      if (!window.confirm(message)) return

      await documentsApi.delete(docName)
      await loadDocuments()
      if (selectedDoc === docName) setSelectedDoc('All Documents')

      await loadSessions()
      if (
        currentSessionId &&
        !sessions.find((s) => s.id === currentSessionId)
      ) {
        setCurrentSessionId(null)
        setMessages([])
      }
    } catch (e) {
      console.error('Delete doc failed:', e)
      alert(e.response?.data?.detail || 'Failed to delete document')
    }
  }

  const handleClearAllDocs = async () => {
    if (!window.confirm('Delete ALL documents AND chats? This cannot be undone.')) return
    try {
      await documentsApi.clearAll()
      setDocuments([])
      setSelectedDoc('All Documents')
      setSessions([])
      setCurrentSessionId(null)
      setMessages([])
    } catch (e) {
      console.error(e)
    }
  }

  const handleSend = async () => {
    const q = input.trim()
    if (!q || loading) return

    let sid = currentSessionId
    if (!sid) {
      try {
        const r = await sessionsApi.create(q.slice(0, 30))
        sid = r.data.session_id
        setCurrentSessionId(sid)
        await loadSessions()
      } catch (e) {
        return
      }
    }

    setMessages((p) => [...p, { role: 'user', content: q }])
    setInput('')
    setLoading(true)

    try {
      const r = await askApi.ask(q, sid, selectedDoc)
      setMessages((p) => [
        ...p,
        {
          role: 'assistant',
          content: r.data.answer,
          agent_steps: r.data.agent_steps || [],
          retrieved_doc_count: r.data.retrieved_doc_count || 0,
        },
      ])
      await loadSessions()
    } catch (err) {
      setMessages((p) => [
        ...p,
        {
          role: 'assistant',
          content: `Error: ${err.response?.data?.detail || 'Something went wrong'}`,
          isError: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="h-screen flex overflow-hidden bg-ink-950">
      {/* ═══ SIDEBAR ═══ */}
      <aside
        className={`${
          sidebarOpen ? 'w-[280px]' : 'w-0'
        } flex-shrink-0 bg-ink-900 border-r border-ink-800 flex flex-col transition-all duration-300 overflow-hidden`}
      >
        {/* Logo */}
        <div className="px-5 pt-5 pb-4 border-b border-ink-800">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-black text-sm shadow-glow-accent group-hover:scale-105 transition-transform">
              ◆
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-display font-bold text-sm text-white tracking-[-0.015em]">
                Agentic
              </span>
              <span className="text-fog-500 text-sm font-normal">RAG</span>
            </div>
          </Link>
        </div>

        {/* User */}
        <div className="p-4 border-b border-ink-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(user?.name || user?.email || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-white truncate">
                {user?.name || user?.email?.split('@')[0]}
              </div>
              <div className="text-[11px] text-fog-500 truncate">{user?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-fog-500 hover:text-white transition-colors p-1"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <div className="px-4 pt-4 pb-2 space-y-0.5">
          <Link
            to="/"
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-fog-400 hover:text-white hover:bg-ink-800 rounded-lg transition-all"
          >
            <Home size={14} />
            Home
          </Link>
          <Link
            to="/observability"
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-fog-400 hover:text-white hover:bg-ink-800 rounded-lg transition-all"
          >
            <Activity size={14} />
            Observability
          </Link>
          <Link
            to="/admin"
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-fog-400 hover:text-white hover:bg-ink-800 rounded-lg transition-all"
          >
            <Users size={14} />
            Admin Dashboard
          </Link>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
          <button
            onClick={handleNewChat}
            className="btn-accent w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-[13px]"
          >
            <Plus size={15} />
            New chat
          </button>

          {/* ═══ DOCUMENTS SECTION ═══ */}
          <div>
            <h3 className="text-[10px] font-bold text-fog-500 uppercase tracking-wider mb-2 px-1">
              Documents
            </h3>

            {/* Pending files list */}
            {pendingFiles.length > 0 ? (
              <div className="space-y-1.5 mb-2">
                {pendingFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2.5 py-2 bg-accent-dim border border-accent-border rounded-lg"
                  >
                    <FileText size={12} className="text-accent-light flex-shrink-0" />
                    <span
                      className="flex-1 text-[11px] font-medium text-accent-light truncate"
                      title={file.name}
                    >
                      {file.name}
                    </span>
                    <span className="text-[10px] text-fog-500 flex-shrink-0">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      onClick={() => removePendingFile(i)}
                      className="text-fog-500 hover:text-rose-400 transition-colors"
                      disabled={uploading}
                      title="Remove"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <button
                    onClick={handleProcessFiles}
                    disabled={uploading}
                    className="btn-accent flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-[12px]"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Indexing...
                      </>
                    ) : (
                      <>
                        <Zap size={12} />
                        Index {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                  <button
                    onClick={clearPendingFiles}
                    disabled={uploading}
                    className="px-3 py-2 bg-ink-800 border border-ink-700 hover:border-rose-500/50 rounded-lg text-[12px] font-medium text-fog-400 hover:text-rose-400 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
                <div className="flex items-center gap-2 px-3 py-2.5 bg-ink-800 border border-dashed border-ink-700 rounded-lg hover:border-accent transition-colors">
                  <Upload size={13} className="text-fog-400 flex-shrink-0" />
                  <span className="text-[12px] font-medium text-fog-400">
                    Choose PDFs
                  </span>
                </div>
              </label>
            )}

            {uploadError && (
              <div className="mt-2 text-[11px] text-rose-400 px-1 flex items-start gap-1.5">
                <AlertCircle size={11} className="flex-shrink-0 mt-0.5" />
                {uploadError}
              </div>
            )}

            {/* Indexed documents */}
            {documents.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-[9px] font-bold text-fog-600 uppercase tracking-wider px-1 mb-1">
                  Indexed ({documents.length})
                </div>
                {documents.map((doc) => (
                  <div
                    key={doc}
                    className="flex items-center gap-2 px-2.5 py-2 bg-ink-800 border border-ink-700 rounded-lg group hover:border-fog-600 transition-colors"
                  >
                    <FileText size={12} className="text-accent flex-shrink-0" />
                    <span
                      className="flex-1 text-[11px] font-medium text-fog-300 truncate"
                      title={doc}
                    >
                      {doc}
                    </span>
                    <button
                      onClick={() => handleDeleteDoc(doc)}
                      className="opacity-0 group-hover:opacity-100 text-fog-500 hover:text-rose-400 transition-all"
                      title={`Delete ${doc}`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleClearAllDocs}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-fog-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={10} />
                  Clear all documents
                </button>
              </div>
            )}
          </div>

          {/* ═══ CONTEXT ═══ */}
          <div>
            <h3 className="text-[10px] font-bold text-fog-500 uppercase tracking-wider mb-2 px-1">
              Context
            </h3>
            <div className="relative">
              <select
                value={selectedDoc}
                onChange={(e) => setSelectedDoc(e.target.value)}
                className="w-full appearance-none bg-ink-800 border border-ink-700 rounded-lg px-3 py-2.5 pr-8 text-[12px] font-medium text-white outline-none focus:border-accent transition cursor-pointer"
              >
                <option value="All Documents">All Documents</option>
                {documents.map((doc) => (
                  <option key={doc} value={doc}>
                    {doc}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fog-500 pointer-events-none"
              />
            </div>
          </div>

          {/* ═══ HISTORY ═══ */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-[10px] font-bold text-fog-500 uppercase tracking-wider">
                History
              </h3>
              {sessions.length > 0 && (
                <button
                  onClick={handleClearAllChats}
                  className="text-[10px] font-medium text-fog-500 hover:text-rose-400 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            {sessions.length === 0 ? (
              <p className="text-[11px] text-fog-500 px-1 py-1">No chats yet</p>
            ) : (
              <div className="space-y-0.5">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setCurrentSessionId(s.id)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer group transition-all ${
                      currentSessionId === s.id
                        ? 'bg-ink-800 border border-ink-700'
                        : 'hover:bg-ink-800/60 border border-transparent'
                    }`}
                  >
                    <MessageSquare size={11} className="text-fog-500 flex-shrink-0" />
                    <span
                      className="flex-1 text-[12px] font-medium text-fog-300 truncate"
                      title={s.title}
                    >
                      {s.title.slice(0, 26)}
                    </span>
                    <button
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-fog-500 hover:text-rose-400 transition-all"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ═══ MAIN CHAT AREA ═══ */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="px-6 py-4 border-b border-ink-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-fog-500 hover:text-white transition-colors p-1.5 hover:bg-ink-800 rounded-lg"
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold text-white tracking-[-0.02em] truncate">
                Chat with your Documents
              </h1>
              <p className="text-[11px] text-fog-500 truncate">
                Multi-query · Reranking · Map-reduce · Self-routing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 bg-accent-dim border border-accent-border rounded-full text-[11px] font-semibold text-accent-light">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-light animate-pulse-soft" />
              {selectedDoc}
            </div>
            <Link
              to="/"
              className="text-fog-500 hover:text-white transition-colors p-2 hover:bg-ink-800 rounded-lg"
              title="Go to home"
            >
              <Home size={16} />
            </Link>
            <ThemeToggle variant="icon" />
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white font-black text-xl shadow-glow-accent mb-5">
                ◆
              </div>
              <h2 className="font-display text-2xl font-bold text-white tracking-[-0.025em] mb-2">
                How can I help you today?
              </h2>
              <p className="text-fog-400 text-sm mb-8">
                Upload a PDF and ask anything — I'll search, rerank, and reason.
              </p>
              <div className="grid grid-cols-2 gap-2 w-full">
                {[
                  'Summarize this document',
                  'What are the key points?',
                  'Explain in simple terms',
                  'List all the topics',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-left px-4 py-3 bg-ink-900 border border-ink-800 hover:border-accent rounded-xl text-[12px] font-medium text-fog-300 hover:text-white transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} msg={msg} />
            ))}

            {loading && (
              <div className="flex items-start gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-glow-accent">
                  <Brain size={14} className="text-white" />
                </div>
                <div className="bg-ink-900 border border-ink-800 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-[13px] text-fog-400">
                    <Loader2 size={13} className="animate-spin" />
                    Thinking...
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-ink-800">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-ink-900 border border-ink-800 rounded-xl p-1.5 focus-within:border-accent transition-colors">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your documents..."
                rows={1}
                className="flex-1 bg-transparent border-none outline-none resize-none px-3 py-2 text-white placeholder-fog-600 text-sm"
                style={{ minHeight: '40px', maxHeight: '160px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="btn-accent w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center"
              >
                {loading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <p className="text-[10px] text-fog-600">
                <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
              </p>
              <p className="text-[10px] text-fog-600 flex items-center gap-1">
                <Sparkles size={10} />
                Powered by Groq
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ═════════════════════════════════════════════════════════
function MessageBubble({ msg }) {
  const [showSteps, setShowSteps] = useState(false)
  const [copied, setCopied] = useState(false)
  const isUser = msg.role === 'user'
  const isError = msg.isError

  const handleCopy = async () => {
    await navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className={`flex items-start gap-3 animate-fade-in ${
        isUser ? 'flex-row-reverse' : ''
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-ink-800 border border-ink-700'
            : 'bg-emerald-500 shadow-glow-accent'
        }`}
      >
        {isUser ? (
          <UserIcon size={14} className="text-fog-400" />
        ) : (
          <Brain size={14} className="text-white" />
        )}
      </div>

      <div className={`max-w-[85%] min-w-0 ${isUser ? 'items-end' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed group relative ${
            isUser
              ? 'bg-emerald-500 text-white font-medium shadow-glow-accent'
              : isError
              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-200'
              : 'bg-ink-900 border border-ink-800 text-fog-100'
          }`}
        >
          <div className="whitespace-pre-wrap break-words">{msg.content}</div>

          {!isUser && !isError && (
            <div className="absolute -bottom-8 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-1.5 bg-ink-800 border border-ink-700 rounded-lg text-fog-400 hover:text-white transition-colors"
                title="Copy"
              >
                {copied ? (
                  <Check size={12} className="text-emerald-400" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            </div>
          )}
        </div>

        {msg.agent_steps && msg.agent_steps.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-fog-500 hover:text-accent-light transition-colors"
            >
              <Brain size={11} />
              Agent reasoning ({msg.agent_steps.length} steps)
              <ChevronDown
                size={11}
                className={`transition-transform ${showSteps ? 'rotate-180' : ''}`}
              />
            </button>
            {showSteps && (
              <div className="mt-2 bg-ink-900 border border-ink-800 rounded-xl p-3 space-y-1">
                {msg.agent_steps.map((step, i) => (
                  <div
                    key={i}
                    className="text-[11px] font-medium leading-relaxed font-mono"
                    style={{ color: getStepColor(step) }}
                  >
                    {step}
                  </div>
                ))}
                {msg.retrieved_doc_count > 0 && (
                  <div className="text-[10px] text-fog-600 pt-2 mt-2 border-t border-ink-800">
                    Retrieved {msg.retrieved_doc_count} document chunks
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function getStepColor(step) {
  const s = step.toLowerCase()
  if (s.includes('map-reduce') || s.includes('reduce')) return '#a78bfa'
  if (s.includes('rerank')) return '#38bdf8'
  if (s.includes('rrf') || s.includes('multi-query')) return '#c4b5fd'
  if (s.includes('re-route') || s.includes('fallback')) return '#fbbf24'
  if (step.includes('✅')) return '#34d399'
  if (step.includes('⚠️')) return '#fb7185'
  if (s.includes('🔍') || s.includes('searching')) return '#22d3ee'
  return '#94a3b8'
}