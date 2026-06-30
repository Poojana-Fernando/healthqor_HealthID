import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { SIGNUP_STEPS } from '../../constants/signupConstants'
import { DEFAULT_PHONE_COUNTRY } from '../../constants/phoneCountries'
import {
  validateName,
  validateEmail,
  validateNationalId,
  validateBirthDate,
  validatePassword,
  validateConfirmPassword,
  validatePhoneNational,
  buildE164,
  parseAllergiesInput,
  convertHeightToCm,
  convertWeightToKg,
} from '../../lib/signupValidation'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'
import { Card, CardFooter } from '../ui/Card'
import SignupProgress from './SignupProgress'
import PersonalInfoStep from './steps/PersonalInfoStep'
import AccountSecurityStep from './steps/AccountSecurityStep'
import HealthPreferencesStep from './steps/HealthPreferencesStep'

const contentVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.2 } },
}

const initialForm = {
  name: '',
  email: '',
  nationalId: '',
  birthDate: '',
  gender: 'MALE',
  phoneCountryCode: DEFAULT_PHONE_COUNTRY.code,
  phoneNationalNumber: '',
  password: '',
  confirmPassword: '',
  country: 'LK',
  bloodType: '',
  height: '',
  weight: '',
  allergiesInput: '',
}

export default function SignupMultistepForm({ onError }) {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [stepErrors, setStepErrors] = useState({})
  const [form, setForm] = useState(initialForm)
  const [heightUnit, setHeightUnit] = useState('cm')
  const [weightUnit, setWeightUnit] = useState('kg')

  const maxBirthDate = useMemo(() => new Date().toISOString().split('T')[0], [])

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setStepErrors((prev) => {
      const next = { ...prev, [field]: '' }
      if (field === 'password') next.confirmPassword = ''
      return next
    })
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
      const mobileErr = validatePhoneNational(form.phoneNationalNumber)
      const passwordErr = validatePassword(form.password)
      const confirmErr = validateConfirmPassword(form.password, form.confirmPassword)
      if (mobileErr) errors.mobile = mobileErr
      if (passwordErr) errors.password = passwordErr
      if (confirmErr) errors.confirmPassword = confirmErr
    }

    if (step === 2) {
      if (!form.country) errors.country = 'Country is required'
      if (!form.bloodType) errors.bloodType = 'Blood type is required'
    }

    setStepErrors(errors)
    return Object.keys(errors).length === 0
  }

  const nextStep = () => {
    if (!validateStep(currentStep)) return
    if (currentStep < SIGNUP_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(2)) return

    onError?.('')
    setIsSubmitting(true)

    const mobile = buildE164(form.phoneCountryCode, form.phoneNationalNumber)
    const nationalIdDigits = form.nationalId.replace(/\D/g, '')
    const heightCm = convertHeightToCm(form.height, heightUnit)
    const weightKg = convertWeightToKg(form.weight, weightUnit)
    const allergies = parseAllergiesInput(form.allergiesInput)

    try {
      const res = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        nationalId: nationalIdDigits,
        country: form.country,
        mobile,
        gender: form.gender,
        bloodType: form.bloodType,
        heightCm,
        weightKg,
        birthDate: form.birthDate,
        allergies,
      })

      if (res.requiresVerification) {
        navigate('/verify-email', {
          state: {
            challengeId: res.challengeId,
            maskedEmail: res.maskedEmail,
            purpose: res.purpose,
          },
        })
        return
      }
      navigate('/profile')
    } catch (err) {
      onError?.(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full">
      <SignupProgress
        steps={SIGNUP_STEPS}
        currentStep={currentStep}
        onStepClick={setCurrentStep}
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
                <PersonalInfoStep
                  form={form}
                  errors={stepErrors}
                  onChange={updateForm}
                  maxBirthDate={maxBirthDate}
                />
              )}
              {currentStep === 1 && (
                <AccountSecurityStep
                  form={form}
                  errors={stepErrors}
                  onChange={updateForm}
                  onPhoneCountryChange={(code) => updateForm('phoneCountryCode', code)}
                  onPhoneNationalChange={(num) => updateForm('phoneNationalNumber', num)}
                />
              )}
              {currentStep === 2 && (
                <HealthPreferencesStep
                  form={form}
                  errors={stepErrors}
                  onChange={updateForm}
                  heightUnit={heightUnit}
                  weightUnit={weightUnit}
                  onHeightUnitToggle={() =>
                    setHeightUnit((u) => (u === 'cm' ? 'in' : 'cm'))
                  }
                  onWeightUnitToggle={() =>
                    setWeightUnit((u) => (u === 'kg' ? 'lbs' : 'kg'))
                  }
                />
              )}
            </motion.div>
          </AnimatePresence>

          <CardFooter className="flex justify-between">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
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
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                type="button"
                onClick={
                  currentStep === SIGNUP_STEPS.length - 1 ? handleSubmit : nextStep
                }
                disabled={isSubmitting}
                loading={isSubmitting}
                loadingLabel="Creating..."
                className={cn('flex items-center gap-1')}
              >
                {currentStep === SIGNUP_STEPS.length - 1 ? 'Create Health ID' : 'Next'}
                {!isSubmitting && (currentStep === SIGNUP_STEPS.length - 1 ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                ))}
              </Button>
            </motion.div>
          </CardFooter>
        </Card>
      </motion.div>

      <motion.p
        className="mt-4 text-center text-sm text-white/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        Step {currentStep + 1} of {SIGNUP_STEPS.length}: {SIGNUP_STEPS[currentStep].title}
      </motion.p>
    </div>
  )
}
