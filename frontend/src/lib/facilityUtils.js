export const FACILITY_TYPE_STYLES = {
  hospital: {
    label: 'Hospital',
    color: '#eab308',
    badgeClass: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/40',
    dotClass: 'bg-yellow-400',
  },
  clinic: {
    label: 'Clinic',
    color: '#38bdf8',
    badgeClass: 'bg-sky-400/20 text-sky-300 border-sky-400/40',
    dotClass: 'bg-sky-400',
  },
  doctors: {
    label: 'Doctor',
    color: '#a78bfa',
    badgeClass: 'bg-violet-400/20 text-violet-300 border-violet-400/40',
    dotClass: 'bg-violet-400',
  },
  pharmacy: {
    label: 'Pharmacy',
    color: '#ffffff',
    pinBorderColor: 'rgba(15, 23, 42, 0.55)',
    badgeClass: 'bg-white/15 text-white border-white/35',
    dotClass: 'bg-white border border-white/40',
  },
  healthcare: {
    label: 'Healthcare',
    color: '#34d399',
    badgeClass: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40',
    dotClass: 'bg-emerald-400',
  },
  default: {
    label: 'Facility',
    color: '#5eead4',
    badgeClass: 'bg-teal-400/20 text-teal-300 border-teal-400/40',
    dotClass: 'bg-teal-400',
  },
}

const LEGEND_TYPES = ['hospital', 'clinic', 'doctors', 'pharmacy']

export function normalizeFacilityType(type) {
  const value = String(type ?? '').trim().toLowerCase()
  if (!value) return 'healthcare'
  if (value === 'doctor') return 'doctors'
  if (value === 'pharmacy' || value.includes('pharm') || value.includes('chemist')) return 'pharmacy'
  if (FACILITY_TYPE_STYLES[value]) return value
  if (value.includes('clinic')) return 'clinic'
  if (value.includes('doctor')) return 'doctors'
  if (value.includes('hospital')) return 'hospital'
  return 'healthcare'
}

export function getFacilityStyle(facility) {
  const typeKey = normalizeFacilityType(facility?.type)
  const base = FACILITY_TYPE_STYLES[typeKey] ?? FACILITY_TYPE_STYLES.default
  const large = isLargeHospital(facility)
  return {
    typeKey,
    ...base,
    pinBorderColor: base.pinBorderColor ?? 'rgba(255,255,255,0.95)',
    label: large && typeKey === 'hospital' ? 'Large hospital' : base.label,
    pinSize: large ? 32 : typeKey === 'hospital' ? 28 : 26,
  }
}

export function isLargeHospital(facility) {
  const type = normalizeFacilityType(facility?.type)
  if (type !== 'hospital') return false

  const name = String(facility?.name ?? '').toLowerCase()
  if (/pharmacy|chemist|dispensary/.test(name)) return false

  if (facility?.largeHospital) return true

  return /national hospital|general hospital|teaching hospital|district hospital|base hospital|medical college/.test(name)
}

export function getLegendTypes() {
  return LEGEND_TYPES.map((key) => ({ key, ...FACILITY_TYPE_STYLES[key] }))
}
