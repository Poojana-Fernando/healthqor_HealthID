import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import HealthIdLoadingIcon from '../ui/HealthIdLoadingIcon'
import { api } from '../../api/client'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'

export default function AdminDoctors() {
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState({ content: [] })
  const [search, setSearch] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [verifiedFilter, setVerifiedFilter] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [appointments, setAppointments] = useState({ content: [] })

  const loadDoctors = useCallback(async () => {
    setLoading(true)
    try {
      const sort = sortBy === 'name' ? 'name,asc' : sortBy === 'specialization' ? 'specialization,asc' : undefined
      const res = await api.adminDoctors({
        search: search || undefined,
        specialization: specialization || undefined,
        verified: verifiedFilter === '' ? undefined : verifiedFilter === 'true',
        sortBy: sortBy === 'bookings' ? 'bookings' : undefined,
        sort,
      })
      setDoctors(res)
    } catch {
      setDoctors({ content: [] })
    } finally {
      setLoading(false)
    }
  }, [search, specialization, verifiedFilter, sortBy])

  useEffect(() => {
    loadDoctors()
  }, [loadDoctors])

  const openDetail = async (doctor) => {
    setSelected(doctor)
    try {
      const appts = await api.adminDoctorAppointments(doctor.id)
      setAppointments(appts)
    } catch {
      setAppointments({ content: [] })
    }
  }

  const handleVerify = async (id, approved) => {
    await api.adminVerifyDoctor(id, approved)
    loadDoctors()
    if (selected?.id === id) {
      setSelected((s) => ({ ...s, verifiedByAdmin: approved, available: approved }))
    }
  }

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this doctor?')) return
    await api.adminDeactivateDoctor(id)
    setSelected(null)
    loadDoctors()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          <Input
            placeholder="Search doctors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Input
            placeholder="Specialization filter"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            className="max-w-xs"
          />
          <Select value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value)}>
            <option value="">All verification</option>
            <option value="true">Verified</option>
            <option value="false">Pending</option>
          </Select>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Sort: Name</option>
            <option value="specialization">Sort: Specialization</option>
            <option value="bookings">Sort: Bookings</option>
          </Select>
          <Button type="button" variant="outline" onClick={loadDoctors}>Apply</Button>
        </div>
        <Button type="button" onClick={() => navigate('/admin/doctors/new')}>
          <Plus className="h-4 w-4 mr-1" /> Add Doctor
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-white/50">
          <HealthIdLoadingIcon size="lg" label="Loading doctors" />
        </div>
      ) : (
        <div className="glass rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-border text-left opacity-60">
                <th className="p-3">Name</th>
                <th className="p-3">Title</th>
                <th className="p-3">Specialization</th>
                <th className="p-3">Hospital</th>
                <th className="p-3">Bookings</th>
                <th className="p-3">Verified</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(doctors.content || []).map((d) => (
                <tr key={d.id} className="border-b border-border/50 hover:bg-white/5">
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3">{d.nameTitle}</td>
                  <td className="p-3">{d.specialization}</td>
                  <td className="p-3">{d.hospital}</td>
                  <td className="p-3 text-accent">{d.bookingCount}</td>
                  <td className="p-3">{d.verifiedByAdmin ? '✓' : '—'}</td>
                  <td className="p-3">
                    <button type="button" className="text-accent2 hover:text-accent text-xs mr-3" onClick={() => openDetail(d)}>
                      View
                    </button>
                    {!d.verifiedByAdmin && (
                      <button type="button" className="text-green-400 text-xs mr-2" onClick={() => handleVerify(d.id, true)}>
                        Verify
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-navy border-l border-border h-full overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{selected.nameTitle} {selected.name}</h2>
              <button type="button" onClick={() => setSelected(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <p><span className="opacity-60">Email:</span> {selected.email}</p>
              <p><span className="opacity-60">Health ID:</span> {selected.healthId}</p>
              <p><span className="opacity-60">Specialization:</span> {selected.specialization}</p>
              <p><span className="opacity-60">Hospital:</span> {selected.hospital}</p>
              <p><span className="opacity-60">License:</span> {selected.licenseNumber}</p>
              <p><span className="opacity-60">Experience:</span> {selected.experienceYears} years</p>
              <p><span className="opacity-60">Total bookings:</span> <span className="text-accent font-semibold">{selected.bookingCount}</span></p>
              <p><span className="opacity-60">Status:</span> {selected.verifiedByAdmin ? 'Verified' : 'Pending verification'}</p>
            </div>
            {(selected.education || []).length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Education</h3>
                <ul className="text-sm space-y-1 opacity-80">
                  {selected.education.map((ed, i) => (
                    <li key={i}>{ed.degree} — {ed.institution} ({ed.year})</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-6 flex gap-2 flex-wrap">
              {!selected.verifiedByAdmin && (
                <Button type="button" onClick={() => handleVerify(selected.id, true)}>Verify</Button>
              )}
              {selected.verifiedByAdmin && (
                <Button type="button" variant="outline" onClick={() => handleVerify(selected.id, false)}>Reject</Button>
              )}
              <Button type="button" variant="outline" onClick={() => handleDeactivate(selected.id)}>Deactivate</Button>
            </div>
            <div className="mt-8">
              <h3 className="font-semibold mb-3">Booking history</h3>
              <div className="space-y-2 text-sm">
                {(appointments.content || []).map((a) => (
                  <div key={a.id} className="border border-border/50 rounded-lg p-3">
                    <p className="font-mono text-xs opacity-60">{a.referenceNumber}</p>
                    <p>{new Date(a.scheduledAt).toLocaleString()}</p>
                    <p className="opacity-70">Patient: {a.patientName}</p>
                    <p className={a.status === 'CANCELLED' ? 'text-red-400' : 'text-accent'}>{a.status}</p>
                  </div>
                ))}
                {(appointments.content || []).length === 0 && (
                  <p className="opacity-50">No appointments yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
