import { useState } from 'react'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Label } from '../ui/Label'

export const MEDICAL_CONDITIONS = [
  'Headache', 'Fever', 'Cough', 'Fatigue', 'Nausea', 'Chest Pain', 'Dizziness', 'Sore Throat',
  'Joint Pain', 'Back Pain', 'Shortness of Breath', 'Blurred Vision', 'Rash', 'Swelling',
  'Numbness', 'Abdominal Pain', 'Vomiting', 'Constipation', 'Diarrhea', 'Frequent Urination',
  'Weight Loss', 'Insomnia', 'Anxiety', 'Muscle Cramps', 'Runny Nose', 'Ear Pain',
  'Eye Redness', 'Loss of Appetite', 'Palpitations', 'Night Sweats',
  'Fracture', 'Burn', 'Allergic Reaction', 'Pregnancy', 'Dental Pain', 'Mental Health Crisis',
]

export default function ConditionSelect({ value, onChange, disabled }) {
  const [mode, setMode] = useState(value && !MEDICAL_CONDITIONS.includes(value) ? 'custom' : 'preset')

  const handlePresetChange = (e) => {
    const next = e.target.value
    if (next === '__custom__') {
      setMode('custom')
      onChange('')
      return
    }
    setMode('preset')
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="condition-select">Medical condition or symptom</Label>
      {mode === 'preset' ? (
        <Select
          id="condition-select"
          value={MEDICAL_CONDITIONS.includes(value) ? value : ''}
          onChange={handlePresetChange}
          disabled={disabled}
        >
          <option value="">Select a condition...</option>
          {MEDICAL_CONDITIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
          <option value="__custom__">Other (type your own)</option>
        </Select>
      ) : (
        <div className="flex gap-2">
          <Input
            id="condition-select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Describe your condition..."
            disabled={disabled}
          />
          <button
            type="button"
            onClick={() => {
              setMode('preset')
              onChange('')
            }}
            className="shrink-0 text-xs px-3 py-2 rounded-lg border border-border hover:border-accent/50 transition"
            disabled={disabled}
          >
            List
          </button>
        </div>
      )}
    </div>
  )
}
