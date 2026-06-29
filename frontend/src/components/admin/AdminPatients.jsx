import { useCallback, useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { api } from '../../api/client'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import PaginationBar from '../ui/PaginationBar'

const PAGE_SIZE = 20

export default function AdminPatients() {
  const [patients, setPatients] = useState({ content: [], totalPages: 0, totalElements: 0, number: 0 })
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [appointments, setAppointments] = useState({ content: [] })
  const [cancelling, setCancelling] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const loadPatients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.adminPatients(search || undefined, page)
      setPatients(res)
    } catch {
      setPatients({ content: [], totalPages: 0, totalElements: 0, number: 0 })
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    setPage(0)
  }, [search])

  useEffect(() => {
    loadPatients()
  }, [loadPatients])

  const openDetail = async (patient) => {
    try {
      const full = await api.adminPatient(patient.id)
      const appts = await api.adminPatientAppointments(patient.id)
      setSelected(full)
      setAppointments(appts)
    } catch {
      setSelected(patient)
      setAppointments({ content: [] })
    }
  }

  const cancelAppointment = async (appointmentId) => {
    if (!window.confirm('Cancel this appointment?')) return
    setCancelling(appointmentId)
    try {
      await api.adminCancelAppointment(appointmentId)
      const appts = await api.adminPatientAppointments(selected.id)
      setAppointments(appts)
    } catch (err) {
      alert(err.message)
    } finally {
      setCancelling(null)
    }
  }

  const deletePatient = async (patient) => {
    const confirmed = window.confirm(
      `Delete ${patient.name}? This permanently removes all health data and appointments.`
    )
    if (!confirmed) return

    setDeleting(patient.id)
    try {
      await api.adminDeletePatient(patient.id)
      if (selected?.id === patient.id) setSelected(null)
      loadPatients()
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Input
          placeholder="Search patients by name, email, or Health ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Button type="button" variant="outline" onClick={loadPatients}>Search</Button>
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
                <th className="p-3">Name</th>
                <th className="p-3">Health ID</th>
                <th className="p-3">Email</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Registered</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(patients.content || []).map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-white/5">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 font-mono text-xs">{p.healthId}</td>
                  <td className="p-3">{p.email}</td>
                  <td className="p-3">
                    {p.phoneVerified ? '✓' : '—'}
                    {p.mobile ? ` ${p.mobile.slice(-4).padStart(p.mobile.length, '•')}` : ''}
                  </td>
                  <td className="p-3 text-xs">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="p-3 space-x-3">
                    <button type="button" className="text-accent2 hover:text-accent text-xs" onClick={() => openDetail(p)}>
                      View
                    </button>
                    <button
                      type="button"
                      className="text-red-400 hover:text-red-300 text-xs"
                      disabled={deleting === p.id}
                      onClick={() => deletePatient(p)}
                    >
                      {deleting === p.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationBar
            page={patients.number ?? page}
            totalPages={patients.totalPages ?? 0}
            totalElements={patients.totalElements ?? 0}
            pageSize={patients.size ?? PAGE_SIZE}
            onPageChange={setPage}
            disabled={loading}
          />
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-navy border-l border-border h-full overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{selected.name}</h2>
              <button type="button" onClick={() => setSelected(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <p><span className="opacity-60">Health ID:</span> <span className="font-mono">{selected.healthId}</span></p>
              <p><span className="opacity-60">Email:</span> {selected.email}</p>
              <p><span className="opacity-60">Mobile:</span> {selected.mobile || '—'}</p>
              <p>
                <span className="opacity-60">Verification:</span>{' '}
                Email {selected.emailVerified ? '✓' : '—'} · Phone {selected.phoneVerified ? '✓' : '—'}
              </p>
              {selected.healthSummary && (
                <>
                  <p><span className="opacity-60">Blood type:</span> {selected.healthSummary.bloodType || '—'}</p>
                  <p><span className="opacity-60">Gender:</span> {selected.healthSummary.gender || '—'}</p>
                  <p><span className="opacity-60">BMI:</span> {selected.healthSummary.bmi ?? '—'}</p>
                  <p><span className="opacity-60">Birth date:</span> {selected.healthSummary.birthDate || '—'}</p>
                </>
              )}
            </div>
            <div className="mt-6">
              <Button
                type="button"
                variant="outline"
                className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                disabled={deleting === selected.id}
                onClick={() => deletePatient(selected)}
              >
                {deleting === selected.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Delete patient'
                )}
              </Button>
            </div>
            <div className="mt-8">
              <h3 className="font-semibold mb-3">Appointments</h3>
              <div className="space-y-2 text-sm">
                {(appointments.content || []).map((a) => (
                  <div key={a.id} className="border border-border/50 rounded-lg p-3">
                    <p className="font-mono text-xs opacity-60">{a.referenceNumber}</p>
                    <p>{new Date(a.scheduledAt).toLocaleString()}</p>
                    <p className="opacity-70">Dr. {a.doctorName} — {a.specialization}</p>
                    <p className={a.status === 'CANCELLED' ? 'text-red-400' : 'text-accent'}>{a.status}</p>
                    {a.status !== 'CANCELLED' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="default"
                        className="mt-2 text-xs h-8"
                        disabled={cancelling === a.id}
                        onClick={() => cancelAppointment(a.id)}
                      >
                        {cancelling === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Cancel'}
                      </Button>
                    )}
                  </div>
                ))}
                {(appointments.content || []).length === 0 && (
                  <p className="opacity-50">No appointments.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
