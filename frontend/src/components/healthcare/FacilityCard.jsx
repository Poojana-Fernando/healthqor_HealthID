import { MapPin, Phone, Star } from 'lucide-react'
import { cn } from '../../lib/utils'
import { getFacilityStyle } from '../../lib/facilityUtils'

function formatPhone(phone) {
  if (!phone) return null
  return phone.replace(/\s+/g, '')
}

export default function FacilityCard({ facility, isRecommended, isSelected, onSelect }) {
  const phoneHref = facility.phone ? `tel:${formatPhone(facility.phone)}` : null
  const style = getFacilityStyle(facility)

  return (
    <button
      type="button"
      onClick={() => onSelect?.(facility)}
      className={cn(
        'w-full text-left premium-glass rounded-2xl p-4 transition-all duration-300',
        'hover:border-accent/40 hover:shadow-glass-glow',
        isSelected && 'border-accent/60 shadow-glass-glow ring-1 ring-accent/30',
        isRecommended && 'border-accent2/50',
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn('w-2.5 h-2.5 rounded-full shrink-0', style.dotClass)}
              aria-hidden
            />
            <h3 className="font-semibold text-text truncate">{facility.name}</h3>
            <span
              className={cn(
                'text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full border',
                style.badgeClass,
              )}
            >
              {style.label}
            </span>
            {isRecommended && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent2 border border-accent/30">
                <Star className="w-3 h-3" />
                Top pick
              </span>
            )}
          </div>
        </div>
        <span className="shrink-0 text-xs font-medium text-accent2 bg-accent/10 px-2 py-1 rounded-full border border-accent/20">
          {facility.distanceKm} km
        </span>
      </div>

      {facility.matchReason && (
        <p className="text-sm text-white/70 mb-3 leading-relaxed">{facility.matchReason}</p>
      )}

      {facility.address && (
        <p className="text-xs text-white/50 flex items-start gap-1.5 mb-2">
          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-accent/70" />
          <span>{facility.address}</span>
        </p>
      )}

      {phoneHref ? (
        <a
          href={phoneHref}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent2 hover:text-accent transition"
        >
          <Phone className="w-4 h-4" />
          {facility.phone}
        </a>
      ) : (
        <p className="text-xs text-white/40 italic">Phone not listed</p>
      )}
    </button>
  )
}
