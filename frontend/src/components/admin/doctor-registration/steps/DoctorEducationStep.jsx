import { motion } from 'framer-motion'
import { CardHeader, CardTitle, CardDescription, CardContent } from '../../../ui/Card'
import { Label } from '../../../ui/Label'
import { Input } from '../../../ui/Input'
import { Button } from '../../../ui/Button'

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function DoctorEducationStep({ form, errors, onChange, onUpdateEducation, onAddEducation }) {
  return (
    <>
      <CardHeader>
        <CardTitle>Education</CardTitle>
        <CardDescription>Academic qualifications and certifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {form.education.map((ed, i) => (
          <motion.div
            key={i}
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="border border-border rounded-lg p-4 space-y-3"
          >
            <Label>Education {i + 1}</Label>
            <Input
              placeholder="Degree"
              value={ed.degree}
              onChange={(e) => onUpdateEducation(i, 'degree', e.target.value)}
            />
            {errors[`education_${i}_degree`] && (
              <p className="text-red-400 text-xs">{errors[`education_${i}_degree`]}</p>
            )}
            <Input
              placeholder="Institution"
              value={ed.institution}
              onChange={(e) => onUpdateEducation(i, 'institution', e.target.value)}
            />
            {errors[`education_${i}_institution`] && (
              <p className="text-red-400 text-xs">{errors[`education_${i}_institution`]}</p>
            )}
            <Input
              type="number"
              placeholder="Year"
              value={ed.year}
              onChange={(e) => onUpdateEducation(i, 'year', e.target.value)}
            />
            {errors[`education_${i}_year`] && (
              <p className="text-red-400 text-xs">{errors[`education_${i}_year`]}</p>
            )}
          </motion.div>
        ))}
        <Button type="button" variant="outline" onClick={onAddEducation}>
          Add education
        </Button>
      </CardContent>
    </>
  )
}
