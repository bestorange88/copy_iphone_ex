

import { Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"

export function HeroBanner() {
  return (
    <div className="relative mx-4 rounded-2xl overflow-hidden">
      {/* Background image - SAXO BANK data center */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('/images/image.png')`
        }}
      />
      
      {/* Dark overlay for readability - lighter opacity to show background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a]/50 via-[#1e3a5f]/40 to-[#0c1929]/50" />
      
      {/* Bottom accent line - purple to cyan gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#8b5cf6] via-[#06b6d4] to-[#22c55e]" />
      
      {/* Content */}
      <div className="relative z-10 px-5 py-8">
        <h1 className="text-[28px] font-bold text-foreground leading-tight mb-3">
          Futures <span className="text-[#ef4444]">Cryptocurrency</span>
          <br />
          Trading Platform
        </h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Millisecond - level trade execution · Institutional - level security protection · Global market coverage
        </p>
        <Button className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold px-6 py-2.5 h-auto rounded-lg flex items-center gap-2">
          <Smartphone className="w-4 h-4" />
          Download App
        </Button>
      </div>
    </div>
  )
}
