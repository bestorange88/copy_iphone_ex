

import { useEffect, useState } from "react"
import { TrendingUp } from "lucide-react"

interface MinimizedWidgetProps {
  productName: string
  totalSeconds: number
  remainingSeconds: number
  onClick: () => void
}

export function MinimizedWidget({ productName, totalSeconds, remainingSeconds, onClick }: MinimizedWidgetProps) {
  const [pulse, setPulse] = useState(false)
  
  // Pulsing animation
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const timeDisplay = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  
  // Progress for the ring
  const progress = remainingSeconds / totalSeconds
  const circumference = 2 * Math.PI * 32
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-20 h-20 rounded-full bg-[#1e293b] border-2 border-[#334155] shadow-xl flex flex-col items-center justify-center transition-transform hover:scale-105 active:scale-95"
    >
      {/* Progress ring */}
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r="32"
          fill="none"
          stroke="#334155"
          strokeWidth="3"
        />
        <circle
          cx="40"
          cy="40"
          r="32"
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Badge */}
      <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#ef4444] rounded-full flex items-center justify-center text-white text-xs font-bold">
        1
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        <span className="text-[10px] text-white/80 leading-tight">{productName}</span>
        <span className="text-[10px] text-white/80 leading-tight">Silver</span>
        <span className="text-sm font-bold text-white">{timeDisplay}</span>
      </div>
      
      {/* Trending animation */}
      <div className={`absolute bottom-1 right-1 transition-opacity ${pulse ? "opacity-100" : "opacity-50"}`}>
        <TrendingUp className="w-3 h-3 text-[#22c55e]" />
      </div>
    </button>
  )
}
