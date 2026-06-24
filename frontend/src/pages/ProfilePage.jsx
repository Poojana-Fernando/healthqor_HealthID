import { useState, useEffect } from 'react'

import { useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

import { api } from '../api/client'

import HealthIdCard from '../components/HealthIdCard'

import HumanoidFigure from '../components/HumanoidFigure'
import OrganDetailsCard from '../components/OrganDetailsCard'
import Sparkline from '../components/Sparkline'



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

    return <div className="flex items-center justify-center min-h-[60vh] opacity-60">Loading profile...</div>

  }



  return (

    <main className="max-w-7xl mx-auto px-4 py-8">

      <div className="grid lg:grid-cols-12 gap-6">

        <div className="lg:col-span-3">

          <HealthIdCard profile={profile} compact />

          <button

            onClick={openEdit}

            className="w-full mt-4 bg-accent hover:bg-accent2 py-2 rounded-lg transition"

          >

            Edit Profile

          </button>

        </div>



        {/* Middle Column: 3D Humanoid Model (Full Scale) */}
        <div className="lg:col-span-6 border border-border rounded-2xl overflow-hidden h-[680px] bg-[#060e0a]">
          <HumanoidFigure 
            key={profile.gender || 'MALE'} 
            gender={profile.gender || 'MALE'} 
            onRegionClick={(region) => setActiveRegion((prev) => (prev === region ? null : region))}
            onRegionHover={setHoveredRegion}
            activeRegion={activeRegion}
          />
        </div>

        {/* Right Column: System Inspector & Health Stats Card */}
        <div className="lg:col-span-3">
          <OrganDetailsCard 
            activeRegion={displayRegion}
            onClear={() => {
              setActiveRegion(null)
              setHoveredRegion(null)
            }}
            profile={profile}
          />
        </div>

      </div>



      <div className="mt-8">

        <div className="flex gap-2 border-b border-border mb-4 overflow-x-auto">

          {TABS.map((t, i) => (

            <button

              key={t}

              onClick={() => setTab(i)}

              className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition ${

                tab === i ? 'border-accent text-accent2' : 'border-transparent opacity-60'

              }`}

            >

              {t}

            </button>

          ))}

        </div>



        {tab === 0 && (

          <div className="space-y-3">

            {vaccinations.map((v) => (

              <div key={v.id} className="glass rounded-xl p-4 flex justify-between">

                <div>

                  <p className="font-semibold">{v.vaccineName}</p>

                  <p className="text-sm opacity-60">Dose {v.doseNumber} — {v.dateAdministered}</p>

                </div>

                {v.nextDueDate && <span className="text-xs text-accent2">Next: {v.nextDueDate}</span>}

              </div>

            ))}

            {vaccinations.length === 0 && <p className="opacity-60">No vaccinations recorded.</p>}

          </div>

        )}



        {tab === 1 && (

          <div className="space-y-3">

            {history.map((h) => (

              <div key={h.id} className="glass rounded-xl p-4">

                <p className="font-semibold">{h.conditionName}</p>

                <p className="text-sm opacity-60">Diagnosed: {h.diagnosedDate || '—'}</p>

              </div>

            ))}

            {history.length === 0 && <p className="opacity-60">No medical history recorded.</p>}

          </div>

        )}



        {tab === 2 && (

          <div className="space-y-3">

            {diseases.map((d) => (

              <div key={d.id} className="glass rounded-xl p-4">

                <p className="font-semibold">{d.conditionName}</p>

                <p className="text-sm opacity-60">Resolved: {d.resolvedDate}</p>

              </div>

            ))}

            {diseases.length === 0 && <p className="opacity-60">No previous diseases recorded.</p>}

          </div>

        )}



        {tab === 3 && (

          <div className="glass rounded-2xl p-6">

            <button onClick={runAiAnalysis} disabled={aiLoading} className="bg-accent hover:bg-accent2 px-6 py-2 rounded-lg mb-4 disabled:opacity-50">

              {aiLoading ? 'Analysing...' : 'Run AI Health Analysis'}

            </button>

            {(aiAnalysis || profile.aiHealthScore) && (

              <div className="space-y-5 text-sm">

                {aiAnalysis?.dietRecommendations?.length > 0 && (

                  <div className="premium-glass rounded-xl p-4">

                    <h4 className="font-semibold text-accent2 mb-3">Healthy Diet Recommendations</h4>

                    <ul className="space-y-2">

                      {aiAnalysis.dietRecommendations.map((d) => (

                        <li key={d} className="flex gap-2">

                          <span className="text-accent shrink-0">🥗</span>

                          <span>{d}</span>

                        </li>

                      ))}

                    </ul>

                  </div>

                )}

                {aiAnalysis?.riskAreas?.map((r) => <p key={r} className="text-yellow-400">⚠ {r}</p>)}

                {aiAnalysis?.positiveIndicators?.map((p) => <p key={p} className="text-green-400">✓ {p}</p>)}

                {aiAnalysis?.lifestyleTips?.map((t) => <p key={t}>💡 {t}</p>)}

                {aiAnalysis?.nextCheckups?.map((c) => <p key={c} className="text-accent2">📅 {c}</p>)}

                {!aiAnalysis && profile.aiHealthScore && (

                  <pre className="text-xs opacity-70 whitespace-pre-wrap">{profile.aiHealthScore}</pre>

                )}

              </div>

            )}

          </div>

        )}

      </div>



      {editOpen && (

        <div className="fixed inset-0 z-50 flex justify-end">

          <div className="absolute inset-0 bg-black/50" onClick={() => setEditOpen(false)} />

          <div className="relative w-full max-w-md premium-glass h-full overflow-y-auto p-6 shadow-glass-glow-lg">

            <h2 className="text-xl font-bold mb-6">Edit Profile</h2>



            <div className="mb-4">

              <label className="text-xs text-accent2 block mb-1">Name</label>

              <input

                value={editForm.name || ''}

                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}

                className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2 text-sm"

              />

            </div>



            <div className="mb-4">

              <label className="text-xs text-accent2 block mb-1">Mobile</label>

              <input

                value={editForm.mobile || ''}

                onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}

                className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2 text-sm"

              />

            </div>



            <div className="mb-4">

              <label className="text-xs text-accent2 block mb-1">Gender</label>

              <select

                value={editForm.gender || 'MALE'}

                onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}

                className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2 text-sm"

              >

                <option value="MALE">Male</option>

                <option value="FEMALE">Female</option>

              </select>

            </div>



            <div className="mb-4">

              <label className="text-xs text-accent2 block mb-1">Blood Type</label>

              <select

                value={editForm.bloodType || ''}

                onChange={(e) => setEditForm({ ...editForm, bloodType: e.target.value })}

                className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2 text-sm"

              >

                <option value="">Select</option>

                {BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}

              </select>

            </div>



            <div className="grid grid-cols-2 gap-4 mb-4">

              <div>

                <div className="flex justify-between mb-1">

                  <label className="text-xs text-accent2">Height</label>

                  <button type="button" onClick={toggleHeightUnit} className="text-xs text-accent">

                    {heightUnit}

                  </button>

                </div>

                <input

                  type="number"

                  value={editForm.height ?? ''}

                  onChange={(e) => setEditForm({ ...editForm, height: e.target.value })}

                  className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2 text-sm"

                />

              </div>

              <div>

                <div className="flex justify-between mb-1">

                  <label className="text-xs text-accent2">Weight</label>

                  <button type="button" onClick={toggleWeightUnit} className="text-xs text-accent">

                    {weightUnit}

                  </button>

                </div>

                <input

                  type="number"

                  value={editForm.weight ?? ''}

                  onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}

                  className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2 text-sm"

                />

              </div>

            </div>



            <div className="grid grid-cols-2 gap-4 mb-4">

              <div>

                <label className="text-xs text-accent2 block mb-1">Eyesight Left</label>

                <input

                  value={editForm.eyesightLeft || ''}

                  onChange={(e) => setEditForm({ ...editForm, eyesightLeft: e.target.value })}

                  className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2 text-sm"

                />

              </div>

              <div>

                <label className="text-xs text-accent2 block mb-1">Eyesight Right</label>

                <input

                  value={editForm.eyesightRight || ''}

                  onChange={(e) => setEditForm({ ...editForm, eyesightRight: e.target.value })}

                  className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2 text-sm"

                />

              </div>

            </div>



            <div className="mb-4">

              <label className="text-xs text-accent2 block mb-1">Allergies (optional)</label>

              <div className="flex gap-2">

                <input

                  value={allergyInput}

                  onChange={(e) => setAllergyInput(e.target.value)}

                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}

                  className="flex-1 bg-navy/50 border border-border rounded-lg px-3 py-2 text-sm"

                  placeholder="Type and press Enter"

                />

                <button type="button" onClick={addAllergy} className="px-3 bg-accent rounded-lg">+</button>

              </div>

              <div className="flex flex-wrap gap-1 mt-2">

                {editForm.allergies?.map((a) => (

                  <button

                    key={a}

                    type="button"

                    onClick={() => removeAllergy(a)}

                    className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full hover:bg-red-500/30"

                    title="Remove allergy"

                  >

                    {a} ×

                  </button>

                ))}

              </div>

            </div>



            {editError && <p className="text-red-400 text-sm mb-4">{editError}</p>}



            <div className="flex gap-3 mt-6">

              <button

                onClick={saveProfile}

                disabled={saving}

                className="flex-1 bg-accent py-2 rounded-lg disabled:opacity-50"

              >

                {saving ? 'Saving...' : 'Save'}

              </button>

              <button onClick={() => setEditOpen(false)} className="flex-1 border border-border py-2 rounded-lg">

                Cancel

              </button>

            </div>

          </div>

        </div>

      )}

    </main>

  )

}


