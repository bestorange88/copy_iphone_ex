

import type { ReactNode } from "react"

interface DeviceFrameProps {
  children: ReactNode
}

export function DeviceFrame({ children }: DeviceFrameProps) {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: 'url(/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Dark overlay for background */}
      <div className="absolute inset-0 bg-black/40" />
      
      {/* Phone Frame */}
      <div className="relative w-[420px] h-[900px] bg-[#0f0f1a] rounded-[55px] border-[10px] border-[#2a2a3a] shadow-2xl overflow-hidden z-10">
        
        {/* Status Bar */}
        <div className="absolute top-0 left-0 right-0 h-12 z-50 flex items-center justify-between px-8 pt-2">
          <span className="text-white text-sm font-medium">23:14</span>
          <div className="flex items-center gap-1">
            <span className="text-white text-sm font-medium">5G</span>
            <span className="text-white text-sm font-medium">100%</span>
          </div>
        </div>
        
        {/* Dynamic Island - iPhone 14/15/16/17 style */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[126px] h-[37px] bg-black rounded-[20px] z-50 flex items-center justify-center">
          {/* Camera dot */}
          <div className="absolute right-4 w-[10px] h-[10px] bg-[#1a1a3a] rounded-full border border-[#2a2a4a]" />
        </div>
        
        {/* Screen Content - hidden scrollbar, starts below status bar */}
        <div className="w-full h-full pt-14 overflow-y-auto overflow-x-hidden bg-background rounded-[45px] scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {children}
        </div>
        
        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-white/30 rounded-full z-50" />
      </div>
    </div>
  )
}
