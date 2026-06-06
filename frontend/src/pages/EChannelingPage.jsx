import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

export default function EChannelingPage() {
  const { user } = useAuth()
  const [doctors, setDoctors] = useState([])
  const [filters, setFilters] = useState({ specialty: '', location: '', available: true, minRating: '' })
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [slot, setSlot] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [loading, setLoading] = useState(false)

  const search = () => {
    api.searchDoctors({
      specialty: filters.specialty || undefined,
      location: filters.location || undefined,
      available: filters.available,
      minRating: filters.minRating || undefined,
    }).then(setDoctors).catch(() => setDoctors([]))
  }

  useEffect(() => { search() }, [])

  const book = async () => {
    if (!user || !selectedDoctor || !slot) return
    setLoading(true)
    try {
      const res = await api.bookAppointment({
        doctorId: selectedDoctor.id,
        scheduledAt: new Date(slot).toISOString(),
        notes: notes || null,
      })
      setConfirmation(res)
      setSelectedDoctor(null)
    } catch (e) {
      alert(e.message)
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

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">e-Channeling</h1>
      <p className="opacity-60 mb-8">Book appointments with verified doctors</p>

      {confirmation && (
        <div className="glass rounded-2xl p-6 mb-8 border border-green-500/30">
          <h2 className="text-green-400 font-bold mb-2">Booking Confirmed!</h2>
          <p>Reference: <span className="font-mono text-accent2">{confirmation.referenceNumber}</span></p>
          <p className="text-sm opacity-70">Dr. {confirmation.doctorName} — {confirmation.scheduledAt}</p>
          <button onClick={() => setConfirmation(null)} className="mt-4 text-sm text-accent2">Book another</button>
        </div>
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
              <button onClick={() => setSelectedDoctor(null)} className="flex-1 border border-border py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
