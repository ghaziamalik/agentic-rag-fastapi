import axios from 'axios'

export const API_URL = 'https://agentic-rag-fastapi-production.up.railway.app'

const api = axios.create({
  baseURL: API_URL,
  timeout: 180000, // 3 min for heavy RAG queries
})

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rag_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 — clear auth and redirect
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rag_token')
      localStorage.removeItem('rag_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// ─── AUTH ───
export const authApi = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) =>
    api.post('/auth/reset-password', { token, new_password: newPassword }),
}

// ─── DOCUMENTS ───
export const documentsApi = {
  list: () => api.get('/documents'),
  upload: (files) => {
    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))
    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  delete: (docName) => api.delete(`/documents/${encodeURIComponent(docName)}`),
  clearAll: () => api.delete('/documents'),
}

// ─── SESSIONS ───
export const sessionsApi = {
  list: () => api.get('/sessions'),
  create: (title = 'New Chat') => api.post('/sessions', { title }),
  messages: (sessionId) => api.get(`/sessions/${sessionId}/messages`),
  rename: (sessionId, title) =>
    api.patch(`/sessions/${sessionId}`, { title }),
  delete: (sessionId) => api.delete(`/sessions/${sessionId}`),
  clearAll: () => api.delete('/sessions'),
}

// ─── ASK ───
export const askApi = {
  ask: (question, sessionId, selectedDoc) =>
    api.post('/ask', {
      question,
      session_id: sessionId,
      selected_doc: selectedDoc,
    }),
}

export default api