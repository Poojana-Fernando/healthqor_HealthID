import { useState, useEffect } from 'react'

import { useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

import { api } from '../api/client'

import HumanoidFigure from '../components/HumanoidFigure'
import OrganDetailsCard from '../components/OrganDetailsCard'
import Sparkline from '../components/Sparkline'
import MedicalReportSummaryWidget from '../components/profile/MedicalReportSummaryWidget'
import ProfileDashboardTabs from '../components/profile/ProfileDashboardTabs'
import HealthIdLoadingIcon from '../components/ui/HealthIdLoadingIcon'
import LoadingButton from '../components/ui/LoadingButton'
import './ProfilePage.css'

const TABS = ['Medical Reports', 'Prescriptions', 'Report Analysis', 'Vitals Trends', 'Health Summary']

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function formatCountry(country) {
  if (!country) return '—'
  if (country === 'LK') return 'Sri Lanka · LK'
  return country
}

function formatGender(gender) {
  if (!gender) return '—'
  const value = String(gender).trim().toUpperCase()
  if (value === 'FEMALE') return 'Female'
  if (value === 'MALE') return 'Male'
  return '—'
}

function getInitial(name) {
  return name?.trim()?.[0]?.toUpperCase() || 'P'
}

function getBirthYear(profile) {
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

    emergencyContactName: profile.emergencyContactName || '',

    emergencyContactPhone: profile.emergencyContactPhone || '',

  }

}

export default function ProfilePage() {

  const { user, profile, loading, refreshProfile } = useAuth()

  const navigate = useNavigate()

  const [tab, setTab] = useState(0)

  const [medicalReports, setMedicalReports] = useState([])

  const [appointments, setAppointments] = useState([])

  const [activePrescriptions, setActivePrescriptions] = useState([])

  const [allPrescriptions, setAllPrescriptions] = useState([])

  const [vitalsHistory, setVitalsHistory] = useState([])

  const [reportAnalysisCount, setReportAnalysisCount] = useState(0)

  const [editOpen, setEditOpen] = useState(false)

  const [editForm, setEditForm] = useState({})

  const [heightUnit, setHeightUnit] = useState('cm')

  const [weightUnit, setWeightUnit] = useState('kg')

  const [allergyInput, setAllergyInput] = useState('')

  const [editError, setEditError] = useState('')

  const [saving, setSaving] = useState(false)
  const [activeRegion, setActiveRegion] = useState(null)
  const [hoveredRegion, setHoveredRegion] = useState(null)
  const displayRegion = hoveredRegion || activeRegion



  const [hudCoords, setHudCoords] = useState({ x: '0.00', y: '0.00' })
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (profile?.healthId) {
      navigator.clipboard.writeText(profile.healthId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

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

    api.getMedicalReports().then(setMedicalReports).catch(() => {})

    api.myAppointments().then(setAppointments).catch(() => {})

    api.getActivePrescriptions().then(setActivePrescriptions).catch(() => {})

    api.getAllPrescriptions().then(setAllPrescriptions).catch(() => {})

    api.getVitalsHistory().then(setVitalsHistory).catch(() => {})

    api.getReportAnalysisHistory().then((h) => setReportAnalysisCount(h?.length || 0)).catch(() => {})

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

        emergencyContactName: editForm.emergencyContactName || null,

        emergencyContactPhone: editForm.emergencyContactPhone || null,

      })

      await refreshProfile()
      api.getVitalsHistory().then(setVitalsHistory).catch(() => {})
      setEditOpen(false)

    } catch (e) {

      setEditError(e.message || 'Failed to save profile')

    } finally {

      setSaving(false)

    }

  }



  if (loading || !profile) {
    return (
      <div className="pe-loading">
        <HealthIdLoadingIcon size="lg" label="Loading profile" showLabel />
      </div>
    )
  }

  const heightDisplay = profile.heightCm ?? '—'
  const weightDisplay = profile.weightKg ?? '—'
  const bmiDisplay = profile.bmi ?? '—'
  const weightTrend = (vitalsHistory || [])
    .map((s) => Number(s.weightKg))
    .filter((v) => !Number.isNaN(v))

  const latestReport = medicalReports[0] ?? null

  const tabData = [
    {
      title: 'Medical Reports',
      count: medicalReports.length,
      unit: 'Reports',
      color: '#1dc97f',
      glow: 'rgba(29, 201, 127, 0.15)',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      title: 'Prescriptions',
      count: activePrescriptions.length,
      unit: 'Active',
      color: '#33b2ff',
      glow: 'rgba(51, 178, 255, 0.15)',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
    },
    {
      title: 'Report Analysis',
      count: reportAnalysisCount,
      unit: 'Analyzed',
      color: '#b280ff',
      glow: 'rgba(178, 128, 255, 0.15)',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: 'Vitals Trends',
      count: vitalsHistory.length,
      unit: 'Readings',
      color: '#ef9f27',
      glow: 'rgba(239, 159, 39, 0.15)',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
    },
    {
      title: 'Health Summary',
      count: 'Card',
      unit: 'QR',
      color: '#e879f9',
      glow: 'rgba(232, 121, 249, 0.15)',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
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
              <div className="pe-hid-value-wrapper">
                <div className="pe-hid-value">{profile.healthId}</div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="pe-hid-copy-btn"
                  title="Copy National Health ID"
                >
                  {copied ? (
                    <svg className="pe-hid-copy-icon pe-hid-copy-icon--success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg className="pe-hid-copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="pe-meta-grid">
              <div className="pe-meta-chip">
                <div className="pe-meta-chip-label">Birth Year</div>
                <div className="pe-meta-chip-value">{getBirthYear(profile)}</div>
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
                  {weightTrend.length >= 2 && (
                    <Sparkline data={weightTrend} color="#5eead4" height={16} />
                  )}
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
            <MedicalReportSummaryWidget
              latestReport={latestReport}
              activeRxCount={activePrescriptions.length}
              onViewAll={() => setTab(0)}
            />
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

        <ProfileDashboardTabs
          tab={tab}
          medicalReports={medicalReports}
          appointments={appointments}
          activePrescriptions={activePrescriptions}
          allPrescriptions={allPrescriptions}
          vitalsHistory={vitalsHistory}
          profile={profile}
        />
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

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label>Emergency Contact Name</label>
                <input
                  value={editForm.emergencyContactName || ''}
                  onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                  className="pe-edit-input"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label>Emergency Contact Phone</label>
                <input
                  value={editForm.emergencyContactPhone || ''}
                  onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })}
                  className="pe-edit-input"
                  placeholder="Optional"
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
              <LoadingButton type="button" onClick={saveProfile} loading={saving} loadingLabel="Saving..." variant="enterprise">
                Save
              </LoadingButton>
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


