import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { api } from '../../api/client'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Select } from '../ui/Select'

const DAYS = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
]

const defaultDays = () =>
  DAYS.map((d) => ({
    dayOfWeek: d.value,
    enabled: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].includes(d.value),
    startTime: '09:00',
    endTime: '17:00',
  }))

export default function DoctorSchedule() {
  const [days, setDays] = useState(defaultDays())
  const [slotDuration, setSlotDuration] = useState(30)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [previewSlots, setPreviewSlots] = useState([])

  useEffect(() => {
    api.doctorSchedule()
      .then((res) => {
        if (res.days?.length) {
          const merged = defaultDays().map((def) => {
            const saved = res.days.find((d) => d.dayOfWeek === def.dayOfWeek)
            return saved ? { ...def, ...saved, startTime: saved.startTime?.slice(0, 5) || def.startTime, endTime: saved.endTime?.slice(0, 5) || def.endTime } : def
          })
          setDays(merged)
        }
        setSlotDuration(res.slotDurationMinutes || 30)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    api.doctorMe().then((me) => {
      const from = new Date()
      from.setHours(0, 0, 0, 0)
      const to = new Date(from)
      to.setDate(to.getDate() + 7)
      api.doctorSlots(me.id, from.toISOString(), to.toISOString())
        .then(setPreviewSlots)
        .catch(() => setPreviewSlots([]))
    }).catch(() => {})
  }, [days, slotDuration])

  const updateDay = (index, field, value) => {
    setDays((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      await api.doctorUpdateSchedule({
        days: days.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          enabled: d.enabled,
          startTime: d.startTime.length === 5 ? `${d.startTime}:00` : d.startTime,
          endTime: d.endTime.length === 5 ? `${d.endTime}:00` : d.endTime,
        })),
        slotDurationMinutes: Number(slotDuration),
      })
      setMessage('Schedule saved successfully.')
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

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-sm text-white/50">
        Set your weekly availability. Patients can only book slots within these windows via e-Channeling.
      </p>

      <div className="space-y-2">
        <Label>Slot duration (minutes)</Label>
        <Select value={slotDuration} onChange={(e) => setSlotDuration(Number(e.target.value))}>
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>60 minutes</option>
        </Select>
      </div>

      <div className="space-y-3">
        {days.map((day, i) => (
          <div key={day.dayOfWeek} className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label>{DAYS.find((d) => d.value === day.dayOfWeek)?.label}</Label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={(e) => updateDay(i, 'enabled', e.target.checked)}
                />
                Available
              </label>
            </div>
            {day.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Start</Label>
                  <Input type="time" value={day.startTime} onChange={(e) => updateDay(i, 'startTime', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End</Label>
                  <Input type="time" value={day.endTime} onChange={(e) => updateDay(i, 'endTime', e.target.value)} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {message && <p className={`text-sm ${message.includes('success') ? 'text-green-400' : 'text-red-400'}`}>{message}</p>}

      <Button type="button" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save schedule'}
      </Button>

      <div className="mt-8">
        <h3 className="font-semibold mb-3">Preview — next 7 days ({previewSlots.length} slots)</h3>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          {previewSlots.slice(0, 20).map((s) => (
            <span key={s.scheduledAt} className="text-xs px-2 py-1 rounded bg-white/10">
              {new Date(s.scheduledAt).toLocaleString()}
            </span>
          ))}
          {previewSlots.length === 0 && (
            <p className="text-sm text-white/50">Save your schedule to generate bookable slots.</p>
          )}
        </div>
      </div>
    </div>
  )
}
