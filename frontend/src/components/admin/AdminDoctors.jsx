import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { api } from '../../api/client'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Select } from '../ui/Select'

const NAME_TITLES = ['DR', 'PROF', 'MR', 'MRS', 'MISS']
const MARITAL_STATUSES = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']
const GENDERS = ['MALE', 'FEMALE']

const emptyEducation = () => ({ degree: '', institution: '', year: new Date().getFullYear() })

const emptyForm = () => ({
  name: '',
  email: '',
  nationalId: '',
  country: 'LK',
  birthDate: '',
  gender: 'MALE',
  nameTitle: 'DR',
  specialization: '',
  hospital: '',
  licenseNumber: '',
  education: [emptyEducation()],
  experienceYears: 0,
  maritalStatus: 'SINGLE',
  lat: '',
  lng: '',
})

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState({ content: [] })
  const [search, setSearch] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [verifiedFilter, setVerifiedFilter] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
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

  const submitForm = async (e) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const payload = {
        ...form,
        experienceYears: Number(form.experienceYears),
        education: form.education.map((ed) => ({ ...ed, year: Number(ed.year) })),
        lat: form.lat ? Number(form.lat) : undefined,
        lng: form.lng ? Number(form.lng) : undefined,
      }
      await api.adminCreateDoctor(payload)
      setShowForm(false)
      setForm(emptyForm())
      loadDoctors()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateEducation = (index, field, value) => {
    setForm((f) => {
      const education = [...f.education]
      education[index] = { ...education[index], [field]: value }
      return { ...f, education }
    })
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
        <Button type="button" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Doctor
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-white/50">
          <Loader2 className="h-6 w-6 animate-spin" />
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-navy border-l border-border h-full overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Add Doctor</h2>
              <button type="button" onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submitForm} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>NIC</Label>
                  <Input required value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Select required value={form.nameTitle} onChange={(e) => setForm({ ...form, nameTitle: e.target.value })}>
                    {NAME_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Birth date</Label>
                  <Input type="date" required value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                    {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Specialization</Label>
                <Input required value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Hospital</Label>
                <Input required value={form.hospital} onChange={(e) => setForm({ ...form, hospital: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>SLMC License Number</Label>
                <Input required value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Experience (years)</Label>
                  <Input type="number" min="0" required value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Marital status</Label>
                  <Select value={form.maritalStatus} onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}>
                    {MARITAL_STATUSES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </Select>
                </div>
              </div>
              {form.education.map((ed, i) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                  <Label>Education {i + 1}</Label>
                  <Input placeholder="Degree" required value={ed.degree} onChange={(e) => updateEducation(i, 'degree', e.target.value)} />
                  <Input placeholder="Institution" required value={ed.institution} onChange={(e) => updateEducation(i, 'institution', e.target.value)} />
                  <Input type="number" placeholder="Year" required value={ed.year} onChange={(e) => updateEducation(i, 'year', e.target.value)} />
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setForm((f) => ({ ...f, education: [...f.education, emptyEducation()] }))}>
                Add education
              </Button>
              {formError && <p className="text-red-400 text-sm">{formError}</p>}
              <p className="text-xs text-white/40">An email invitation will be sent for the doctor to set their password.</p>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create & Send Invite'}
              </Button>
            </form>
          </div>
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
