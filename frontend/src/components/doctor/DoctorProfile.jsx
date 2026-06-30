import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { api } from '../../api/client'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'

export default function DoctorProfile() {
  const [profile, setProfile] = useState(null)
  const [specialization, setSpecialization] = useState('')
  const [hospital, setHospital] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.doctorMe()
      .then((p) => {
        setProfile(p)
        setSpecialization(p.specialization || '')
        setHospital(p.hospital || '')
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      const updated = await api.doctorUpdateProfile({ specialization, hospital })
      setProfile(updated)
      setMessage('Profile updated.')
    } catch (err) {
      setMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-white/50">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return <p className="text-red-400">Could not load profile.</p>
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="glass rounded-xl p-4 space-y-2 text-sm">
        <p><span className="opacity-60">Name:</span> {profile.nameTitle} {profile.name}</p>
        <p><span className="opacity-60">Email:</span> {profile.email}</p>
        <p><span className="opacity-60">Health ID:</span> <span className="font-mono">{profile.healthId}</span></p>
        <p><span className="opacity-60">SLMC License:</span> {profile.licenseNumber}</p>
        <p><span className="opacity-60">Experience:</span> {profile.experienceYears} years</p>
        <p>
          <span className="opacity-60">Verification:</span>{' '}
          {profile.verifiedByAdmin ? (
            <span className="text-green-400">Verified by admin</span>
          ) : (
            <span className="text-yellow-400">Pending verification</span>
          )}
        </p>
      </div>

      {(profile.education || []).length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Education</h3>
          <ul className="text-sm space-y-1 opacity-80">
            {profile.education.map((ed, i) => (
              <li key={i}>{ed.degree} — {ed.institution} ({ed.year})</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Specialization</Label>
          <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Hospital</Label>
          <Input value={hospital} onChange={(e) => setHospital(e.target.value)} />
        </div>
      </div>

      {message && <p className={`text-sm ${message.includes('updated') ? 'text-green-400' : 'text-red-400'}`}>{message}</p>}

      <Button type="button" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
      </Button>
    </div>
  )
}
