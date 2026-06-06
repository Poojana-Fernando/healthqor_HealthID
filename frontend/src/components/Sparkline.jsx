export default function Sparkline({ data, color = '#5eead4', height = 32, width = 88, className = '' }) {
  if (!data?.length || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pad = 3

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (width - pad * 2)
      const y = pad + (height - pad * 2) - ((v - min) / range) * (height - pad * 2)
      return `${x},${y}`
    })
    .join(' ')

  const last = data[data.length - 1]
  const lastX = width - pad
  const lastY = pad + (height - pad * 2) - ((last - min) / range) * (height - pad * 2)

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`mx-auto mt-2 opacity-70 ${className}`}
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} opacity="0.9" />
    </svg>
  )
}
