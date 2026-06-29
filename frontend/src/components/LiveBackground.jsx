import { useRef, useState } from 'react'
import bgVideo from '../bgVideo/bg.mp4'

const isScreenshotMode = () =>
  typeof window !== 'undefined' && window.location.search.includes('screenshot=1')

export default function LiveBackground() {
  const videoRef = useRef(null)
  const [videoReady, setVideoReady] = useState(false)
  const screenshotMode = isScreenshotMode()

  const handleCanPlay = () => {
    const video = videoRef.current
    if (video?.videoWidth > 0) {
      setVideoReady(true)
    }
  }

  const handleError = () => {
    setVideoReady(false)
  }

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-[#0a1628] bg-performance-layer"
      aria-hidden="true"
    >
      {/* Always-on fallback so slow loads, video errors, and headless captures never show white */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(145deg, #0a1628 0%, #064e3b 35%, #0c4a6e 65%, #0a1628 100%)',
        }}
      />
      {!screenshotMode && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={handleCanPlay}
          onError={handleError}
          className={`absolute inset-0 w-full h-full object-cover brightness-110 contrast-105 bg-video-layer transition-opacity duration-1000 ${
            videoReady ? 'opacity-100' : 'opacity-0'
          }`}
          src={bgVideo}
        />
      )}
      {/* Light edge vignettes only — keeps video highly visible */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628]/20 via-transparent to-[#0a1628]/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#064e3b]/8 via-transparent to-[#0e7490]/8" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0a1628]/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a1628]/35 to-transparent" />
      <div className="neural-mesh absolute inset-0 opacity-20" />
    </div>
  )
}
