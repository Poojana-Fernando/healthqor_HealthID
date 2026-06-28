import { motion } from 'framer-motion'
import { CardHeader, CardTitle, CardDescription, CardContent } from '../../../ui/Card'
import { Label } from '../../../ui/Label'
import { Input } from '../../../ui/Input'
import { Select } from '../../../ui/Select'
import { MARITAL_STATUSES } from '../../../../constants/adminDoctorConstants'

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function DoctorProfessionalStep({ form, errors, onChange }) {
  return (
    <>
      <CardHeader>
        <CardTitle>Professional details</CardTitle>
        <CardDescription>Medical credentials and practice information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-2">
          <Label htmlFor="specialization">Specialization</Label>
          <Input
            id="specialization"
            placeholder="Cardiology"
            value={form.specialization}
            onChange={(e) => onChange('specialization', e.target.value)}
          />
          {errors.specialization && <p className="text-red-400 text-xs">{errors.specialization}</p>}
        </motion.div>

        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-2">
          <Label htmlFor="hospital">Hospital</Label>
          <Input
            id="hospital"
            placeholder="National Hospital of Sri Lanka"
            value={form.hospital}
            onChange={(e) => onChange('hospital', e.target.value)}
          />
          {errors.hospital && <p className="text-red-400 text-xs">{errors.hospital}</p>}
        </motion.div>

        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-2">
          <Label htmlFor="licenseNumber">SLMC License Number</Label>
          <Input
            id="licenseNumber"
            placeholder="SLMC-12345"
            value={form.licenseNumber}
            onChange={(e) => onChange('licenseNumber', e.target.value)}
          />
          {errors.licenseNumber && <p className="text-red-400 text-xs">{errors.licenseNumber}</p>}
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-2">
            <Label htmlFor="experienceYears">Experience (years)</Label>
            <Input
              id="experienceYears"
              type="number"
              min="0"
              value={form.experienceYears}
              onChange={(e) => onChange('experienceYears', e.target.value)}
            />
            {errors.experienceYears && <p className="text-red-400 text-xs">{errors.experienceYears}</p>}
          </motion.div>

          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-2">
            <Label htmlFor="maritalStatus">Marital status</Label>
            <Select
              id="maritalStatus"
              value={form.maritalStatus}
              onChange={(e) => onChange('maritalStatus', e.target.value)}
            >
              {MARITAL_STATUSES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </motion.div>
        </div>
      </CardContent>
    </>
  )
}
