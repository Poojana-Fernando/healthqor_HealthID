function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function truncate(text, max = 120) {
  if (!text) return '—'
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export default function MedicalReportSummaryWidget({
  latestReport,
  activeRxCount,
  onViewAll,
}) {
  if (!latestReport) {
    return (
      <div className="pe-summary-card">
        <div className="pe-summary-title">Latest Visit</div>
        <p className="text-sm text-white/50 mt-2">No completed visit reports yet.</p>
        <p className="text-xs text-white/40 mt-3">
          Reports appear here after your doctor completes an appointment.
        </p>
      </div>
    )
  }

  const followUpSoon =
    latestReport.followUpDate &&
    new Date(latestReport.followUpDate) <= new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

  return (
    <div className="pe-summary-card">
      <div className="pe-summary-title">Latest Visit</div>
      <div className="pe-summary-row">
        <span className="pe-summary-key">Date</span>
        <span className="pe-summary-value">{formatDate(latestReport.visitDate)}</span>
      </div>
      <div className="pe-summary-row">
        <span className="pe-summary-key">Doctor</span>
        <span className="pe-summary-value">{latestReport.doctorName}</span>
      </div>
      {latestReport.specialization && (
        <div className="pe-summary-row">
          <span className="pe-summary-key">Specialty</span>
          <span className="pe-summary-value">{latestReport.specialization}</span>
        </div>
      )}
      <div className="pe-summary-row pe-summary-row--block">
        <span className="pe-summary-key">Summary</span>
        <span className="pe-summary-value pe-summary-value--multiline">
          {truncate(latestReport.diagnosisSummary)}
        </span>
      </div>
      {latestReport.followUpDate && (
        <div className="pe-summary-row">
          <span className="pe-summary-key">Follow-up</span>
          <span className={`pe-summary-value ${followUpSoon ? 'pe-summary-value--warn' : ''}`}>
            {formatDate(latestReport.followUpDate)}
          </span>
        </div>
      )}
      <div className="pe-summary-row">
        <span className="pe-summary-key">Active Rx</span>
        <span className="pe-summary-value">{activeRxCount} active</span>
      </div>
      {onViewAll && (
        <button type="button" onClick={onViewAll} className="pe-summary-view-all">
          View all reports →
        </button>
      )}
    </div>
  )
}
