const API_BASE = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    let msg = err.message || 'Request failed'
    if (err.errors && typeof err.errors === 'object') {
      const details = Object.entries(err.errors)
        .map(([field, reason]) => `${field}: ${reason}`)
        .join(', ')
      if (details) {
        msg = `${msg} (${details})`
      }
    }
    throw new Error(msg)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  register: (data) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  verifyEmail: (data) => request('/api/auth/verify-email', { method: 'POST', body: JSON.stringify(data) }),
  resendVerification: (data) => request('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify(data) }),
  googleAuth: (data) => request('/api/auth/google', { method: 'POST', body: JSON.stringify(data) }),
  githubAuth: (data) => request('/api/auth/github', { method: 'POST', body: JSON.stringify(data) }),
  refresh: () => request('/api/auth/refresh', { method: 'POST' }),
  getProfile: () => request('/api/profile/me'),
  updateProfile: (data) => request('/api/profile/me', { method: 'PUT', body: JSON.stringify(data) }),
  getVaccinations: () => request('/api/health-data/vaccinations'),
  getMedicalHistory: () => request('/api/health-data/medical-history'),
  getPreviousDiseases: () => request('/api/health-data/previous-diseases'),
  symptomCheck: (symptoms, lat, lng) => {
    const params = new URLSearchParams()
    if (lat != null) params.set('lat', lat)
    if (lng != null) params.set('lng', lng)
    const qs = params.toString() ? `?${params}` : ''
    return request(`/api/ai/symptom-check${qs}`, {
      method: 'POST',
      body: JSON.stringify({ symptoms }),
    })
  },
  healthAnalysis: (userId) =>
    request('/api/ai/health-analysis', { method: 'POST', body: JSON.stringify({ userId }) }),
  chatAssistant: (message, history = []) =>
    request('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message, history }) }),
  nearbyDoctors: (lat, lng, specialty) => {
    const params = new URLSearchParams({ lat, lng })
    if (specialty) params.set('specialty', specialty)
    return request(`/api/doctors/nearby?${params}`)
  },
  searchDoctors: (filters) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => v != null && params.set(k, v))
    return request(`/api/doctors/search?${params}`)
  },
  bookAppointment: (data) => request('/api/appointments', { method: 'POST', body: JSON.stringify(data) }),
  myAppointments: () => request('/api/appointments/mine'),
  adminUsers: (search, page = 0) => {
    const params = new URLSearchParams({ page, size: 20 })
    if (search) params.set('search', search)
    return request(`/api/admin/users?${params}`)
  },
  adminLookup: (identifier) => request(`/api/admin/users/lookup?identifier=${encodeURIComponent(identifier)}`),
  adminVerifyDoctor: (id, approved) =>
    request(`/api/admin/doctors/${id}/verify?approved=${approved}`, { method: 'POST' }),
  adminAuditLogs: (page = 0) => request(`/api/admin/audit-logs?page=${page}&size=50`),
  adminStats: () => request('/api/admin/stats'),
}
