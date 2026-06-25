import { useState, useEffect } from 'react'

import { useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

import { api } from '../api/client'

import HumanoidFigure from '../components/HumanoidFigure'
import OrganDetailsCard from '../components/OrganDetailsCard'
import Sparkline from '../components/Sparkline'
import './ProfilePage.css'



const TABS = ['Vaccinations', 'Medical History', 'Previous Diseases', 'AI Analysis']

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function generateMockTrend(currentValue, seed = 1) {
  const base = Number(currentValue)
  if (!currentValue || Number.isNaN(base)) return null
  const months = 6
  const points = []
  for (let i = 0; i < months; i++) {
    const wave = Math.sin((i + seed) * 1.4) * 0.035 * base
    const drift = (i - (months - 1)) * 0.012 * base
    points.push(Math.round((base + wave + drift) * 100) / 100)
  }
  points[months - 1] = base
  return points
}

function formatCountry(country) {
  if (!country) return 'Sri Lanka · LK'
  if (country === 'LK') return 'Sri Lanka · LK'
  return country
}

function formatGender(gender) {
  const value = String(gender ?? 'MALE').trim().toUpperCase()
  return value === 'FEMALE' ? 'Female' : 'Male'
}

function getInitial(name) {
  return name?.trim()?.[0]?.toUpperCase() || 'P'
}

function getIssuedYear(profile) {
  const match = profile.healthId?.match(/-(\d{4})-/)
  if (match) return match[1]
  if (profile.birthDate) return String(profile.birthDate).slice(0, 4)
  return '—'
}

function getAge(profile) {
  if (!profile.birthDate) return '—'
  const birth = new Date(profile.birthDate)
  if (Number.isNaN(birth.getTime())) return '—'
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1
  return `${age} yrs`
}

function getBmiLabel(bmi) {
  const value = Number(bmi)
  if (!bmi || Number.isNaN(value)) return ''
  if (value < 18.5) return 'Underweight'
  if (value < 25) return 'Normal'
  if (value < 30) return 'Overweight'
  return 'Obese'
}

function getBmiBarPercent(bmi) {
  const value = Number(bmi)
  if (!bmi || Number.isNaN(value)) return 32
  return Math.min(100, Math.max(0, ((value - 16) / 24) * 100))
}

function getAllergyTagClass(allergy) {
  const value = allergy.toLowerCase()
  if (value.includes('antibiotic') || value.includes('penicillin') || value.includes('sulfa')) {
    return 'pe-allergy-tag--danger'
  }
  if (value.includes('dust') || value.includes('pollen') || value.includes('mite')) {
    return 'pe-allergy-tag--warn'
  }
  return 'pe-allergy-tag--default'
}

function profileToEditForm(profile) {

  return {

    name: profile.name || '',

    mobile: profile.mobile || '',

    gender: profile.gender || 'MALE',

    bloodType: profile.bloodType || '',

    height: profile.heightCm ?? '',

    weight: profile.weightKg ?? '',

    eyesightLeft: profile.eyesightLeft || '',

    eyesightRight: profile.eyesightRight || '',

    allergies: profile.allergies ? [...profile.allergies] : [],

  }

}



export default function ProfilePage() {

  const { user, profile, loading, refreshProfile } = useAuth()

  const navigate = useNavigate()

  const [tab, setTab] = useState(0)

  const [vaccinations, setVaccinations] = useState([])

  const [history, setHistory] = useState([])

  const [diseases, setDiseases] = useState([])

  const [aiAnalysis, setAiAnalysis] = useState(null)

  const [editOpen, setEditOpen] = useState(false)

  const [editForm, setEditForm] = useState({})

  const [heightUnit, setHeightUnit] = useState('cm')

  const [weightUnit, setWeightUnit] = useState('kg')

  const [allergyInput, setAllergyInput] = useState('')

  const [editError, setEditError] = useState('')

  const [saving, setSaving] = useState(false)

  const [aiLoading, setAiLoading] = useState(false)
  const [activeRegion, setActiveRegion] = useState(null)
  const [hoveredRegion, setHoveredRegion] = useState(null)
  const displayRegion = hoveredRegion || activeRegion



  useEffect(() => {

    if (!loading && !user) navigate('/login')

  }, [user, loading, navigate])



  useEffect(() => {

    if (!user) return

    api.getVaccinations().then(setVaccinations).catch(() => {})

    api.getMedicalHistory().then(setHistory).catch(() => {})

    api.getPreviousDiseases().then(setDiseases).catch(() => {})

  }, [user])



  const openEdit = () => {

    if (!profile) return

    setEditForm(profileToEditForm(profile))

    setHeightUnit('cm')

    setWeightUnit('kg')

    setAllergyInput('')

    setEditError('')

    setEditOpen(true)

  }



  const toggleHeightUnit = () => {

    const next = heightUnit === 'cm' ? 'ft' : 'cm'

    setEditForm((prev) => {

      if (!prev.height) return prev

      const value = Number(prev.height)

      if (Number.isNaN(value)) return prev

      const converted = next === 'ft' ? value / 30.48 : value * 30.48

      return { ...prev, height: Math.round(converted * 10) / 10 }

    })

    setHeightUnit(next)

  }



  const toggleWeightUnit = () => {

    const next = weightUnit === 'kg' ? 'lbs' : 'kg'

    setEditForm((prev) => {

      if (!prev.weight) return prev

      const value = Number(prev.weight)

      if (Number.isNaN(value)) return prev

      const converted = next === 'lbs' ? value / 0.453592 : value * 0.453592

      return { ...prev, weight: Math.round(converted * 10) / 10 }

    })

    setWeightUnit(next)

  }



  const addAllergy = () => {

    const value = allergyInput.trim()

    if (!value) return

    setEditForm((prev) => ({

      ...prev,

      allergies: prev.allergies.includes(value) ? prev.allergies : [...prev.allergies, value],

    }))

    setAllergyInput('')

  }



  const removeAllergy = (allergy) => {

    setEditForm((prev) => ({

      ...prev,

      allergies: prev.allergies.filter((a) => a !== allergy),

    }))

  }



  const runAiAnalysis = async () => {

    setAiLoading(true)

    try {

      const res = await api.healthAnalysis(user.userId)

      setAiAnalysis(res)

      refreshProfile()

    } catch (e) {

      setAiAnalysis({ rawAnalysis: e.message })

    } finally {

      setAiLoading(false)

    }

  }



  const saveProfile = async () => {

    setEditError('')

    setSaving(true)

    try {

      let heightCm = editForm.height !== '' && editForm.height != null ? Number(editForm.height) : null

      let weightKg = editForm.weight !== '' && editForm.weight != null ? Number(editForm.weight) : null

      if (heightUnit === 'ft' && heightCm) heightCm = heightCm * 30.48

      if (weightUnit === 'lbs' && weightKg) weightKg = weightKg * 0.453592



      await api.updateProfile({

        name: editForm.name,

        mobile: editForm.mobile || null,

        gender: editForm.gender,

        bloodType: editForm.bloodType || null,

        heightCm,

        weightKg,

        eyesightLeft: editForm.eyesightLeft || null,

        eyesightRight: editForm.eyesightRight || null,

        allergies: editForm.allergies,

      })

      await refreshProfile()

      setEditOpen(false)

    } catch (e) {

      setEditError(e.message || 'Failed to save profile')

    } finally {

      setSaving(false)

    }

  }



  if (loading || !profile) {
    return <div className="pe-loading">Loading profile...</div>
  }

  const heightDisplay = profile.heightCm ?? '—'
  const weightDisplay = profile.weightKg ?? '—'
  const bmiDisplay = profile.bmi ?? '—'
  const heightSparkline = generateMockTrend(profile.heightCm, 1)
  const weightSparkline = generateMockTrend(profile.weightKg, 2)

  return (
    <main className="profile-enterprise">
      <div className="profile-enterprise__grid">
        <aside className="profile-enterprise__left">
          <div className="pe-profile-card">
            <div className="pe-avatar-row">
              <div className="pe-avatar">{getInitial(profile.name)}</div>
              <div className="pe-avatar-info">
                <div className="pe-avatar-name">{profile.name}</div>
                <div className="pe-avatar-meta">
                  <span className="pe-avatar-country">{formatCountry(profile.country)}</span>
                  {(profile.verified || profile.doctorVerified) && (
                    <span className="pe-verified-pill">✓ Verified</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pe-hid-block">
              <div className="pe-hid-label">National Health ID</div>
              <div className="pe-hid-value">{profile.healthId}</div>
            </div>

            <div className="pe-meta-grid">
              <div className="pe-meta-chip">
                <div className="pe-meta-chip-label">Issued</div>
                <div className="pe-meta-chip-value">{getIssuedYear(profile)}</div>
              </div>
              <div className="pe-meta-chip">
                <div className="pe-meta-chip-label">Blood type</div>
                <div className="pe-meta-chip-value">{profile.bloodType || '—'}</div>
              </div>
              <div className="pe-meta-chip">
                <div className="pe-meta-chip-label">Age</div>
                <div className="pe-meta-chip-value">{getAge(profile)}</div>
              </div>
              <div className="pe-meta-chip">
                <div className="pe-meta-chip-label">Gender</div>
                <div className="pe-meta-chip-value">{formatGender(profile.gender)}</div>
              </div>
            </div>

            <button type="button" onClick={openEdit} className="pe-edit-btn">
              <span aria-hidden="true">✎</span>
              Edit Profile
            </button>
          </div>

          <div className="pe-summary-card">
            <div className="pe-summary-title">Quick Summary</div>
            <div className="pe-summary-row">
              <span className="pe-summary-key">Last visit</span>
              <span className="pe-summary-value">
                {profile.lastAiAnalysis
                  ? new Date(profile.lastAiAnalysis).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '12 Jun 2025'}
              </span>
            </div>
            <div className="pe-summary-row">
              <span className="pe-summary-key">Doctor</span>
              <span className="pe-summary-value">Dr. Perera</span>
            </div>
            <div className="pe-summary-row">
              <span className="pe-summary-key">Next appt.</span>
              <span className="pe-summary-value pe-summary-value--warn">30 Jun 2025</span>
            </div>
            <div className="pe-summary-row">
              <span className="pe-summary-key">Active Rx</span>
              <span className="pe-summary-value">2 active</span>
            </div>
          </div>
        </aside>

        <section className="profile-enterprise__center">
          <div className="pe-scan-viewport">

            <div className="pe-crosshair">
              <span className="pe-crosshair-label pe-crosshair-label--tl">X: 0.00</span>
              <span className="pe-crosshair-label pe-crosshair-label--tr">Y: 0.00</span>
              <span className="pe-crosshair-label pe-crosshair-label--bl">Z: 1.84m</span>
              <span className="pe-crosshair-label pe-crosshair-label--br">WT: {weightDisplay}kg</span>
            </div>
            <div className="pe-humanoid-wrap">
              <HumanoidFigure
                key={profile.gender || 'MALE'}
                gender={profile.gender || 'MALE'}
                onRegionClick={(region) => setActiveRegion((prev) => (prev === region ? null : region))}
                onRegionHover={setHoveredRegion}
                activeRegion={activeRegion}
              />
            </div>
          </div>

          <footer className="pe-scan-footer">
            <div className="pe-stat">
              <div className="pe-stat-label">Height</div>
              <div className="pe-stat-value">{heightDisplay} cm</div>
            </div>
            <div className="pe-stat">
              <div className="pe-stat-label">Weight</div>
              <div className="pe-stat-value">{weightDisplay} kg</div>
            </div>
            <div className="pe-stat">
              <div className="pe-stat-label">BMI</div>
              <div className="pe-stat-value pe-stat-value--warn">{bmiDisplay}</div>
            </div>
            <div className="pe-stat">
              <div className="pe-stat-label">Scan status</div>
              <div className="pe-stat-value pe-stat-value--accent">Active</div>
            </div>
          </footer>
        </section>

        <aside className="profile-enterprise__right">
          <OrganDetailsCard
            activeRegion={displayRegion}
            onClear={() => {
              setActiveRegion(null)
              setHoveredRegion(null)
            }}
            profile={profile}
          />
        </aside>
      </div>

      <section className="pe-tabs-section">
        <div className="pe-tabs-nav">
          {TABS.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(i)}
              className={`pe-tab-btn ${tab === i ? 'pe-tab-btn--active' : ''}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 0 && (
          <div>
            {vaccinations.map((v) => (
              <div key={v.id} className="pe-panel-card flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm">{v.vaccineName}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Dose {v.doseNumber} — {v.dateAdministered}
                  </p>
                </div>
                {v.nextDueDate && (
                  <span className="text-xs" style={{ color: '#1dc97f' }}>Next: {v.nextDueDate}</span>
                )}
              </div>
            ))}
            {vaccinations.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.45)' }}>No vaccinations recorded.</p>
            )}
          </div>
        )}

        {tab === 1 && (
          <div>
            {history.map((h) => (
              <div key={h.id} className="pe-panel-card">
                <p className="font-semibold text-sm">{h.conditionName}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Diagnosed: {h.diagnosedDate || '—'}
                </p>
              </div>
            ))}
            {history.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.45)' }}>No medical history recorded.</p>
            )}
          </div>
        )}

        {tab === 2 && (
          <div>
            {diseases.map((d) => (
              <div key={d.id} className="pe-panel-card">
                <p className="font-semibold text-sm">{d.conditionName}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Resolved: {d.resolvedDate}
                </p>
              </div>
            ))}
            {diseases.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.45)' }}>No previous diseases recorded.</p>
            )}
          </div>
        )}

        {tab === 3 && (
          <div className="pe-panel-card">
            <button
              type="button"
              onClick={runAiAnalysis}
              disabled={aiLoading}
              className="pe-edit-btn"
              style={{ width: 'auto', marginTop: 0, marginBottom: 16, padding: '8px 24px' }}
            >
              {aiLoading ? 'Analysing...' : 'Run AI Health Analysis'}
            </button>

            {(aiAnalysis || profile.aiHealthScore) && (
              <div className="space-y-5 text-sm">
                {aiAnalysis?.dietRecommendations?.length > 0 && (
                  <div className="pe-panel-card">
                    <h4 className="font-semibold mb-3" style={{ color: '#1dc97f' }}>
                      Healthy Diet Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {aiAnalysis.dietRecommendations.map((d) => (
                        <li key={d} className="flex gap-2">
                          <span className="shrink-0">🥗</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiAnalysis?.riskAreas?.map((r) => (
                  <p key={r} style={{ color: '#ef9f27' }}>⚠ {r}</p>
                ))}
                {aiAnalysis?.positiveIndicators?.map((p) => (
                  <p key={p} style={{ color: '#1dc97f' }}>✓ {p}</p>
                ))}
                {aiAnalysis?.lifestyleTips?.map((t) => <p key={t}>💡 {t}</p>)}
                {aiAnalysis?.nextCheckups?.map((c) => (
                  <p key={c} style={{ color: '#1dc97f' }}>📅 {c}</p>
                ))}
                {!aiAnalysis && profile.aiHealthScore && (
                  <pre className="text-xs whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {profile.aiHealthScore}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {editOpen && (
        <div className="pe-edit-overlay">
          <div className="pe-edit-backdrop" onClick={() => setEditOpen(false)} role="presentation" />

          <div className="pe-edit-drawer">
            <h2>Edit Profile</h2>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label>Name</label>
                <input
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="pe-edit-input"
                />
              </div>
              <div>
                <label>Gender</label>
                <select
                  value={editForm.gender || 'MALE'}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  className="pe-edit-input"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label>Mobile</label>
                <input
                  value={editForm.mobile || ''}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                  className="pe-edit-input"
                />
              </div>
              <div>
                <label>Blood Type</label>
                <select
                  value={editForm.bloodType || ''}
                  onChange={(e) => setEditForm({ ...editForm, bloodType: e.target.value })}
                  className="pe-edit-input"
                >
                  <option value="">Select</option>
                  {BLOOD_TYPES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between mb-1">
                  <label style={{ marginBottom: 0 }}>Height</label>
                  <button type="button" onClick={toggleHeightUnit} className="text-xs" style={{ color: '#1dc97f' }}>
                    {heightUnit}
                  </button>
                </div>
                <input
                  type="number"
                  value={editForm.height ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, height: e.target.value })}
                  className="pe-edit-input"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label style={{ marginBottom: 0 }}>Weight</label>
                  <button type="button" onClick={toggleWeightUnit} className="text-xs" style={{ color: '#1dc97f' }}>
                    {weightUnit}
                  </button>
                </div>
                <input
                  type="number"
                  value={editForm.weight ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                  className="pe-edit-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label>Eyesight Left</label>
                <input
                  value={editForm.eyesightLeft || ''}
                  onChange={(e) => setEditForm({ ...editForm, eyesightLeft: e.target.value })}
                  className="pe-edit-input"
                />
              </div>
              <div>
                <label>Eyesight Right</label>
                <input
                  value={editForm.eyesightRight || ''}
                  onChange={(e) => setEditForm({ ...editForm, eyesightRight: e.target.value })}
                  className="pe-edit-input"
                />
              </div>
            </div>

            <div className="mt-1">
              <label>Allergies (optional)</label>
              <div className="flex gap-2">
                <input
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                  className="pe-edit-input"
                  style={{ marginBottom: 0 }}
                  placeholder="Type and press Enter"
                />
                <button type="button" onClick={addAllergy} className="pe-edit-save" style={{ flex: '0 0 auto', padding: '6px 12px' }}>
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5 max-h-[60px] overflow-y-auto">
                {editForm.allergies?.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => removeAllergy(a)}
                    className="pe-allergy-tag pe-allergy-tag--danger"
                    title="Remove allergy"
                  >
                    {a} ×
                  </button>
                ))}
              </div>
            </div>

            {editError && <p style={{ color: '#f09595', fontSize: 13, margin: '8px 0' }}>{editError}</p>}

            <div className="pe-edit-actions mt-4">
              <button type="button" onClick={saveProfile} disabled={saving} className="pe-edit-save">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditOpen(false)} className="pe-edit-cancel">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )

}


