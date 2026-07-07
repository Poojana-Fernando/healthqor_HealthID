export const BOOKING_DRAFT_KEY = 'hq_booking_draft'
export const REPORTS_LAST_SEEN_KEY = 'hq_reports_last_seen'
export const LANG_KEY = 'hq_lang'

export function getBookingDraft() {
  try {
    const raw = localStorage.getItem(BOOKING_DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setBookingDraft(draft) {
  localStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify({ ...draft, timestamp: Date.now() }))
}

export function clearBookingDraft() {
  localStorage.removeItem(BOOKING_DRAFT_KEY)
}

export function getReportsLastSeen() {
  const raw = localStorage.getItem(REPORTS_LAST_SEEN_KEY)
  return raw ? new Date(raw) : null
}

export function markReportsSeen() {
  localStorage.setItem(REPORTS_LAST_SEEN_KEY, new Date().toISOString())
}

export function hasUnreadReport(latestReport) {
  if (!latestReport?.createdAt) return false
  const lastSeen = getReportsLastSeen()
  if (!lastSeen) return true
  return new Date(latestReport.createdAt) > lastSeen
}
