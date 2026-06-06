export default function HealthIdCard({ profile, compact = false }) {
  if (!profile) {
    return (
      <div className={`premium-glass rounded-3xl p-8 md:p-10 shadow-glass-glow-lg ${compact ? '' : 'max-w-md'}`}>
        <p className="text-accent2 text-sm mb-3 font-medium tracking-wide">Digital Health Identity</p>
        <h2 className="text-2xl md:text-3xl font-bold mb-5 tracking-tight">Get Your Health ID</h2>
        <p className="text-sm opacity-70 mb-6 leading-relaxed">
          Register to receive your unique Health ID — a secure, doctor-verified digital health record.
        </p>
        <a href="/signup" className="cta-premium inline-block px-8 py-3">
          Sign Up Now
        </a>
      </div>
    )
  }

  return (
    <div className={`premium-glass rounded-3xl p-8 md:p-10 border border-white/10 shadow-glass-glow-lg ${compact ? '' : 'max-w-md'}`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-accent2 text-xs uppercase tracking-widest">Health ID Sri Lanka</p>
          <p className="font-mono text-lg text-accent mt-1">{profile.healthId}</p>
        </div>
        <div className="flex gap-1">
          {profile.verified && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Verified</span>
          )}
          {profile.doctorVerified && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              ✓ Doctor Verified
            </span>
          )}
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="opacity-60">Name</span><span>{profile.name}</span></div>
        <div className="flex justify-between"><span className="opacity-60">Country</span><span>{profile.country}</span></div>
      </div>
    </div>
  )
}
