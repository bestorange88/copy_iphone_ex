

import { Bell, Globe } from "lucide-react"

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-4 bg-background">
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-widest text-foreground">SAXO</span>
        <span className="text-[9px] text-[#00d4ff] font-semibold tracking-wider">BE INVESTED</span>
      </div>
      <div className="flex items-center gap-5">
        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="w-6 h-6" />
        </button>
        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
          <Globe className="w-6 h-6" />
        </button>
      </div>
    </header>
  )
}
