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

    birthDate: profile.birthDate || '',

  }

}

function calculateHealthScore(profile, history) {
  let score = 94 // Base healthy score
  
  // Deduct based on BMI
  const bmi = Number(profile.bmi)
  if (bmi) {
    if (bmi < 18.5 || (bmi >= 25 && bmi < 30)) {
      score -= 5 // Slightly underweight or overweight
    } else if (bmi >= 30) {
      score -= 12 // Obese
    }
  }
  
  // Deduct based on medical history
  if (history && history.length > 0) {
    score -= Math.min(15, history.length * 4)
  }
  
  // Deduct based on allergies
  if (profile.allergies && profile.allergies.length > 0) {
    score -= Math.min(7, profile.allergies.length * 2)
  }
  
  return Math.max(50, Math.min(100, score))
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



  const [hudCoords, setHudCoords] = useState({ x: '0.00', y: '0.00' })

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    setHudCoords({
      x: x.toFixed(2),
      y: y.toFixed(2),
    })
  }

  const handleMouseLeave = () => {
    setHudCoords({ x: '0.00', y: '0.00' })
  }



  useEffect(() => {

    if (!loading && !user) navigate('/login')

  }, [user, loading, navigate])



  useEffect(() => {

    if (!user) return

    api.getVaccinations().then(setVaccinations).catch(() => {})

    api.getMedicalHistory().then(setHistory).catch(() => {})

    api.getPreviousDiseases().then(setDiseases).catch(() => {})

  }, [user])

  useEffect(() => {
    setAiAnalysis(null)
  }, [tab, activeRegion])



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

        birthDate: editForm.birthDate || null,

        eyesightLeft: editForm.eyesightLeft || null,

        eyesightRight: editForm.eyesightRight || null,

        allergies: editForm.allergies,

      })

      await refreshProfile()
      setAiAnalysis(null)
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

  const healthScore = aiAnalysis ? calculateHealthScore(profile, history) : null

  const getRiskAreas = () => {
    if (aiAnalysis?.riskAreas && aiAnalysis.riskAreas.length > 0) {
      return aiAnalysis.riskAreas
    }
    const score = healthScore || 94
    if (score >= 90) {
      return [
        'Minimal physiological risk detected',
        'Monitor active hydration levels during heat cycles'
      ]
    } else if (score >= 75) {
      return [
        'Mild postural stress or sedentary fatigue potential',
        'Allergy sensitivity triggers should be monitored'
      ]
    } else {
      return [
        'Elevated BMI or vital fluctuations require clinical correlation',
        'Allergy risk and chronic history monitoring advised'
      ]
    }
  }

  const getLifestyleTips = () => {
    if (aiAnalysis?.lifestyleTips && aiAnalysis.lifestyleTips.length > 0) {
      return aiAnalysis.lifestyleTips
    }
    const score = healthScore || 94
    if (score >= 90) {
      return [
        'Maintain consistency with 7-8 hours of restful sleep',
        'Continue active physical conditioning (30 mins cardio daily)',
        'Optimize cognitive wellness with regular mindfulness breaks'
      ]
    } else {
      return [
        'Improve sleep hygiene: aim for a consistent sleep cycle',
        'Integrate stretching and daily active intervals',
        'Limit screen exposure 30 mins before sleep'
      ]
    }
  }

  const getNextCheckups = () => {
    if (aiAnalysis?.nextCheckups && aiAnalysis.nextCheckups.length > 0) {
      return aiAnalysis.nextCheckups
    }
    const score = healthScore || 94
    if (score >= 90) {
      return [
        'Routine health review in 6 months',
        'Standard dental and optical checkups annually'
      ]
    } else {
      return [
        'Routine lipid and vital panel in 3 months',
        'Clinical consult for allergy management review'
      ]
    }
  }

  const getDietRecommendations = () => {
    if (aiAnalysis?.dietRecommendations && aiAnalysis.dietRecommendations.length > 0) {
      return aiAnalysis.dietRecommendations
    }
    return [
      'Increase dietary fiber with whole grains and legumes',
      'Incorporate fresh seasonal fruits as daily snacks',
      'Optimize lean protein intake matching metabolic needs'
    ]
  }

  const tabData = [
    {
      title: 'Vaccinations',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      count: vaccinations.length,
      unit: 'Recorded',
      color: '#1dc97f',
      glow: 'rgba(29, 201, 127, 0.15)',
    },
    {
      title: 'Medical History',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      count: history.length,
      unit: 'Records',
      color: '#33b2ff',
      glow: 'rgba(51, 178, 255, 0.15)',
    },
    {
      title: 'Previous Diseases',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      count: diseases.length,
      unit: 'Resolved',
      color: '#ef9f27',
      glow: 'rgba(239, 159, 39, 0.15)',
    },
    {
      title: 'AI Analysis',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      count: healthScore ? `Score: ${healthScore}` : 'Ready',
      unit: healthScore ? 'Analysis' : 'Report',
      color: '#b280ff',
      glow: 'rgba(178, 128, 255, 0.15)',
    },
  ]

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

            <div className="pe-vitals-section">
              <div className="pe-vitals-title">Biometric Vitals</div>
              <div className="pe-vitals-grid">
                <div className="pe-vital-item">
                  <span className="pe-vital-label">Height</span>
                  <span className="pe-vital-value">{heightDisplay} cm</span>
                </div>
                <div className="pe-vital-item">
                  <span className="pe-vital-label">Weight</span>
                  <span className="pe-vital-value">{weightDisplay} kg</span>
                  {weightSparkline && <Sparkline data={weightSparkline} color="#5eead4" height={16} />}
                </div>
                <div className="pe-vital-item">
                  <span className="pe-vital-label">BMI</span>
                  <span className="pe-vital-value">
                    {bmiDisplay} <span className="pe-bmi-label">{getBmiLabel(profile.bmi)}</span>
                  </span>
                  {profile.bmi && (
                    <div className="pe-bmi-bar">
                      <div className="pe-bmi-bar-fill" style={{ width: `${getBmiBarPercent(profile.bmi)}%` }} />
                    </div>
                  )}
                </div>
                <div className="pe-vital-item pe-vital-item--eyesight">
                  <span className="pe-vital-label">Eyesight (L/R)</span>
                  <span className="pe-vital-value">
                    {profile.eyesightLeft || profile.eyesightRight
                      ? `${profile.eyesightLeft || '—'} / ${profile.eyesightRight || '—'}`
                      : '—'}
                  </span>
                </div>
              </div>

              {profile.allergies?.length > 0 && (
                <div className="pe-allergies-block">
                  <div className="pe-vital-label">Allergies</div>
                  <div className="pe-allergy-tags">
                    {profile.allergies.map((a) => (
                      <span key={a} className={`pe-allergy-tag ${getAllergyTagClass(a)}`}>
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button type="button" onClick={openEdit} className="pe-edit-btn">
              <span aria-hidden="true">✎</span>
              Edit Profile
            </button>
          </div>
        </aside>

        <section className="profile-enterprise__center">
          <div className="pe-scan-viewport" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>

            <div className="pe-crosshair">
              <span className="pe-crosshair-label pe-crosshair-label--tl">X: {hudCoords.x}</span>
              <span className="pe-crosshair-label pe-crosshair-label--tr">Y: {hudCoords.y}</span>
              <span className="pe-crosshair-label pe-crosshair-label--bl">
                Z: {profile.heightCm ? (profile.heightCm / 100).toFixed(2) + 'm' : '—'}
              </span>
              <span className="pe-crosshair-label pe-crosshair-label--br pe-scan-pulse">SCAN: ACTIVE</span>
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
        </section>

        <aside className="profile-enterprise__right" style={{ position: 'relative' }}>
          <div className={`pe-right-inactive-wrap ${displayRegion ? 'pe-right-inactive-wrap--hidden' : ''}`}>
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
          </div>

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
          {tabData.map((item, i) => (
            <button
              key={item.title}
              type="button"
              onClick={() => setTab(i)}
              className={`pe-tab-card ${tab === i ? 'pe-tab-card--active' : ''}`}
              style={{
                borderColor: tab === i ? `${item.color}35` : '',
                boxShadow: tab === i ? `0 8px 24px rgba(0,0,0,0.25), 0 0 15px ${item.glow}` : '',
              }}
            >
              <div 
                className="pe-tab-card-indicator" 
                style={{ background: `linear-gradient(90deg, ${item.color}, ${item.color}88)` }} 
              />
              
              <div className="flex items-center gap-3 w-full">
                <div 
                  className="pe-tab-icon-wrap"
                  style={{
                    color: item.color,
                    background: `${item.color}12`,
                  }}
                >
                  {item.icon}
                </div>
                <div>
                  <div className="pe-tab-card-title">{item.title}</div>
                  <div className="pe-tab-card-status">
                    <span className="pe-tab-card-count" style={{ color: tab === i ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                      {item.count}
                    </span>{' '}
                    <span className="pe-tab-card-unit">{item.unit}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {tab === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vaccinations.map((v) => (
              <div key={v.id} className="pe-feature-card pe-feature-card--vaccination">
                <div className="pe-feature-card-header">
                  <div className="pe-feature-badge pe-feature-badge--vaccination">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Administered</span>
                  </div>
                  {v.nextDueDate && (
                    <div className="pe-feature-next-due">
                      Next Due: {v.nextDueDate}
                    </div>
                  )}
                </div>
                <h4 className="pe-feature-name">{v.vaccineName}</h4>
                <div className="pe-feature-meta">
                  <div className="pe-feature-meta-item">
                    <span className="pe-feature-meta-label">Dose</span>
                    <span className="pe-feature-meta-value">{v.doseNumber}</span>
                  </div>
                  <div className="pe-feature-meta-item">
                    <span className="pe-feature-meta-label">Date</span>
                    <span className="pe-feature-meta-value">{v.dateAdministered}</span>
                  </div>
                </div>
              </div>
            ))}
            {vaccinations.length === 0 && (
              <div className="pe-ai-empty col-span-full">
                <p>No vaccinations recorded.</p>
              </div>
            )}
          </div>
        )}

        {tab === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history.map((h) => (
              <div key={h.id} className="pe-feature-card pe-feature-card--history">
                <div className="pe-feature-card-header">
                  <div className="pe-feature-badge pe-feature-badge--history">
                    <span className="pe-pulse-dot" />
                    <span>Active Condition</span>
                  </div>
                </div>
                <h4 className="pe-feature-name">{h.conditionName}</h4>
                <div className="pe-feature-meta">
                  <div className="pe-feature-meta-item">
                    <span className="pe-feature-meta-label">Diagnosed</span>
                    <span className="pe-feature-meta-value">{h.diagnosedDate || '—'}</span>
                  </div>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="pe-ai-empty col-span-full">
                <p>No medical history recorded.</p>
              </div>
            )}
          </div>
        )}

        {tab === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {diseases.map((d) => (
              <div key={d.id} className="pe-feature-card pe-feature-card--disease">
                <div className="pe-feature-card-header">
                  <div className="pe-feature-badge pe-feature-badge--disease">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Resolved</span>
                  </div>
                </div>
                <h4 className="pe-feature-name">{d.conditionName}</h4>
                <div className="pe-feature-meta">
                  <div className="pe-feature-meta-item">
                    <span className="pe-feature-meta-label">Resolved Date</span>
                    <span className="pe-feature-meta-value">{d.resolvedDate}</span>
                  </div>
                </div>
              </div>
            ))}
            {diseases.length === 0 && (
              <div className="pe-ai-empty col-span-full">
                <p>No previous diseases recorded.</p>
              </div>
            )}
          </div>
        )}

        {tab === 3 && (
          <div className="pe-ai-analysis-container">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: AI Score Gauge */}
              <div className="pe-ai-score-card">
                <div className="pe-ai-gauge-wrap">
                  <div className="pe-ai-gauge-circle">
                    <span className="pe-ai-gauge-score">
                      {healthScore ?? '—'}
                    </span>
                    <span className="pe-ai-gauge-label">HEALTH SCORE</span>
                  </div>
                  <div className="pe-ai-gauge-effect" />
                </div>
                <button
                  type="button"
                  onClick={runAiAnalysis}
                  disabled={aiLoading}
                  className="pe-ai-run-btn"
                >
                  {aiLoading ? (
                    <>
                      <span className="pe-spinner" /> Analyzing...
                    </>
                  ) : (
                    'Run AI Diagnostic'
                  )}
                </button>
              </div>

              {/* Right Column: Detailed Recommendations/Findings */}
              <div className="lg:col-span-2 space-y-4">
                {aiAnalysis ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Diet & Nutrition */}
                    <div className="pe-ai-subcard pe-ai-subcard--diet">
                      <h5 className="pe-ai-subcard-title">🥗 Diet & Nutrition</h5>
                      <ul className="pe-ai-list">
                        {getDietRecommendations().map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Lifestyle Tips */}
                    <div className="pe-ai-subcard pe-ai-subcard--lifestyle">
                      <h5 className="pe-ai-subcard-title">💡 Lifestyle & Sleep</h5>
                      <ul className="pe-ai-list">
                        {getLifestyleTips().map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Risk Monitor */}
                    <div className="pe-ai-subcard pe-ai-subcard--warning">
                      <h5 className="pe-ai-subcard-title">⚠️ Risk Monitor</h5>
                      <ul className="pe-ai-list text-yellow-500">
                        {getRiskAreas().map((risk, idx) => (
                          <li key={idx}>{risk}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Next Checkups */}
                    <div className="pe-ai-subcard pe-ai-subcard--checkup">
                      <h5 className="pe-ai-subcard-title">📅 Preventive Plan</h5>
                      <ul className="pe-ai-list text-emerald-400">
                        {getNextCheckups().map((chk, idx) => (
                          <li key={idx}>{chk}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="pe-ai-empty">
                    <span className="pe-ai-empty-icon">🤖</span>
                    <p>No active AI Analysis report. Trigger the Diagnostic Engine to generate recommendations.</p>
                  </div>
                )}
              </div>
            </div>
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
              <div>
                <label>Mobile</label>
                <input
                  value={editForm.mobile || ''}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                  className="pe-edit-input"
                />
              </div>
              <div>
                <label>Date of Birth</label>
                <input
                  type="date"
                  value={editForm.birthDate || ''}
                  onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
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


