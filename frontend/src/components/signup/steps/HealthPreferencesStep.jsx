import { motion } from 'framer-motion'
import { CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/Card'
import { Label } from '../../ui/Label'
import { Input } from '../../ui/Input'
import { Select } from '../../ui/Select'
import { COUNTRIES, BLOOD_TYPES } from '../../../constants/signupConstants'

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function HealthPreferencesStep({
  form,
  errors,
  onChange,
  heightUnit,
  weightUnit,
  onHeightUnitToggle,
  onWeightUnitToggle,
}) {
  return (
    <>
      <CardHeader>
        <CardTitle>Health preferences</CardTitle>
        <CardDescription>Help us personalize your Health ID profile</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select
              id="country"
              value={form.country}
              onChange={(e) => onChange('country', e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
            {errors.country && <p className="text-red-400 text-xs">{errors.country}</p>}
          </motion.div>

          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-2">
            <Label htmlFor="bloodType">Blood type</Label>
            <Select
              id="bloodType"
              value={form.bloodType}
              onChange={(e) => onChange('bloodType', e.target.value)}
            >
              <option value="">Select blood type</option>
              {BLOOD_TYPES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
            {errors.bloodType && <p className="text-red-400 text-xs">{errors.bloodType}</p>}
          </motion.div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="height">Height (optional)</Label>
              <button
                type="button"
                onClick={onHeightUnitToggle}
                className="text-xs text-accent hover:text-accent2 transition"
              >
                {heightUnit === 'cm' ? 'cm' : 'in'}
              </button>
            </div>
            <Input
              id="height"
              type="number"
              min="0"
              step="any"
              placeholder={heightUnit === 'cm' ? '175' : '69'}
              value={form.height}
              onChange={(e) => onChange('height', e.target.value)}
            />
          </motion.div>

          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="weight">Weight (optional)</Label>
              <button
                type="button"
                onClick={onWeightUnitToggle}
                className="text-xs text-accent hover:text-accent2 transition"
              >
                {weightUnit === 'kg' ? 'kg' : 'lbs'}
              </button>
            </div>
            <Input
              id="weight"
              type="number"
              min="0"
              step="any"
              placeholder={weightUnit === 'kg' ? '70' : '154'}
              value={form.weight}
              onChange={(e) => onChange('weight', e.target.value)}
            />
          </motion.div>
        </div>

        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-2">
          <Label htmlFor="allergies">Allergies (optional)</Label>
          <Input
            id="allergies"
            placeholder="e.g. peanuts, shellfish"
            value={form.allergiesInput}
            onChange={(e) => onChange('allergiesInput', e.target.value)}
          />
          <p className="text-xs text-white/40">Separate multiple allergies with commas</p>
        </motion.div>
      </CardContent>
    </>
  )
}
