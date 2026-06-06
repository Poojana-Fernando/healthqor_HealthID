import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import AnimatedLogo from '../components/AnimatedLogo'

const SYMPTOMS = ['Headache', 'Fever', 'Cough', 'Fatigue', 'Nausea', 'Chest Pain', 'Dizziness', 'Sore Throat']

export default function HomePage() {
  const { user } = useAuth()
  const [selected, setSelected] = useState([])
  const [aiResult, setAiResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [doctors, setDoctors] = useState([])
  const [loc, setLoc] = useState(null)

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
        <div className="premium-glass rounded-3xl p-8 md:p-10 shadow-glass-glow-lg">
          <div className="flex flex-wrap gap-3 mb-8">
            {SYMPTOMS.map((s) => (
              <button
                key={s}
                onClick={() => toggleSymptom(s)}
                className={`symptom-chip ${selected.includes(s) ? 'symptom-chip-active' : ''}`}
              >
                {s}
              </button>
            ))}
          </div>
          {user ? (
            <button
              onClick={runSymptomCheck}
              disabled={loading || selected.length === 0}
              className="cta-premium px-8 py-3.5"
            >
              {loading ? 'Analysing...' : 'Check Symptoms'}
            </button>
          ) : (
            <p className="text-sm opacity-60">Login to use the AI Symptom Checker</p>
          )}
          {aiResult && (
            <div className="mt-8 p-6 premium-glass rounded-2xl space-y-5">
              {aiResult.recommendedSpecialty && (
                <p><span className="text-accent2 font-medium">Specialty:</span> {aiResult.recommendedSpecialty}</p>
              )}
              {aiResult.urgencyLevel && (
                <p><span className="text-accent2 font-medium">Urgency:</span> {aiResult.urgencyLevel}</p>
              )}
              <p className="text-sm opacity-70">{aiResult.disclaimer}</p>

              {aiResult.whatNotToDo?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-300 mb-2">What NOT to do</h4>
                  <ul className="space-y-1.5">
                    {aiResult.whatNotToDo.map((item) => (
                      <li key={item} className="text-sm flex gap-2">
                        <span className="text-red-400 shrink-0">✕</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiResult.recommendedArticles?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-accent2 mb-3">Recommended Articles</h4>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {aiResult.recommendedArticles.map((article) => (
                      <div key={article.title} className="glass p-4 rounded-xl text-sm stat-card-hover">
                        <p className="font-semibold mb-1">{article.title}</p>
                        <p className="opacity-70 text-xs leading-relaxed mb-2">{article.summary}</p>
                        {article.source && (
                          <p className="text-xs text-accent2 opacity-80">Source: {article.source}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiResult.nearbyDoctors?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-accent2 mb-3">Nearby Doctors</h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {aiResult.nearbyDoctors.slice(0, 4).map((d) => (
                      <div key={d.id} className="glass p-4 rounded-xl text-sm">
                        <p className="font-semibold">{d.name}</p>
                        <p className="opacity-60">{d.specialization} — {d.hospital}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <h2 className="text-3xl font-bold mb-8 tracking-tight">Personalised Health Guidance</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: 'Vaccination Tracker', desc: 'Keep all your immunisation records in one secure place.' },
            { title: 'BMI & Vitals', desc: 'Monitor your body metrics with doctor-verified data.' },
            { title: 'AI Health Analysis', desc: 'Get personalised lifestyle tips and checkup reminders.' },
          ].map((card) => (
            <div key={card.title} className="premium-glass rounded-2xl p-8 hover:shadow-glass-glow transition-all duration-300 hover:-translate-y-0.5">
              <h3 className="font-semibold text-accent2 mb-2">{card.title}</h3>
              <p className="text-sm opacity-70">{card.desc}</p>
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
              <p className="text-xs mt-1">★ {d.avgRating}</p>
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
