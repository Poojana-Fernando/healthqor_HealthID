import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'
import { api } from '../../../api/client'
import { ADMIN_DOCTOR_STEPS } from '../../../constants/adminDoctorConstants'
import {
  validateName,
  validateEmail,
  validateNationalId,
  validateBirthDate,
} from '../../../lib/signupValidation'
import { cn } from '../../../lib/utils'
import { Button } from '../../ui/Button'
import { Card, CardFooter } from '../../ui/Card'
import SignupProgress from '../../signup/SignupProgress'
import DoctorPersonalInfoStep from './steps/DoctorPersonalInfoStep'
import DoctorProfessionalStep from './steps/DoctorProfessionalStep'
import DoctorEducationStep from './steps/DoctorEducationStep'
import DoctorReviewStep from './steps/DoctorReviewStep'

const contentVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.2 } },
}

const emptyEducation = () => ({ degree: '', institution: '', year: new Date().getFullYear() })

const initialForm = {
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
}

export default function AdminDoctorMultistepForm({ onError }) {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [stepErrors, setStepErrors] = useState({})
  const [form, setForm] = useState(initialForm)

  const maxBirthDate = useMemo(() => new Date().toISOString().split('T')[0], [])

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setStepErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const updateEducation = (index, field, value) => {
    setForm((f) => {
      const education = [...f.education]
      education[index] = { ...education[index], [field]: value }
      return { ...f, education }
    })
    setStepErrors((prev) => ({ ...prev, [`education_${index}_${field}`]: '' }))
  }

  const addEducation = () => {
    setForm((f) => ({ ...f, education: [...f.education, emptyEducation()] }))
  }

  const validateStep = (step) => {
    const errors = {}

    if (step === 0) {
      const nameErr = validateName(form.name)
      const emailErr = validateEmail(form.email)
      const nicErr = validateNationalId(form.nationalId)
      const birthErr = validateBirthDate(form.birthDate)
      if (nameErr) errors.name = nameErr
      if (emailErr) errors.email = emailErr
      if (nicErr) errors.nationalId = nicErr
      if (birthErr) errors.birthDate = birthErr
    }

    if (step === 1) {
      if (!form.specialization.trim()) errors.specialization = 'Specialization is required'
      if (!form.hospital.trim()) errors.hospital = 'Hospital is required'
      if (!form.licenseNumber.trim()) errors.licenseNumber = 'License number is required'
      const exp = Number(form.experienceYears)
      if (Number.isNaN(exp) || exp < 0) errors.experienceYears = 'Experience must be 0 or greater'
    }

    if (step === 2) {
      form.education.forEach((ed, i) => {
        if (!ed.degree.trim()) errors[`education_${i}_degree`] = 'Degree is required'
        if (!ed.institution.trim()) errors[`education_${i}_institution`] = 'Institution is required'
        const year = Number(ed.year)
        if (Number.isNaN(year) || year < 1950 || year > new Date().getFullYear() + 1) {
          errors[`education_${i}_year`] = 'Enter a valid year'
        }
      })
    }

    setStepErrors(errors)
    return Object.keys(errors).length === 0
  }

  const nextStep = () => {
    if (!validateStep(currentStep)) return
    if (currentStep < ADMIN_DOCTOR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1)
  }

  const handleSubmit = async () => {
    onError?.('')
    setIsSubmitting(true)
    try {
      const payload = {
        ...form,
        nationalId: form.nationalId.replace(/\D/g, ''),
        experienceYears: Number(form.experienceYears),
        education: form.education.map((ed) => ({ ...ed, year: Number(ed.year) })),
      }
      await api.adminCreateDoctor(payload)
      navigate('/admin/doctors')
    } catch (err) {
      onError?.(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <SignupProgress
        steps={ADMIN_DOCTOR_STEPS}
        currentStep={currentStep}
        onStepClick={(index) => {
          if (index < currentStep) setCurrentStep(index)
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={contentVariants}
            >
              {currentStep === 0 && (
                <DoctorPersonalInfoStep
                  form={form}
                  errors={stepErrors}
                  onChange={updateForm}
                  maxBirthDate={maxBirthDate}
                />
              )}
              {currentStep === 1 && (
                <DoctorProfessionalStep
                  form={form}
                  errors={stepErrors}
                  onChange={updateForm}
                />
              )}
              {currentStep === 2 && (
                <DoctorEducationStep
                  form={form}
                  errors={stepErrors}
                  onChange={updateForm}
                  onUpdateEducation={updateEducation}
                  onAddEducation={addEducation}
                />
              )}
              {currentStep === 3 && <DoctorReviewStep form={form} />}
            </motion.div>
          </AnimatePresence>

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            <Button
              type="button"
              onClick={currentStep === ADMIN_DOCTOR_STEPS.length - 1 ? handleSubmit : nextStep}
              disabled={isSubmitting}
              className={cn('flex items-center gap-1')}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  {currentStep === ADMIN_DOCTOR_STEPS.length - 1 ? 'Create & Send Invite' : 'Next'}
                  {currentStep === ADMIN_DOCTOR_STEPS.length - 1 ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>

      <p className="mt-4 text-center text-sm text-white/50">
        Step {currentStep + 1} of {ADMIN_DOCTOR_STEPS.length}: {ADMIN_DOCTOR_STEPS[currentStep].title}
      </p>
    </div>
  )
}
