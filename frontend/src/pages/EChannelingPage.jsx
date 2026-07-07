import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import {
  getBookingDraft,
  setBookingDraft,
  clearBookingDraft,
} from '../utils/homepageStorage'

export default function EChannelingPage() {
  const { user } = useAuth()
  const [doctors, setDoctors] = useState([])
  const [filters, setFilters] = useState({ specialty: '', location: '', available: true, minRating: '' })
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slot, setSlot] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)

  const search = () => {
    api.searchDoctors({
      specialty: filters.specialty || undefined,
      location: filters.location || undefined,
      available: filters.available,
      minRating: filters.minRating || undefined,
    }).then(setDoctors).catch(() => setDoctors([]))
  }

  useEffect(() => { search() }, [])

  const selectDoctor = useCallback((d) => {
    setSelectedDoctor(d)
    setBookingDraft({
      doctorId: d.id,
      doctorName: d.name,
      specialization: d.specialization,
      hospital: d.hospital,
    })
  }, [])

  const closeBookingModal = useCallback(() => {
    setSelectedDoctor(null)
    setSlot('')
  }, [])

  useEffect(() => {
    if (draftRestored || doctors.length === 0) return
    const draft = getBookingDraft()
    if (!draft?.doctorId) {
      setDraftRestored(true)
      return
    }
    const found = doctors.find((d) => d.id === draft.doctorId)
    if (found) {
      setSelectedDoctor(found)
      if (draft.slot) setSlot(draft.slot)
    }
    setDraftRestored(true)
  }, [doctors, draftRestored])

  useEffect(() => {
    if (!selectedDoctor) {
      setSlots([])
      setSlot('')
      return
    }
    setSlotsLoading(true)
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    const to = new Date(from)
    to.setDate(to.getDate() + 7)
    api.doctorSlots(selectedDoctor.id, from.toISOString(), to.toISOString())
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [selectedDoctor])

  const handleSlotChange = (value) => {
    setSlot(value)
    if (selectedDoctor && value) {
      setBookingDraft({
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        specialization: selectedDoctor.specialization,
        hospital: selectedDoctor.hospital,
        slot: value,
      })
    }
  }

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
      clearBookingDraft()
      setSelectedDoctor(null)
      setSlot('')
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
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
              onClick={() => selectDoctor(d)}
              className="mt-4 w-full bg-accent hover:bg-accent2 py-2 rounded-lg text-sm"
            >
              Book Appointment
            </button>
          </div>
        ))}
      </div>

      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeBookingModal} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Book with {selectedDoctor.name}</h2>
            {!user && <p className="text-red-400 text-sm mb-4">Please login to book appointments.</p>}
            <label className="text-xs text-accent2 block mb-2">Select Time Slot</label>
            {slotsLoading ? (
              <p className="text-sm text-white/50 mb-4">Loading available slots...</p>
            ) : (
              <select
                value={slot}
                onChange={(e) => handleSlotChange(e.target.value)}
                className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2 mb-4"
              >
                <option value="">Choose a slot</option>
                {slots.map((s) => (
                  <option key={s.scheduledAt} value={s.scheduledAt}>
                    {new Date(s.scheduledAt).toLocaleString()}
                  </option>
                ))}
              </select>
            )}
            {!slotsLoading && slots.length === 0 && (
              <p className="text-xs text-white/50 mb-4">No slots available. The doctor may need to set their weekly schedule.</p>
            )}
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
              <button onClick={closeBookingModal} className="flex-1 border border-border py-2 rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
