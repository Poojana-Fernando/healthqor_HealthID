import bgVideo from '../bgVideo/snowfall-in-forest.3840x2160.mp4'

export default function LiveBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover brightness-110 contrast-105"
        src={bgVideo}
      />
      {/* Light edge vignettes only — keeps video highly visible */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628]/20 via-transparent to-[#0a1628]/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#064e3b]/8 via-transparent to-[#0e7490]/8" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0a1628]/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a1628]/35 to-transparent" />
      <div className="neural-mesh absolute inset-0 opacity-20" />
    </div>
  )
}
