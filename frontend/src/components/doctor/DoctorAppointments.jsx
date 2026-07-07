import { useCallback, useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { api } from '../../api/client'
import { Button } from '../ui/Button'
import CompleteVisitModal from './CompleteVisitModal'

const STATUS_TABS = ['', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState({ content: [] })
  const [statusFilter, setStatusFilter] = useState('')
  const [rangeFilter, setRangeFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [updating, setUpdating] = useState(null)
  const [completeTarget, setCompleteTarget] = useState(null)

  const getRange = () => {
    if (rangeFilter === 'today') {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      return { from: start.toISOString(), to: end.toISOString() }
    }
    if (rangeFilter === 'week') {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 7)
      return { from: start.toISOString(), to: end.toISOString() }
    }
    return {}
  }

  const loadAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const range = getRange()
      const res = await api.doctorAppointments({
        status: statusFilter || undefined,
        ...range,
      })
      setAppointments(res)
    } catch {
      setAppointments({ content: [] })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, rangeFilter])

  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  const openDetail = async (appt) => {
    try {
      const full = await api.doctorAppointment(appt.id)
      setSelected(full)
    } catch {
      setSelected(appt)
    }
  }

  const updateStatus = async (id, status) => {
    setUpdating(id)
    try {
      await api.doctorUpdateAppointmentStatus(id, { status })
      setSelected(null)
      loadAppointments()
    } catch (err) {
      alert(err.message)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {['all', 'today', 'week'].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRangeFilter(r)}
            className={`px-3 py-1.5 rounded-lg text-xs border ${
              rangeFilter === r ? 'border-accent text-accent bg-accent/10' : 'border-border text-white/60'
            }`}
          >
            {r === 'all' ? 'All' : r === 'today' ? 'Today' : 'This week'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => (
          <button
            key={s || 'ALL'}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs border ${
              statusFilter === s ? 'border-accent text-accent bg-accent/10' : 'border-border text-white/60'
            }`}
          >
            {s || 'All statuses'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-white/50">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="glass rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-border text-left opacity-60">
                <th className="p-3">Patient</th>
                <th className="p-3">Health ID</th>
                <th className="p-3">Scheduled</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(appointments.content || []).map((a) => (
                <tr key={a.id} className="border-b border-border/50 hover:bg-white/5">
                  <td className="p-3 font-medium">{a.patientName}</td>
                  <td className="p-3 font-mono text-xs">{a.patientHealthId}</td>
                  <td className="p-3">{new Date(a.scheduledAt).toLocaleString()}</td>
                  <td className="p-3">{a.status}</td>
                  <td className="p-3 space-x-2">
                    <button type="button" className="text-accent2 text-xs" onClick={() => openDetail(a)}>
                      View
                    </button>
                    {a.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          className="text-green-400 text-xs"
                          disabled={updating === a.id}
                          onClick={() => updateStatus(a.id, 'CONFIRMED')}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="text-red-400 text-xs"
                          disabled={updating === a.id}
                          onClick={() => updateStatus(a.id, 'CANCELLED')}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {a.status === 'CONFIRMED' && (
                      <button
                        type="button"
                        className="text-accent text-xs"
                        disabled={updating === a.id}
                        onClick={() => setCompleteTarget(a)}
                      >
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(appointments.content || []).length === 0 && (
            <p className="p-6 text-center text-white/50 text-sm">No appointments found.</p>
          )}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-navy border-l border-border h-full overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{selected.patientName}</h2>
              <button type="button" onClick={() => setSelected(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <p><span className="opacity-60">Health ID:</span> <span className="font-mono">{selected.patientHealthId}</span></p>
              <p><span className="opacity-60">Reference:</span> {selected.referenceNumber}</p>
              <p><span className="opacity-60">Scheduled:</span> {new Date(selected.scheduledAt).toLocaleString()}</p>
              <p><span className="opacity-60">Status:</span> {selected.status}</p>
              {selected.notes && <p><span className="opacity-60">Patient notes:</span> {selected.notes}</p>}
              {selected.healthSummary && (
                <div className="mt-4 p-3 border border-border/50 rounded-lg">
                  <p className="text-xs text-accent mb-2">Health summary (audited access)</p>
                  <p><span className="opacity-60">Blood type:</span> {selected.healthSummary.bloodType || '—'}</p>
                  <p><span className="opacity-60">Gender:</span> {selected.healthSummary.gender || '—'}</p>
                  <p><span className="opacity-60">BMI:</span> {selected.healthSummary.bmi ?? '—'}</p>
                  <p><span className="opacity-60">Allergies:</span> {selected.healthSummary.allergies || '—'}</p>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-2 flex-wrap">
              {selected.status === 'PENDING' && (
                <>
                  <Button type="button" onClick={() => updateStatus(selected.id, 'CONFIRMED')}>Confirm</Button>
                  <Button type="button" variant="outline" onClick={() => updateStatus(selected.id, 'CANCELLED')}>Cancel</Button>
                </>
              )}
              {selected.status === 'CONFIRMED' && (
                <Button type="button" onClick={() => setCompleteTarget(selected)}>Mark completed</Button>
              )}
            </div>
          </div>
        </div>
      )}
      {completeTarget && (
        <CompleteVisitModal
          appointment={completeTarget}
          onClose={() => setCompleteTarget(null)}
          onCompleted={() => {
            setSelected(null)
            loadAppointments()
          }}
        />
      )}
    </div>
  )
}
