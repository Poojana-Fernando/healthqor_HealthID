import { motion } from 'framer-motion'
import { CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/Card'
import { Label } from '../../ui/Label'
import { Input } from '../../ui/Input'
import PhoneInput from '../PhoneInput'
import {
  passwordStrength,
  validateConfirmPassword,
  validatePhoneNational,
} from '../../../lib/signupValidation'
import { cn } from '../../../lib/utils'

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { key: 'lower', label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { key: 'digit', label: 'One number', test: (pw) => /[0-9]/.test(pw) },
  { key: 'special', label: 'One special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
]

export default function AccountSecurityStep({
  form,
  errors,
  onChange,
  onPhoneCountryChange,
  onPhoneNationalChange,
}) {
  const strength = passwordStrength(form.password)
  const password = form.password
  const confirmPassword = form.confirmPassword

  const confirmHint =
    confirmPassword && !validateConfirmPassword(password, confirmPassword)
      ? 'Passwords match'
      : confirmPassword
        ? validateConfirmPassword(password, confirmPassword)
        : ''

  const phoneHint = form.phoneNationalNumber
    ? validatePhoneNational(form.phoneNationalNumber)
    : ''

  return (
    <>
      <CardHeader>
        <CardTitle>Account security</CardTitle>
        <CardDescription>Set up your mobile number and password</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <motion.div variants={fadeInUp} initial="hidden" animate="visible">
          <PhoneInput
            countryCode={form.phoneCountryCode}
            nationalNumber={form.phoneNationalNumber}
            onCountryCodeChange={onPhoneCountryChange}
            onNationalNumberChange={onPhoneNationalChange}
            error={errors.mobile || phoneHint}
          />
        </motion.div>

        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => onChange('password', e.target.value)}
          />
          <div className="flex gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded ${strength >= i ? 'bg-accent' : 'bg-white/20'}`}
              />
            ))}
          </div>
          {password && (
            <ul className="mt-2 space-y-1">
              {PASSWORD_RULES.map((rule) => {
                const met = rule.test(password)
                return (
                  <li
                    key={rule.key}
                    className={cn(
                      'text-xs flex items-center gap-1.5',
                      met ? 'text-accent' : 'text-white/45',
                    )}
                  >
                    <span aria-hidden>{met ? '✓' : '○'}</span>
                    {rule.label}
                  </li>
                )
              })}
            </ul>
          )}
          {errors.password && <p className="text-red-400 text-xs">{errors.password}</p>}
        </motion.div>

        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => onChange('confirmPassword', e.target.value)}
          />
          {confirmHint && (
            <p
              className={cn(
                'text-xs',
                confirmHint === 'Passwords match' ? 'text-accent' : 'text-red-400',
              )}
            >
              {confirmHint}
            </p>
          )}
          {errors.confirmPassword && (
            <p className="text-red-400 text-xs">{errors.confirmPassword}</p>
          )}
        </motion.div>
      </CardContent>
    </>
  )
}
