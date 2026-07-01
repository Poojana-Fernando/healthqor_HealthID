import { getLegendTypes } from '../../lib/facilityUtils'

export default function FacilityMapLegend() {
  const items = getLegendTypes()

  return (
    <div className="facility-map-legend" aria-label="Map legend">
      <p className="text-[10px] uppercase tracking-wide text-white/50 mb-2 font-semibold">Legend</p>
      <ul className="space-y-1.5">
        {items.map(({ key, label, dotClass }) => (
          <li key={key} className="flex items-center gap-2 text-xs text-white/80">
            <span
              className={
                key === 'pharmacy'
                  ? 'w-2.5 h-2.5 rounded-full shrink-0 bg-white border border-slate-500/60'
                  : `w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`
              }
            />
            {label}
          </li>
        ))}
        <li className="flex items-center gap-2 text-xs text-white/80">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-red-500" />
          Your location
        </li>
      </ul>
    </div>
  )
}
