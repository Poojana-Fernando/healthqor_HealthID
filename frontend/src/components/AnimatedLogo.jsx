export default function AnimatedLogo({ size = 48 }) {
  return (
    <div className="relative" style={{ width: size, height: size }} aria-hidden="true">
      <div className="absolute inset-0 rounded-full border-2 border-emerald-400/40 medical-logo-pulse" />

      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#5eead4" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="crossGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a7f3d0" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>

        <path
          d="M50 10 L78 22 V46 C78 64 50 82 50 82 S22 64 22 46 V22 Z"
          fill="url(#shieldGrad)"
          stroke="#34d399"
          strokeWidth="1.8"
          className="medical-shield"
        />

        <rect x="44" y="30" width="12" height="34" rx="2.5" fill="url(#crossGrad)" />
        <rect x="33" y="41" width="34" height="12" rx="2.5" fill="url(#crossGrad)" />

        <path
          d="M12 74 H28 L34 60 L40 80 L46 54 L52 74 H88"
          fill="none"
          stroke="#5eead4"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="medical-ecg"
        />
      </svg>
    </div>
  )
}
