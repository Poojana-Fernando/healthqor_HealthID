import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Sparkline from '../Sparkline'
import HealthIdLoadingIcon from '../ui/HealthIdLoadingIcon'
import { api } from '../../api/client'

function formatDate(iso) {
  if (!iso) return '—'
  if (typeof iso === 'string' && iso.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function VitalsTrendChart({ snapshots, field, color, label, unit }) {
  const data = snapshots
    .map((s) => Number(s[field]))
    .filter((v) => !Number.isNaN(v))
  if (data.length < 2) {
    return (
      <div className="pe-ai-empty">
        <p>Not enough {label.toLowerCase()} history yet. Update your profile to build trends.</p>
      </div>
    )
  }
  const latest = data[data.length - 1]
  return (
    <div className="pe-feature-card">
      <div className="flex justify-between items-center mb-2">
        <h4 className="pe-feature-name">{label}</h4>
        <span className="text-sm text-white/70">{latest} {unit}</span>
      </div>
      <Sparkline data={data} color={color} height={80} width={280} className="opacity-90" />
      <p className="text-xs text-white/40 mt-2">{data.length} readings recorded</p>
    </div>
  )
}

function ReportAnalysisTab() {
  const fileInputRef = useRef(null)
  const [attachment, setAttachment] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const [latestResult, setLatestResult] = useState(null)

  const loadHistory = () => {
    api.getReportAnalysisHistory().then(setHistory).catch(() => setHistory([]))
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const onFile = (file) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5MB')
      return
    }
    setError('')
    setAttachment(file)
  }

  const runAnalysis = async () => {
    if (!attachment) {
      setError('Please select a clear photo of the report (JPEG or PNG)')
      return
    }
    setAnalyzing(true)
    setError('')
    try {
      const result = await api.analyzeReportImage(attachment)
      setLatestResult(result)
      setAttachment(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadHistory()
    } catch (e) {
      setError(e.message)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div
        className="pe-feature-card border-dashed cursor-pointer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          onFile(e.dataTransfer.files?.[0])
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <p className="text-sm text-white/70 text-center">
          {attachment ? attachment.name : 'Drop a photo of your lab report here (JPEG or PNG), or click to browse'}
        </p>
        <p className="text-xs text-white/40 text-center mt-1">Max 5MB · Photos only for AI analysis · PDFs are stored but not analyzed yet</p>
      </div>

      {attachment && (
        <button type="button" onClick={runAnalysis} disabled={analyzing} className="pe-ai-run-btn w-full max-w-xs mx-auto block">
          {analyzing ? (
            <span className="flex items-center justify-center gap-2">
              <HealthIdLoadingIcon size="sm" /> Analyzing report...
            </span>
          ) : (
            'Analyze with AI'
          )}
        </button>
      )}

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      {latestResult && (
        <div className="pe-feature-card pe-feature-card--history">
          <h4 className="pe-feature-name mb-2">Latest Analysis — {latestResult.fileName}</h4>
          <div className="text-sm text-white/80 whitespace-pre-wrap prose-invert">{latestResult.aiSummary}</div>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white/60">Past analyses</h4>
          {history.map((item) => (
            <div key={item.id} className="pe-feature-card">
              <div className="pe-feature-card-header">
                <span className="text-xs text-white/50">{formatDate(item.createdAt)}</span>
                <span className="text-xs text-white/40">{item.fileName}</span>
              </div>
              <p className="text-sm text-white/70 mt-2 line-clamp-4 whitespace-pre-wrap">{item.aiSummary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProfileDashboardTabs({
  tab,
  medicalReports,
  appointments,
  activePrescriptions,
  allPrescriptions,
  vitalsHistory,
  profile,
}) {
  if (tab === 0) {
    const upcoming = (appointments || []).filter((a) => {
      if (!['PENDING', 'CONFIRMED'].includes(a.status)) return false
      return new Date(a.scheduledAt) >= new Date()
    })

    return (
      <div className="space-y-6">
        {upcoming.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-white/60 mb-3">Upcoming Appointments</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcoming.map((a) => (
                <div key={a.id} className="pe-feature-card pe-feature-card--appointment">
                  <div className="pe-feature-badge pe-feature-badge--history">{a.status}</div>
                  <h4 className="pe-feature-name mt-2">{a.doctorName}</h4>
                  <p className="text-sm opacity-80">{a.specialization} · {a.hospital}</p>
                  <p className="text-sm mt-2">{new Date(a.scheduledAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold text-white/60 mb-3">Visit Reports</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(medicalReports || []).map((r) => (
              <div key={r.id} className="pe-feature-card pe-feature-card--history">
                <div className="pe-feature-card-header">
                  <div className="pe-feature-badge pe-feature-badge--vaccination">
                    <span>{formatDate(r.visitDate)}</span>
                  </div>
                  {r.followUpDate && (
                    <div className="pe-feature-next-due">Follow-up: {formatDate(r.followUpDate)}</div>
                  )}
                </div>
                <h4 className="pe-feature-name">{r.doctorName}</h4>
                <p className="text-xs text-white/50">{r.specialization} · {r.hospital}</p>
                <p className="text-sm text-white/80 mt-2 whitespace-pre-wrap">{r.diagnosisSummary}</p>
                {r.prescriptions?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {r.prescriptions.map((p, i) => (
                      <span key={i} className="pe-allergy-tag pe-allergy-tag--default text-xs">
                        {p.medicationName}
                        {p.dosage ? ` · ${p.dosage}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {(medicalReports || []).length === 0 && (
              <div className="pe-ai-empty col-span-full">
                <p>No visit reports yet. Reports appear after your doctor completes an appointment.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (tab === 1) {
    const past = (allPrescriptions || []).filter((p) => !p.active)
    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-emerald-400 mb-3">Active Prescriptions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(activePrescriptions || []).map((item, i) => (
              <div key={`active-${i}`} className="pe-feature-card pe-feature-card--vaccination">
                <h4 className="pe-feature-name">{item.prescription.medicationName}</h4>
                <p className="text-sm text-white/60">{item.doctorName} · {formatDate(item.visitDate)}</p>
                <div className="pe-feature-meta mt-2">
                  {item.prescription.dosage && (
                    <div className="pe-feature-meta-item">
                      <span className="pe-feature-meta-label">Dosage</span>
                      <span className="pe-feature-meta-value">{item.prescription.dosage}</span>
                    </div>
                  )}
                  {item.prescription.frequency && (
                    <div className="pe-feature-meta-item">
                      <span className="pe-feature-meta-label">Frequency</span>
                      <span className="pe-feature-meta-value">{item.prescription.frequency}</span>
                    </div>
                  )}
                  {item.expiresOn && (
                    <div className="pe-feature-meta-item">
                      <span className="pe-feature-meta-label">Until</span>
                      <span className="pe-feature-meta-value">{formatDate(item.expiresOn)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(activePrescriptions || []).length === 0 && (
              <div className="pe-ai-empty col-span-full"><p>No active prescriptions.</p></div>
            )}
          </div>
        </div>

        {past.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-white/50 mb-3">Past Prescriptions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {past.map((item, i) => (
                <div key={`past-${i}`} className="pe-feature-card opacity-70">
                  <h4 className="pe-feature-name">{item.prescription.medicationName}</h4>
                  <p className="text-sm text-white/50">{item.doctorName} · {formatDate(item.visitDate)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (tab === 2) {
    return <ReportAnalysisTab />
  }

  if (tab === 3) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VitalsTrendChart snapshots={vitalsHistory || []} field="weightKg" color="#5eead4" label="Weight" unit="kg" />
        <VitalsTrendChart snapshots={vitalsHistory || []} field="bmi" color="#33b2ff" label="BMI" unit="" />
        <VitalsTrendChart snapshots={vitalsHistory || []} field="heightCm" color="#b280ff" label="Height" unit="cm" />
      </div>
    )
  }

  if (tab === 4) {
    return (
      <div className="pe-health-summary-print">
        <div className="pe-feature-card max-w-lg mx-auto text-center" id="health-summary-card">
          <h3 className="text-lg font-bold mb-1">Health ID Summary</h3>
          <p className="text-xs text-white/50 mb-4">For emergency reference — not a medical record</p>
          <div className="flex justify-center mb-4">
            <QRCodeSVG value={profile.healthId || 'HEALTH-ID'} size={120} bgColor="transparent" fgColor="#e2e8f0" />
          </div>
          <div className="text-left space-y-2 text-sm">
            <p><span className="text-white/50">Name:</span> {profile.name}</p>
            <p><span className="text-white/50">Health ID:</span> <span className="font-mono text-xs">{profile.healthId}</span></p>
            <p><span className="text-white/50">Blood type:</span> {profile.bloodType || '—'}</p>
            <p>
              <span className="text-white/50">Allergies:</span>{' '}
              {profile.allergies?.length ? profile.allergies.join(', ') : 'None recorded'}
            </p>
            <p>
              <span className="text-white/50">Emergency contact:</span>{' '}
              {profile.emergencyContactName
                ? `${profile.emergencyContactName}${profile.emergencyContactPhone ? ` · ${profile.emergencyContactPhone}` : ''}`
                : '—'}
            </p>
          </div>
        </div>
        <div className="text-center mt-4">
          <button type="button" onClick={() => window.print()} className="pe-ai-run-btn">
            Print / Save as PDF
          </button>
          <p className="text-xs text-white/40 mt-2">Add emergency contact in Edit Profile if missing.</p>
        </div>
      </div>
    )
  }

  return null
}
