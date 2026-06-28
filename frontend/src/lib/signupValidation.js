export function validateName(name) {
  const trimmed = name.trim()
  if (!trimmed) return 'Full name is required'
  if (trimmed.length < 2) return 'Name must be at least 2 characters'
  return ''
}

export function validateEmail(email) {
  const trimmed = email.trim()
  if (!trimmed) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Enter a valid email address'
  return ''
}

export function validateNationalId(nationalId) {
  const digits = nationalId.replace(/\D/g, '')
  if (!digits) return 'National ID is required'
  if (digits.length < 9 || digits.length > 12) return 'National ID must be 9–12 digits'
  return ''
}

export function validateBirthDate(birthDate) {
  if (!birthDate) return 'Birth date is required'
  const date = new Date(birthDate)
  if (Number.isNaN(date.getTime())) return 'Enter a valid birth date'
  if (date > new Date()) return 'Birth date cannot be in the future'
  return ''
}

export function passwordStrength(pw) {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}

export function validatePassword(password) {
  if (!password) return 'Password is required'
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(password)) return 'Include at least one uppercase letter'
  if (!/[a-z]/.test(password)) return 'Include at least one lowercase letter'
  if (!/[0-9]/.test(password)) return 'Include at least one number'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Include at least one special character'
  return ''
}

export function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) return 'Please confirm your password'
  if (password !== confirmPassword) return 'Passwords do not match'
  return ''
}

export function normalizeNationalNumber(value) {
  return value.replace(/\D/g, '').replace(/^0+/, '')
}

export function buildE164(countryCode, nationalNumber) {
  const digits = normalizeNationalNumber(nationalNumber)
  if (!digits) return ''
  return `${countryCode}${digits}`
}

export function validatePhoneNational(nationalNumber) {
  const digits = normalizeNationalNumber(nationalNumber)
  if (!digits) return 'Mobile number is required'
  if (digits.length < 7 || digits.length > 15) return 'Enter a valid mobile number'
  return ''
}

export function validateE164(mobile) {
  if (!mobile) return 'Mobile number is required'
  if (!/^\+[1-9]\d{7,14}$/.test(mobile)) return 'Enter a valid mobile number with country code'
  return ''
}

export function parseAllergiesInput(input) {
  if (!input || !input.trim()) return []
  return input
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
}

export function convertHeightToCm(value, unit) {
  const num = Number(value)
  if (!value || Number.isNaN(num) || num <= 0) return null
  if (unit === 'in') return num * 2.54
  return num
}

export function convertWeightToKg(value, unit) {
  const num = Number(value)
  if (!value || Number.isNaN(num) || num <= 0) return null
  if (unit === 'lbs') return num * 0.453592
  return num
}
