import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useChatbot } from '../context/ChatbotContext'
import { api } from '../api/client'
import AnimatedLogo from '../components/AnimatedLogo'
import {
  partnerHospitals,
  sampleTestimonials,
  wellnessTips,
  journeySteps,
} from '../data/homepageContent'
import { getBookingDraft, hasUnreadReport } from '../utils/homepageStorage'

const ACTIVE_APPT_STATUSES = new Set(['PENDING', 'CONFIRMED'])

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function formatDateTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export default function HomePage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const { openChat } = useChatbot()
  const navigate = useNavigate()

  const [doctors, setDoctors] = useState([])
  const [loc, setLoc] = useState(null)

  const [appointments, setAppointments] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [medicalReports, setMedicalReports] = useState([])
  const [snapshotLoading, setSnapshotLoading] = useState(false)

  const [bookingDraft, setBookingDraft] = useState(() => getBookingDraft())

  useEffect(() => {
    const refreshDraft = () => setBookingDraft(getBookingDraft())
    window.addEventListener('focus', refreshDraft)
    window.addEventListener('storage', refreshDraft)
    return () => {
      window.removeEventListener('focus', refreshDraft)
      window.removeEventListener('storage', refreshDraft)
    }
  }, [])

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

  useEffect(() => {
    if (!user) {
      setAppointments([])
      setPrescriptions([])
      setMedicalReports([])
      return
    }
    setSnapshotLoading(true)
    Promise.all([
      api.myAppointments().catch(() => []),
      api.getActivePrescriptions().catch(() => []),
      api.getMedicalReports().catch(() => []),
    ])
      .then(([appts, rx, reports]) => {
        setAppointments(appts)
        setPrescriptions(rx)
        setMedicalReports(reports)
      })
      .finally(() => setSnapshotLoading(false))
  }, [user])

  const nextAppointment = useMemo(() => {
    const now = Date.now()
    return appointments
      .filter((a) => ACTIVE_APPT_STATUSES.has(a.status))
      .filter((a) => a.scheduledAt && new Date(a.scheduledAt).getTime() >= now)
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0]
  }, [appointments])

  const latestReport = medicalReports[0] ?? null
  const unreadReport = user && latestReport && hasUnreadReport(latestReport)
  const showContinueBooking = Boolean(bookingDraft?.doctorId)
  const showContinueSection = showContinueBooking || unreadReport

  const serviceTiles = [
    {
      titleKey: 'serviceDashboard',
      descKey: 'serviceDashboardDesc',
      path: '/profile',
      tab: 4,
      large: true,
    },
    {
      titleKey: 'serviceBook',
      descKey: 'serviceBookDesc',
      path: '/echanneling',
    },
    {
      titleKey: 'serviceFindCare',
      descKey: 'serviceFindCareDesc',
      path: '/find-care',
    },
    {
      titleKey: 'serviceLabReports',
      descKey: 'serviceLabReportsDesc',
      path: '/profile',
      tab: 2,
    },
    {
      titleKey: 'servicePrescriptions',
      descKey: 'servicePrescriptionsDesc',
      path: '/profile',
      tab: 1,
    },
    {
      titleKey: 'serviceSupport',
      descKey: 'serviceSupportDesc',
      path: '/support',
    },
  ]

  const goProfileTab = (tab) => navigate('/profile', { state: { tab } })

  return (
    <main>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="max-w-3xl">
            <div className="flex items-center gap-4 mb-6">
              <AnimatedLogo size={56} />
              <span className="text-xs font-mono uppercase tracking-wider text-accent2/80">Healthqor Health ID</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6">
              {t('heroHeadline')}{' '}
              <span className="text-gradient-health">{t('heroHeadlineAccent')}</span>
              <br />
              {t('heroHeadlineEnd')}
            </h1>
            <p className="text-lg md:text-xl opacity-70 mb-8 leading-relaxed max-w-xl">
              {t('heroSubcopy')}
            </p>

            <div className="flex flex-wrap gap-3 mb-8">
              <span className="text-xs bg-emerald-500/10 text-accent2 px-3 py-1.5 rounded-full border border-emerald-400/25">
                {t('trustEncrypted')}
              </span>
              <span className="text-xs bg-emerald-500/10 text-accent2 px-3 py-1.5 rounded-full border border-emerald-400/25">
                ✓ {t('trustVerified')}
              </span>
              <span className="text-xs bg-emerald-500/10 text-accent2 px-3 py-1.5 rounded-full border border-emerald-400/25">
                🪪 {t('trustHidFormat')}
              </span>
            </div>

            <div className="flex flex-wrap gap-4">
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className="px-6 py-3 rounded-xl bg-accent hover:bg-accent2 text-white font-semibold transition"
                  >
                    {t('ctaOpenDashboard')}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/echanneling')}
                    className="px-6 py-3 rounded-xl border border-white/20 hover:border-accent2 transition font-semibold"
                  >
                    {t('ctaBookAppointment')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/signup')}
                    className="px-6 py-3 rounded-xl bg-accent hover:bg-accent2 text-white font-semibold transition"
                  >
                    {t('ctaCreateHealthId')}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="px-6 py-3 rounded-xl border border-white/20 hover:border-accent2 transition font-semibold"
                  >
                    {t('ctaLogin')}
                  </button>
                </>
              )}
            </div>
        </div>
      </section>

      {/* Continue where you left off */}
      {showContinueSection && (
        <section className="max-w-7xl mx-auto px-6 pb-8">
          <h2 className="text-xl font-bold mb-4 tracking-tight">{t('continueTitle')}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {showContinueBooking && (
              <button
                type="button"
                onClick={() => navigate('/echanneling')}
                className="premium-glass rounded-2xl p-5 text-left hover:shadow-glass-glow transition-all duration-300 hover:-translate-y-0.5 group"
              >
                <p className="text-sm opacity-70 mb-1">{t('continueBooking')}</p>
                <p className="font-semibold text-accent2">Dr. {bookingDraft.doctorName}</p>
                <p className="text-xs opacity-50 mt-1">{bookingDraft.specialization} · {bookingDraft.hospital}</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent mt-3 group-hover:text-accent2">
                  {t('continueResume')} →
                </span>
              </button>
            )}
            {unreadReport && (
              <button
                type="button"
                onClick={() => goProfileTab(0)}
                className="premium-glass rounded-2xl p-5 text-left hover:shadow-glass-glow transition-all duration-300 hover:-translate-y-0.5 group border border-accent2/20"
              >
                <p className="text-sm opacity-70 mb-1">{t('continueReport')}</p>
                <p className="font-semibold text-accent2">Dr. {latestReport.doctorName}</p>
                <p className="text-xs opacity-50 mt-1">{formatDate(latestReport.createdAt)}</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent mt-3 group-hover:text-accent2">
                  {t('continueViewReport')} →
                </span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Health snapshot */}
      <section className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <h2 className="text-3xl font-bold mb-8 tracking-tight">{t('snapshotTitle')}</h2>
        {user ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => navigate('/echanneling')}
              className="premium-glass rounded-2xl p-5 text-left hover:shadow-glass-glow transition"
            >
              <p className="text-xs uppercase tracking-wider opacity-50 mb-2">{t('snapshotNextAppt')}</p>
              {snapshotLoading ? (
                <p className="text-sm opacity-50">Loading…</p>
              ) : nextAppointment ? (
                <>
                  <p className="font-semibold truncate">{nextAppointment.doctorName}</p>
                  <p className="text-sm text-accent2">{formatDateTime(nextAppointment.scheduledAt)}</p>
                </>
              ) : (
                <p className="text-sm opacity-60">{t('snapshotNone')}</p>
              )}
            </button>
            <button
              type="button"
              onClick={() => goProfileTab(1)}
              className="premium-glass rounded-2xl p-5 text-left hover:shadow-glass-glow transition"
            >
              <p className="text-xs uppercase tracking-wider opacity-50 mb-2">{t('snapshotActiveRx')}</p>
              <p className="text-3xl font-bold text-accent2">
                {snapshotLoading ? '…' : prescriptions.length}
              </p>
            </button>
            <button
              type="button"
              onClick={() => goProfileTab(0)}
              className="premium-glass rounded-2xl p-5 text-left hover:shadow-glass-glow transition"
            >
              <p className="text-xs uppercase tracking-wider opacity-50 mb-2">{t('snapshotLastVisit')}</p>
              {snapshotLoading ? (
                <p className="text-sm opacity-50">Loading…</p>
              ) : latestReport ? (
                <>
                  <p className="font-semibold truncate">Dr. {latestReport.doctorName}</p>
                  <p className="text-sm opacity-60">{formatDate(latestReport.visitDate || latestReport.createdAt)}</p>
                </>
              ) : (
                <p className="text-sm opacity-60">{t('snapshotNone')}</p>
              )}
            </button>
            <button
              type="button"
              onClick={() => goProfileTab(0)}
              className="premium-glass rounded-2xl p-5 text-left hover:shadow-glass-glow transition"
            >
              <p className="text-xs uppercase tracking-wider opacity-50 mb-2">{t('snapshotFollowUp')}</p>
              {snapshotLoading ? (
                <p className="text-sm opacity-50">Loading…</p>
              ) : latestReport?.followUpDate ? (
                <p className="font-semibold text-accent2">{formatDate(latestReport.followUpDate)}</p>
              ) : (
                <p className="text-sm opacity-60">{t('snapshotNone')}</p>
              )}
            </button>
          </div>
        ) : (
          <div className="premium-glass rounded-3xl p-8 relative overflow-hidden">
            <div className="grid sm:grid-cols-4 gap-4 blur-sm pointer-events-none select-none opacity-40">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white/10 rounded-2xl h-24" />
              ))}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <p className="text-lg opacity-80 mb-4 max-w-md">{t('snapshotGuest')}</p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent2 text-white font-semibold transition"
              >
                {t('snapshotGuestCta')}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <h2 className="text-3xl font-bold mb-8 tracking-tight">{t('journeyTitle')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {journeySteps.map((step) => (
            <div key={step.num} className="premium-glass rounded-2xl p-6">
              <span className="text-3xl font-bold text-gradient-health font-mono">{step.num}</span>
              <h3 className="font-semibold text-accent2 mt-3 mb-2">{t(step.key)}</h3>
              <p className="text-sm opacity-70">{t(step.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Patient services bento */}
      <section className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <h2 className="text-3xl font-bold mb-8 tracking-tight">{t('servicesTitle')}</h2>
        <div className="grid md:grid-cols-3 gap-4 auto-rows-fr">
          {serviceTiles.map((tile) => (
            <div
              key={tile.titleKey}
              onClick={() => (tile.tab != null ? goProfileTab(tile.tab) : navigate(tile.path))}
              className={`premium-glass rounded-2xl p-6 hover:shadow-glass-glow transition-all duration-300 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between group ${
                tile.large ? 'md:col-span-2 md:row-span-2 min-h-[220px]' : 'min-h-[140px]'
              }`}
            >
              <div>
                <h3 className={`font-semibold text-accent2 mb-2 ${tile.large ? 'text-xl' : ''}`}>
                  {t(tile.titleKey)}
                </h3>
                <p className={`opacity-70 ${tile.large ? 'text-base' : 'text-sm'}`}>{t(tile.descKey)}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent mt-4 group-hover:text-accent2">
                →
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Health ID explainer */}
      <section className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <div className="premium-glass rounded-3xl p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-4 tracking-tight">{t('hidTitle')}</h2>
          <p className="text-lg opacity-70 mb-4 max-w-3xl leading-relaxed">{t('hidDesc')}</p>
          <p className="text-sm opacity-60 mb-6 max-w-3xl">{t('hidQr')}</p>
          <code className="inline-block text-sm font-mono bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-accent2 mb-6">
            HID-LK-2026-A1B2C3D4-X9K2
          </code>
          {!user && (
            <div>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="px-6 py-3 rounded-xl bg-accent hover:bg-accent2 text-white font-semibold transition"
              >
                {t('hidCta')}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Wellness tips */}
      <section className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <h2 className="text-3xl font-bold tracking-tight">{t('wellnessTitle')}</h2>
          <button
            type="button"
            onClick={openChat}
            className="px-5 py-2.5 rounded-xl border border-accent2/40 text-accent2 hover:bg-accent2/10 text-sm font-semibold transition"
          >
            {t('wellnessCta')}
          </button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {wellnessTips.map((tip) => (
            <div key={tip.title} className="premium-glass rounded-2xl p-5">
              <h3 className="font-semibold text-accent2 mb-2">{tip.title}</h3>
              <p className="text-sm opacity-70">{tip.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials & partners */}
      <section className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <h2 className="text-3xl font-bold mb-6 tracking-tight">{t('partnersTitle')}</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-4 items-center mb-2">
          {partnerHospitals.map((name) => (
            <span key={name} className="text-sm md:text-base font-semibold opacity-70 tracking-wide">
              {name}
            </span>
          ))}
        </div>
        <p className="text-xs opacity-40 mb-12">{t('partnersCaption')}</p>

        <h2 className="text-2xl font-bold mb-6 tracking-tight">{t('testimonialsTitle')}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {sampleTestimonials.map((item) => (
            <div key={item.name} className="premium-glass rounded-2xl p-6">
              <span className="text-[10px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full opacity-50">
                {t('testimonialsSample')}
              </span>
              <p className="text-sm opacity-80 mt-4 mb-4 leading-relaxed">&ldquo;{item.quote}&rdquo;</p>
              <p className="text-xs font-semibold text-accent2">{item.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Emergency bar */}
      <section className="max-w-7xl mx-auto px-6 pb-8">
        <div className="flex flex-wrap items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm">
          <span className="text-red-300">{t('emergencyText')}</span>
          <a href="tel:1990" className="font-bold text-red-200 bg-red-500/20 px-3 py-0.5 rounded-full">
            1990
          </a>
          <span className="text-red-300/80">(Suwa Seriya) {t('emergencyNote')}</span>
        </div>
      </section>

      {/* Doctors Near Me — UNCHANGED */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-20 pb-28">
        <h2 className="text-3xl font-bold mb-8 tracking-tight">{t('doctorsNearMe')}</h2>
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
