import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

export default function EChannelingPage() {
  const { user } = useAuth()
  const [doctors, setDoctors] = useState([])
  const [appointments, setAppointments] = useState([])
  const [filters, setFilters] = useState({ specialty: '', location: '', available: true, minRating: '' })
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [editingAppointment, setEditingAppointment] = useState(null)
  const [slot, setSlot] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const search = () => {
    api.searchDoctors({
      specialty: filters.specialty || undefined,
      location: filters.location || undefined,
      available: filters.available,
      minRating: filters.minRating || undefined,
    }).then(setDoctors).catch(() => setDoctors([]))
  }

  const loadAppointments = () => {
    if (!user) {
      setAppointments([])
      return
    }
    api.myAppointments().then(setAppointments).catch(() => setAppointments([]))
  }

  useEffect(() => { search() }, [])
  useEffect(() => { loadAppointments() }, [user])

  const book = async () => {
    if (!user || !selectedDoctor || !slot) return
    setLoading(true)
    setError('')
    try {
      const res = await api.bookAppointment({
        doctorId: selectedDoctor.id,
        scheduledAt: new Date(slot).toISOString(),
        notes: notes || null,
      })
      setConfirmation(res)
      setSelectedDoctor(null)
      setSlot('')
      setNotes('')
      loadAppointments()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const cancelAppointment = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return
    setError('')
    try {
      await api.cancelAppointment(id)
      loadAppointments()
    } catch (e) {
      setError(e.message)
    }
  }

  const openEdit = (appt) => {
    setEditingAppointment(appt)
    setSlot(appt.scheduledAt ? new Date(appt.scheduledAt).toISOString().slice(0, 16) : '')
    setNotes(appt.notes || '')
  }

  const saveEdit = async () => {
    if (!editingAppointment) return
    setLoading(true)
    setError('')
    try {
      await api.updateAppointment(editingAppointment.id, {
        scheduledAt: slot ? new Date(slot).toISOString() : undefined,
        notes: notes || null,
      })
      setEditingAppointment(null)
      loadAppointments()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const timeSlots = () => {
    const slots = []
    const base = new Date()
    base.setHours(9, 0, 0, 0)
    for (let d = 0; d < 7; d++) {
      for (let h = 9; h < 17; h++) {
        const dt = new Date(base)
        dt.setDate(dt.getDate() + d)
        dt.setHours(h)
        slots.push(dt)
      }
    }
    return slots
  }

  const statusClass = (status) => {
    if (status === 'CONFIRMED') return 'text-green-400'
    if (status === 'CANCELLED') return 'text-red-400'
    if (status === 'COMPLETED') return 'text-blue-400'
    return 'text-yellow-400'
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">e-Channeling</h1>
      <p className="opacity-60 mb-8">Book appointments with verified doctors</p>

      {error && (
        <div className="glass rounded-xl p-4 mb-6 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}

      {confirmation && (
        <div className="glass rounded-2xl p-6 mb-8 border border-green-500/30">
          <h2 className="text-green-400 font-bold mb-2">Booking Confirmed!</h2>
          <p>Reference: <span className="font-mono text-accent2">{confirmation.referenceNumber}</span></p>
          <p className="text-sm opacity-70">Dr. {confirmation.doctorName} — {confirmation.scheduledAt}</p>
          <button onClick={() => setConfirmation(null)} className="mt-4 text-sm text-accent2">Book another</button>
        </div>
      )}

      {user && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">My Appointments</h2>
          {appointments.length === 0 ? (
            <p className="opacity-60 text-sm">No appointments yet.</p>
          ) : (
            <div className="glass rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left opacity-60">
                    <th className="p-3">Reference</th>
                    <th className="p-3">Doctor</th>
                    <th className="p-3">Scheduled</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt) => (
                    <tr key={appt.id} className="border-b border-border/50">
                      <td className="p-3 font-mono text-xs">{appt.referenceNumber}</td>
                      <td className="p-3">{appt.doctorName}</td>
                      <td className="p-3">{new Date(appt.scheduledAt).toLocaleString()}</td>
                      <td className={`p-3 ${statusClass(appt.status)}`}>{appt.status}</td>
                      <td className="p-3">
                        {appt.status !== 'CANCELLED' && appt.status !== 'COMPLETED' && (
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(appt)} className="text-accent2 hover:underline">Edit</button>
                            <button onClick={() => cancelAppointment(appt.id)} className="text-red-400 hover:underline">Cancel</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="glass rounded-2xl p-4 mb-8 grid sm:grid-cols-4 gap-4">
        <input
          placeholder="Specialty"
          value={filters.specialty}
          onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
          className="bg-navy/50 border border-border rounded-lg px-3 py-2 text-sm"
        />
        <input
          placeholder="Location / Hospital"
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          className="bg-navy/50 border border-border rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={filters.available}
          onChange={(e) => setFilters({ ...filters, available: e.target.value === 'true' })}
          className="bg-navy/50 border border-border rounded-lg px-3 py-2 text-sm"
        >
          <option value="true">Available only</option>
          <option value="false">All</option>
        </select>
        <button onClick={search} className="bg-accent hover:bg-accent2 rounded-lg text-sm">Search</button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {doctors.map((d) => (
          <div key={d.id} className="glass rounded-xl p-5">
            <p className="font-semibold text-lg">{d.name}</p>
            <p className="text-accent2 text-sm">{d.specialization}</p>
            <p className="text-xs opacity-60 mt-1">{d.hospital}</p>
            <p className="text-xs mt-2">★ {d.avgRating}</p>
            <button
              onClick={() => setSelectedDoctor(d)}
              className="mt-4 w-full bg-accent hover:bg-accent2 py-2 rounded-lg text-sm"
            >
              Book Appointment
            </button>
          </div>
        ))}
      </div>

      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedDoctor(null)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Book with {selectedDoctor.name}</h2>
            {!user && <p className="text-red-400 text-sm mb-4">Please login to book appointments.</p>}
            <label className="text-xs text-accent2 block mb-2">Select Time Slot</label>
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2 mb-4"
            >
              <option value="">Choose a slot</option>
              {timeSlots().map((dt) => (
                <option key={dt.toISOString()} value={dt.toISOString()}>
                  {dt.toLocaleString()}
                </option>
              ))}
            </select>
            <textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2 mb-4 h-20 text-sm"
            />
            <div className="flex gap-3">
              <button onClick={book} disabled={!user || !slot || loading} className="flex-1 bg-accent py-2 rounded-lg disabled:opacity-50">
                Confirm Booking
              </button>
              <button onClick={() => setSelectedDoctor(null)} className="flex-1 border border-border py-2 rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}

      {editingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditingAppointment(null)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Appointment</h2>
            <label className="text-xs text-accent2 block mb-2">New time</label>
            <input
              type="datetime-local"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2 mb-4"
            />
            <textarea
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2 mb-4 h-20 text-sm"
            />
            <div className="flex gap-3">
              <button onClick={saveEdit} disabled={loading} className="flex-1 bg-accent py-2 rounded-lg disabled:opacity-50">
                Save Changes
              </button>
              <button onClick={() => setEditingAppointment(null)} className="flex-1 border border-border py-2 rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
