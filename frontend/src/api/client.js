const API_BASE = import.meta.env.VITE_API_URL || ''

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH'])

function buildFetchOptions(options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const headers = { ...(options.headers || {}) }
  let body = options.body

  if (BODY_METHODS.has(method)) {
    if (body === undefined) {
      body = '{}'
    }
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json'
    }
  }

  return {
    credentials: 'include',
    ...options,
    method,
    headers,
    body,
  }
}

function networkErrorMessage(error) {
  if (error?.message === 'Failed to fetch' || error?.name === 'TypeError') {
    const target = API_BASE || 'the dev server proxy (port 8080)'
    return `Cannot reach the API at ${target}. Ensure the backend is running (cd backend && .\\run.ps1) and the frontend dev server is on port 5173.`
  }
  return error?.message || 'Request failed'
}

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, buildFetchOptions(options))
  } catch (error) {
    throw new Error(networkErrorMessage(error))
  }

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
  forgotPassword: (data) => request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }),
  resetPassword: (data) => request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
  resendPasswordReset: (data) => request('/api/auth/resend-password-reset', { method: 'POST', body: JSON.stringify(data) }),
  googleAuth: (data) => request('/api/auth/google', { method: 'POST', body: JSON.stringify(data) }),
  sendPhoneOtp: () => request('/api/auth/send-phone-otp', { method: 'POST' }),
  resendPhoneOtp: () => request('/api/auth/resend-phone-otp', { method: 'POST' }),
  verifyPhone: (data) => request('/api/auth/verify-phone', { method: 'POST', body: JSON.stringify(data) }),
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
  adminDoctors: ({ search, specialization, verified, sortBy, page = 0, size = 20, sort } = {}) => {
    const params = new URLSearchParams({ page, size })
    if (search) params.set('search', search)
    if (specialization) params.set('specialization', specialization)
    if (verified != null) params.set('verified', verified)
    if (sortBy) params.set('sortBy', sortBy)
    if (sort) params.set('sort', sort)
    return request(`/api/admin/doctors?${params}`)
  },
  adminCreateDoctor: (data) => request('/api/admin/doctors', { method: 'POST', body: JSON.stringify(data) }),
  adminDoctor: (id) => request(`/api/admin/doctors/${id}`),
  adminUpdateDoctor: (id, data) => request(`/api/admin/doctors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeactivateDoctor: (id) => request(`/api/admin/doctors/${id}`, { method: 'DELETE' }),
  adminDoctorAppointments: (id, page = 0) =>
    request(`/api/admin/doctors/${id}/appointments?page=${page}&size=20`),
  adminPatients: (search, page = 0) => {
    const params = new URLSearchParams({ page, size: 20 })
    if (search) params.set('search', search)
    return request(`/api/admin/patients?${params}`)
  },
  adminPatient: (id) => request(`/api/admin/patients/${id}`),
  adminDeletePatient: (id) => request(`/api/admin/patients/${id}`, { method: 'DELETE' }),
  adminPatientAppointments: (id, page = 0) =>
    request(`/api/admin/patients/${id}/appointments?page=${page}&size=20`),
  adminCancelAppointment: (id) => request(`/api/admin/appointments/${id}/cancel`, { method: 'POST' }),
  adminAuditLogs: (page = 0) => request(`/api/admin/audit-logs?page=${page}&size=50`),
  adminStats: () => request('/api/admin/stats'),
}
