import { Label } from '../ui/Label'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { PHONE_COUNTRIES } from '../../constants/phoneCountries'
import { validatePhoneNational } from '../../lib/signupValidation'

export default function PhoneInput({
  countryCode,
  nationalNumber,
  onCountryCodeChange,
  onNationalNumberChange,
  error,
  id = 'mobile',
}) {
  const handleNumberChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '')
    onNationalNumberChange(digits)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Mobile number</Label>
      <div className="flex gap-2">
        <Select
          value={countryCode}
          onChange={(e) => onCountryCodeChange(e.target.value)}
          className="w-[130px] shrink-0"
          aria-label="Country code"
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={`${c.iso}-${c.code}`} value={c.code}>
              {c.code}
            </option>
          ))}
        </Select>
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          placeholder="771234567"
          value={nationalNumber}
          onChange={handleNumberChange}
          className="flex-1"
          aria-invalid={!!error}
        />
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}

export function getPhoneError(countryCode, nationalNumber) {
  return validatePhoneNational(nationalNumber)
}
