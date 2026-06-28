export function maskMobile(mobile) {
  if (!mobile || mobile.length < 6) return '***'
  const suffix = mobile.slice(-3)
  const prefix = mobile.slice(0, -3)
  return prefix.replace(/\d/g, '•') + suffix
}
