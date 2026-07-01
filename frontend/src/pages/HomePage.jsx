import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import AnimatedLogo from '../components/AnimatedLogo'
import HumanoidFigure from '../components/HumanoidFigure'
import OrganDetailsCard from '../components/OrganDetailsCard'
import HealthIdLoadingIcon from '../components/ui/HealthIdLoadingIcon'
import LoadingButton from '../components/ui/LoadingButton'

const SYMPTOMS = [
  'Headache', 'Fever', 'Cough', 'Fatigue', 'Nausea', 'Chest Pain', 'Dizziness', 'Sore Throat',
  'Joint Pain', 'Back Pain', 'Shortness of Breath', 'Blurred Vision', 'Rash', 'Swelling',
  'Numbness', 'Abdominal Pain', 'Vomiting', 'Constipation', 'Diarrhea', 'Frequent Urination',
  'Weight Loss', 'Insomnia', 'Anxiety', 'Muscle Cramps', 'Runny Nose', 'Ear Pain',
  'Eye Redness', 'Loss of Appetite', 'Palpitations', 'Night Sweats'
]

const ORGAN_SYMPTOMS = {
  BRAIN: ['Headache', 'Dizziness', 'Fever', 'Blurred Vision', 'Numbness', 'Insomnia', 'Anxiety'],
  HEART: ['Chest Pain', 'Fatigue', 'Shortness of Breath', 'Palpitations', 'Dizziness', 'Swelling'],
  LUNGS: ['Cough', 'Sore Throat', 'Fatigue', 'Shortness of Breath', 'Runny Nose', 'Night Sweats'],
  LIVER: ['Nausea', 'Fever', 'Abdominal Pain', 'Loss of Appetite', 'Weight Loss', 'Vomiting'],
  STOMACH: ['Nausea', 'Abdominal Pain', 'Vomiting', 'Loss of Appetite', 'Constipation', 'Diarrhea'],
  KIDNEYS: ['Fever', 'Fatigue', 'Frequent Urination', 'Back Pain', 'Swelling', 'Night Sweats'],
  INTESTINES: ['Nausea', 'Fever', 'Abdominal Pain', 'Diarrhea', 'Constipation', 'Vomiting'],
  SKIN_LIMBS: ['Fatigue', 'Rash', 'Swelling', 'Joint Pain', 'Back Pain', 'Muscle Cramps', 'Numbness']
}

