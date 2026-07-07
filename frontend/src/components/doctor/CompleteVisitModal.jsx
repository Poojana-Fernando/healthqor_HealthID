import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { api } from '../../api/client'
import { Button } from '../ui/Button'
import LoadingButton from '../ui/LoadingButton'

const emptyPrescription = () => ({
  medicationName: '',
  dosage: '',
  frequency: '',
  durationDays: '',
})

export default function CompleteVisitModal({ appointment, onClose, onCompleted }) {
  const [diagnosisSummary, setDiagnosisSummary] = useState('')
  const [doctorPrivateNotes, setDoctorPrivateNotes] = useState('')
  const [showPrivateNotes, setShowPrivateNotes] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')
  const [prescriptions, setPrescriptions] = useState([emptyPrescription()])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const updatePrescription = (index, field, value) => {
    setPrescriptions((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  const addPrescription = () => setPrescriptions((prev) => [...prev, emptyPrescription()])

  const removePrescription = (index) => {
    setPrescriptions((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!diagnosisSummary.trim()) {
      setError('Diagnosis / visit summary is required.')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        diagnosisSummary: diagnosisSummary.trim(),
        doctorPrivateNotes: doctorPrivateNotes.trim() || null,
        followUpDate: followUpDate || null,
        prescriptions: prescriptions
          .filter((p) => p.medicationName.trim())
          .map((p) => ({
            medicationName: p.medicationName.trim(),
            dosage: p.dosage.trim() || null,
            frequency: p.frequency.trim() || null,
            durationDays: p.durationDays ? Number(p.durationDays) : null,
          })),
      }
      await api.doctorCompleteAppointment(appointment.id, payload)
      onCompleted()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-navy border border-border rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">Complete Visit</h2>
            <p className="text-xs text-white/50 mt-1">{appointment.patientName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/60 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-white/60 mb-1">Diagnosis / Visit Summary *</label>
            <textarea
              value={diagnosisSummary}
              onChange={(e) => setDiagnosisSummary(e.target.value)}
              rows={4}
              className="w-full rounded-lg bg-white/5 border border-border px-3 py-2 text-sm"
              placeholder="Patient-visible summary of the visit..."
              required
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowPrivateNotes((v) => !v)}
              className="text-xs text-accent hover:underline"
            >
              {showPrivateNotes ? 'Hide' : 'Add'} private notes (not shown to patient)
            </button>
            {showPrivateNotes && (
              <textarea
                value={doctorPrivateNotes}
                onChange={(e) => setDoctorPrivateNotes(e.target.value)}
                rows={2}
                className="w-full mt-2 rounded-lg bg-white/5 border border-border px-3 py-2 text-sm"
                placeholder="Internal notes for your records..."
              />
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs text-white/60">Prescriptions</label>
              <button type="button" onClick={addPrescription} className="text-xs text-accent flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {prescriptions.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <input
                    value={p.medicationName}
                    onChange={(e) => updatePrescription(i, 'medicationName', e.target.value)}
                    placeholder="Medication"
                    className="col-span-5 rounded-lg bg-white/5 border border-border px-2 py-1.5 text-xs"
                  />
                  <input
                    value={p.dosage}
                    onChange={(e) => updatePrescription(i, 'dosage', e.target.value)}
                    placeholder="Dosage"
                    className="col-span-2 rounded-lg bg-white/5 border border-border px-2 py-1.5 text-xs"
                  />
                  <input
                    value={p.frequency}
                    onChange={(e) => updatePrescription(i, 'frequency', e.target.value)}
                    placeholder="Frequency"
                    className="col-span-2 rounded-lg bg-white/5 border border-border px-2 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    min="1"
                    value={p.durationDays}
                    onChange={(e) => updatePrescription(i, 'durationDays', e.target.value)}
                    placeholder="Days"
                    className="col-span-2 rounded-lg bg-white/5 border border-border px-2 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removePrescription(i)}
                    className="col-span-1 text-white/40 hover:text-red-400 pt-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1">Follow-up date (optional)</label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-border px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 pt-2">
            <LoadingButton type="submit" loading={submitting} className="flex-1">
              Submit &amp; Complete Visit
            </LoadingButton>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
