import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const COUNTRIES = [
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
]

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function passwordStrength(pw) {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}

export default function SignupPage() {
  const { register, googleLogin } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [heightUnit, setHeightUnit] = useState('cm')
  const [weightUnit, setWeightUnit] = useState('kg')
  const [allergyInput, setAllergyInput] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    nationalId: '', country: 'LK', mobile: '', gender: 'MALE', bloodType: '',
    height: '', weight: '', birthDate: '', allergies: [],
  })

  const strength = passwordStrength(form.password)

  const handleGoogle = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      setError('Google OAuth not configured. Set VITE_GOOGLE_CLIENT_ID.')
      return
    }
    const redirectUri = window.location.origin + '/signup'
    const scope = 'openid profile email'
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`
    window.location.href = url
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      setLoading(true)
      googleLogin(code)
        .then(() => navigate('/profile'))
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    }
  }, [googleLogin, navigate])

  const addAllergy = () => {
    if (allergyInput.trim()) {
      setForm({ ...form, allergies: [...form.allergies, allergyInput.trim()] })
      setAllergyInput('')
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    let heightCm = form.height ? Number(form.height) : null
    let weightKg = form.weight ? Number(form.weight) : null
    if (heightUnit === 'ft' && heightCm) heightCm = heightCm * 30.48
    if (weightUnit === 'lbs' && weightKg) weightKg = weightKg * 0.453592

    setLoading(true)
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        nationalId: form.nationalId,
        country: form.country,
        mobile: form.mobile || null,
        gender: form.gender,
        bloodType: form.bloodType || null,
        heightCm,
        weightKg,
        birthDate: form.birthDate,
        allergies: form.allergies,
      })
      navigate('/profile')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Create Your Health ID</h1>
      <p className="opacity-60 mb-8">Register to get your unique digital health identity</p>

      <button
        onClick={handleGoogle}
        className="w-full glass flex items-center justify-center gap-3 py-3 rounded-xl mb-6 hover:border-accent transition"
      >
        <span className="text-xl">G</span> Continue with Google
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs opacity-50">or email</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        {[
          { key: 'name', label: 'Full Name', type: 'text', required: true },
          { key: 'email', label: 'Email', type: 'email', required: true },
          { key: 'nationalId', label: 'National ID (NIC)', type: 'text', required: true },
          { key: 'mobile', label: 'Mobile (optional)', type: 'tel' },
        ].map(({ key, label, type, required }) => (
          <div key={key}>
            <label className="text-xs text-accent2 block mb-1">{label}</label>
            <input
              type={type}
              required={required}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2"
            />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-accent2 block mb-1">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2"
            />
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-1 flex-1 rounded ${strength >= i ? 'bg-accent' : 'bg-border'}`} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-accent2 block mb-1">Confirm Password</label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-accent2 block mb-1">Gender</label>
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2"
          >
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-accent2 block mb-1">Country</label>
            <select
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2"
            >
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-accent2 block mb-1">Blood Type</label>
            <select
              value={form.bloodType}
              onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
              className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2"
            >
              <option value="">Select</option>
              {BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs text-accent2">Height</label>
              <button type="button" onClick={() => setHeightUnit(heightUnit === 'cm' ? 'ft' : 'cm')} className="text-xs text-accent">
                {heightUnit}
              </button>
            </div>
            <input
              type="number"
              value={form.height}
              onChange={(e) => setForm({ ...form, height: e.target.value })}
              className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs text-accent2">Weight</label>
              <button type="button" onClick={() => setWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg')} className="text-xs text-accent">
                {weightUnit}
              </button>
            </div>
            <input
              type="number"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
              className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-accent2 block mb-1">Birth Date</label>
          <input
            type="date"
            required
            value={form.birthDate}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="text-xs text-accent2 block mb-1">Allergies (optional)</label>
          <div className="flex gap-2">
            <input
              value={allergyInput}
              onChange={(e) => setAllergyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
              className="flex-1 bg-navy/50 border border-border rounded-lg px-3 py-2"
              placeholder="Type and press Enter"
            />
            <button type="button" onClick={addAllergy} className="px-3 bg-accent rounded-lg">+</button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {form.allergies.map((a) => (
              <span key={a} className="text-xs bg-red-500/20 px-2 py-0.5 rounded-full">{a}</span>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent2 py-3 rounded-xl font-semibold disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Health ID'}
        </button>
      </form>

      <p className="text-center text-sm opacity-60 mt-6">
        Already have an account? <Link to="/login" className="text-accent2">Login</Link>
      </p>
    </main>
  )
}