export default function HomePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [selected, setSelected] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeRegion, setActiveRegion] = useState(null)
  const [hoveredRegion, setHoveredRegion] = useState(null)
  const displayRegion = hoveredRegion || activeRegion
  const [aiResult, setAiResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [doctors, setDoctors] = useState([])
  const [loc, setLoc] = useState(null)

  const handleRegionClick = (region) => {
    setActiveRegion((prev) => (prev === region ? null : region))
  }

  const handleRegionHover = (region) => {
    setHoveredRegion(region)
  }

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setLoc({ lat: latitude, lng: longitude })
        api.nearbyDoctors(latitude, longitude, null)
          .then(setDoctors)
          .catch(() => {})
      },
      () => {
        api.searchDoctors({ available: true })
          .then(setDoctors)
          .catch(() => {})
      }
    )
  }, [])

  const toggleSymptom = (s) => {
    setSelected((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  const runSymptomCheck = async () => {
    if (!user || selected.length === 0) return
    setLoading(true)
    try {
      const res = await api.symptomCheck(
        selected.map((s) => s.toLowerCase()),
        loc?.lat,
        loc?.lng
      )
      setAiResult(res)
    } catch (e) {
      setAiResult({ disclaimer: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-28">
        <div className="max-w-2xl">
          <div className="flex items-center gap-5 mb-8">
            <AnimatedLogo size={64} />
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">
              Your Digital<br />
              <span className="text-gradient-health">Health Identity</span>
            </h1>
          </div>
          <p className="text-lg md:text-xl opacity-70 mb-10 leading-relaxed">
            Secure, encrypted health records. AI-powered guidance. Doctor-verified profiles. All in one Health ID.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <h2 className="text-3xl font-bold mb-8 tracking-tight">AI Symptom Checker</h2>
        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          {/* Column 1: 3D Model (Full Scale) */}
          <div className="lg:col-span-6 h-[680px]">
            <HumanoidFigure 
              gender={user?.gender || 'MALE'} 
              onRegionClick={handleRegionClick}
              onRegionHover={handleRegionHover}
              activeRegion={activeRegion}
            />
          </div>

          {/* Column 2: Organ Details & Health Stats Inspector */}
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

          {/* Column 3: AI Symptom Checker */}
          <div className="lg:col-span-3 premium-glass rounded-3xl p-6 md:p-8 shadow-glass-glow-lg h-auto lg:h-[520px] overflow-hidden">
            <div className="lg:grid lg:grid-cols-12 lg:gap-8 h-full min-h-0">
              
              {/* Left Column: Symptom Selection */}
              <div className="lg:col-span-5 flex flex-col justify-between h-full min-h-0">
                <div className="flex flex-col min-h-0 flex-1">
                  <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="text-sm font-mono text-accent2 uppercase tracking-wider">
                      {activeRegion ? `${activeRegion === 'SKIN_LIMBS' ? 'SKIN & LIMBS' : activeRegion} SYMPTOMS` : 'SELECT SYMPTOMS'}
                    </h3>
                    {activeRegion && (
                      <button 
                        onClick={() => setActiveRegion(null)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors uppercase font-mono tracking-wider"
                      >
                        Clear Filter [x]
                      </button>
                    )}
                  </div>

                  {/* Search box */}
                  <div className="relative mb-4 shrink-0">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search symptoms..."
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-accent2/50 focus:ring-1 focus:ring-accent2/30 transition-all duration-200"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Scrollable list of chips */}
                  <div className="overflow-y-auto overflow-x-hidden pr-1.5 mb-4 flex-1 custom-scrollbar max-h-[200px] lg:max-h-none">
                    <div className="flex flex-wrap gap-2">
                      {SYMPTOMS
                        .filter((s) => !searchQuery || s.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((s) => {
                          const isSuggested = !activeRegion || (ORGAN_SYMPTOMS[activeRegion] && ORGAN_SYMPTOMS[activeRegion].includes(s));
                          return (
                            <button
                              key={s}
                              onClick={() => toggleSymptom(s)}
                              className={`symptom-chip ${selected.includes(s) ? 'symptom-chip-active' : ''} ${!isSuggested ? 'opacity-25' : ''}`}
                            >
                              {s}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Left Column Action Bar */}
                <div className="pt-4 border-t border-white/10 shrink-0">
                  {user ? (
                    <div className="flex flex-wrap gap-4 items-center">
                      <LoadingButton
                        onClick={runSymptomCheck}
                        disabled={selected.length === 0}
                        loading={loading}
                        loadingLabel="Analysing..."
                        size="cta"
                      >
                        Check Symptoms
                      </LoadingButton>
                      {activeRegion && (
                        <span className="text-xs text-accent2/70 font-mono animate-pulse">
                          Filtered by 3D target
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs opacity-60">Login to use the AI Symptom Checker</p>
                  )}
                </div>
              </div>

              {/* Right Column: AI Diagnosis Results */}
              <div className={`lg:col-span-7 border-t border-white/10 mt-6 pt-6 lg:border-t-0 lg:border-l lg:border-white/10 lg:mt-0 lg:pt-0 lg:pl-8 flex flex-col min-h-0 h-full ${(!loading && !aiResult) ? 'hidden lg:flex' : 'flex'}`}>
                
                {/* Empty State */}
                {!loading && !aiResult && (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center text-white/40">
                    <svg className="w-8 h-8 mb-3 text-accent2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <p className="text-xs font-medium max-w-[280px]">Select your symptoms on the left and check to view the AI medical guidance.</p>
                  </div>
                )}

                {/* Loading State */}
                {loading && (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center gap-3">
                    <HealthIdLoadingIcon size="lg" label="Analyzing symptoms" />
                    <p className="text-xs text-accent2 font-mono uppercase tracking-wider">Analyzing Symptoms with AI...</p>
                  </div>
                )}

                {/* Results Panel */}
                {!loading && aiResult && (
                  <div className="flex-1 flex flex-col min-h-0 h-full justify-between">
                    <div className="overflow-y-auto overflow-x-hidden pr-1.5 space-y-4 flex-1 custom-scrollbar">
                      
                      {/* Header Summary Row */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                        <div>
                          <span className="text-[10px] text-white/40 block font-mono uppercase tracking-wider">Recommended Specialty</span>
                          <span className="text-xs font-semibold text-accent2">{aiResult.recommendedSpecialty || 'General Practitioner'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-white/40 block font-mono uppercase tracking-wider mb-0.5">Urgency Level</span>
                          <span className={`urgency-badge urgency-badge-${aiResult.urgencyLevel === 'emergency' ? 'high' : aiResult.urgencyLevel}`}>
                            {aiResult.urgencyLevel?.toUpperCase() || 'LOW'}
                          </span>
                        </div>
                      </div>

                      {/* Emergency Alert */}
                      {(aiResult.urgencyLevel === 'emergency' || aiResult.urgencyLevel === 'high') && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs flex items-start gap-2.5">
                          <span className="text-red-400 text-sm leading-none shrink-0">⚠</span>
                          <div>
                            <p className="text-red-300 font-semibold">Seek immediate medical attention</p>
                            <p className="text-red-200/80 mt-0.5">
                              Sri Lanka Emergency Ambulance: <a href="tel:1990" className="text-red-300 font-bold underline">1990</a> (Suwa Seriya)
                            </p>
                          </div>
                        </div>
                      )}

                      {/* What NOT to do */}
                      {aiResult.whatNotToDo?.length > 0 && (
                        <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                          <h4 className="text-xs font-semibold text-red-300 mb-1.5 flex items-center gap-1.5">
                            <span className="text-xs">✕</span> What NOT to do
                          </h4>
                          <ul className="space-y-1">
                            {aiResult.whatNotToDo.map((item) => (
                              <li key={item} className="text-xs text-white/80 flex gap-2">
                                <span className="text-red-400 shrink-0">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommended Articles */}
                      {aiResult.recommendedArticles?.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-semibold text-accent2 uppercase tracking-wider mb-2 font-mono">Recommended Articles</h4>
                          <div className="space-y-2">
                            {aiResult.recommendedArticles.map((article) => (
                              <div key={article.title} className="bg-white/5 border border-white/10 p-2.5 rounded-xl hover:bg-white/10 transition-colors duration-200">
                                <p className="text-xs font-semibold text-white/90">{article.title}</p>
                                <p className="text-[10px] text-white/60 leading-relaxed mt-0.5">{article.summary}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Nearby Doctors */}
                      {aiResult.nearbyDoctors?.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-semibold text-accent2 uppercase tracking-wider mb-2 font-mono">Nearby Doctors</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {aiResult.nearbyDoctors.slice(0, 4).map((d) => (
                              <div key={d.id} className="bg-white/5 border border-white/10 p-2.5 rounded-xl flex flex-col justify-between">
                                <div>
                                  <p className="text-xs font-semibold text-white/90 truncate">{d.name}</p>
                                  <p className="text-[10px] text-white/60 truncate">{d.specialization}</p>
                                  <p className="text-[9px] text-white/40 truncate">{d.hospital}</p>
                                </div>
                                <button
                                  onClick={() => navigate('/echanneling')}
                                  className="mt-2 text-[10px] text-accent2 hover:text-accent font-mono uppercase tracking-wider transition-colors duration-200 text-left"
                                >
                                  Book Appointment →
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Disclaimer */}
                      {aiResult.disclaimer && (
                        <p className="text-[9px] text-white/40 leading-relaxed border-t border-white/5 pt-2.5">
                          <span className="font-semibold text-white/50">Disclaimer:</span> {aiResult.disclaimer}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <h2 className="text-3xl font-bold mb-8 tracking-tight">Personalised Health Guidance</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: '3D HealthID & AI Diagnostics',
              desc: 'Explore your interactive 3D humanoid body map and trigger the AI Diagnostic Engine for custom recommendations.',
              path: '/profile',
              btnText: 'View 3D Profile'
            },
            {
              title: 'E-Channeling & Appointment Booking',
              desc: 'Search for specialized doctors, check live availability, and book slots instantly with automated confirmation.',
              path: '/echanneling',
              btnText: 'Book Appointment'
            },
            {
              title: 'Interactive Facility & Route Map',
              desc: 'Locate nearby hospitals and care clinics on a dynamic map with automated route finding and navigation help.',
              path: '/find-care',
              btnText: 'Find Care Map'
            },
          ].map((card) => (
            <div
              key={card.title}
              onClick={() => navigate(card.path)}
              className="premium-glass rounded-2xl p-8 hover:shadow-glass-glow transition-all duration-300 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between h-full group"
            >
              <div>
                <h3 className="font-semibold text-accent2 mb-2">{card.title}</h3>
                <p className="text-sm opacity-70 mb-6">{card.desc}</p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent transition-all duration-300 group-hover:text-accent2 mt-auto">
                <span>{card.btnText}</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16 md:py-20 pb-28">
        <h2 className="text-3xl font-bold mb-8 tracking-tight">Doctors Near Me</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.slice(0, 6).map((d) => (
            <div key={d.id} className="premium-glass rounded-2xl p-6 transition-all duration-300 hover:shadow-glass-glow hover:-translate-y-0.5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-sm text-accent2">{d.specialization}</p>
                  <p className="text-xs opacity-60 mt-1">{d.hospital}</p>
                </div>
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                  {d.available ? 'Available' : 'Busy'}
                </span>
              </div>
              {d.distanceKm != null && (
                <p className="text-xs opacity-50 mt-2">{d.distanceKm.toFixed(1)} km away</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs">★ {d.avgRating}</p>
                <button
                  onClick={() => navigate('/echanneling')}
                  className="text-xs text-accent2 hover:text-accent font-mono uppercase tracking-wider transition-colors duration-200"
                >
                  Book →
                </button>
              </div>
            </div>
          ))}
          {doctors.length === 0 && (
            <p className="opacity-60 col-span-full">No doctors found nearby. Enable location or try e-Channeling.</p>
          )}
        </div>
      </section>
    </main>
  )
}
