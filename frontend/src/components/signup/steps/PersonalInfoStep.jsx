import { motion } from 'framer-motion'
import { CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/Card'
import { Label } from '../../ui/Label'
import { Input } from '../../ui/Input'
import { Select } from '../../ui/Select'
import { GENDERS } from '../../../constants/signupConstants'

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function PersonalInfoStep({ form, errors, onChange, maxBirthDate }) {
  return (
    <>
      <CardHeader>
        <CardTitle>Tell us about yourself</CardTitle>
        <CardDescription>Let&apos;s start with your basic information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            placeholder="John Doe"
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
          />
          {errors.name && <p className="text-red-400 text-xs">{errors.name}</p>}
        </motion.div>

        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={form.email}
            onChange={(e) => onChange('email', e.target.value)}
          />
          {errors.email && <p className="text-red-400 text-xs">{errors.email}</p>}
        </motion.div>

        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-2">
          <Label htmlFor="nationalId">National ID (NIC)</Label>
          <Input
            id="nationalId"
            placeholder="199012345678"
            value={form.nationalId}
            onChange={(e) => onChange('nationalId', e.target.value)}
          />
          {errors.nationalId && <p className="text-red-400 text-xs">{errors.nationalId}</p>}
        </motion.div>

        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-2">
          <Label htmlFor="birthDate">Birth date</Label>
          <Input
            id="birthDate"
            type="date"
            max={maxBirthDate}
            value={form.birthDate}
            onChange={(e) => onChange('birthDate', e.target.value)}
          />
          {errors.birthDate && <p className="text-red-400 text-xs">{errors.birthDate}</p>}
        </motion.div>

        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Select
            id="gender"
            value={form.gender}
            onChange={(e) => onChange('gender', e.target.value)}
          >
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </Select>
        </motion.div>
      </CardContent>
    </>
  )
}
