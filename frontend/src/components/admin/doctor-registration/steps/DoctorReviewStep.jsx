import { motion } from 'framer-motion'
import { CardHeader, CardTitle, CardDescription, CardContent } from '../../../ui/Card'

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border/50 text-sm">
      <span className="text-white/50 shrink-0">{label}</span>
      <span className="text-right font-medium">{value || '—'}</span>
    </div>
  )
}

export default function DoctorReviewStep({ form }) {
  return (
    <>
      <CardHeader>
        <CardTitle>Review & submit</CardTitle>
        <CardDescription>
          Confirm the details below. An email invitation will be sent for the doctor to set their password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <motion.div variants={fadeInUp} initial="hidden" animate="visible">
          <h3 className="text-sm font-semibold text-accent mb-2">Personal</h3>
          <Row label="Name" value={form.name} />
          <Row label="Email" value={form.email} />
          <Row label="NIC" value={form.nationalId} />
          <Row label="Title" value={form.nameTitle} />
          <Row label="Birth date" value={form.birthDate} />
          <Row label="Gender" value={form.gender} />
        </motion.div>

        <motion.div variants={fadeInUp} initial="hidden" animate="visible">
          <h3 className="text-sm font-semibold text-accent mb-2">Professional</h3>
          <Row label="Specialization" value={form.specialization} />
          <Row label="Hospital" value={form.hospital} />
          <Row label="SLMC License" value={form.licenseNumber} />
          <Row label="Experience" value={`${form.experienceYears} years`} />
          <Row label="Marital status" value={form.maritalStatus} />
        </motion.div>

        <motion.div variants={fadeInUp} initial="hidden" animate="visible">
          <h3 className="text-sm font-semibold text-accent mb-2">Education</h3>
          {form.education.map((ed, i) => (
            <p key={i} className="text-sm py-1">
              {ed.degree} — {ed.institution} ({ed.year})
            </p>
          ))}
        </motion.div>
      </CardContent>
    </>
  )
}
