

import { CreditCard, FileText, Headphones } from "lucide-react"

const actions = [
  {
    icon: CreditCard,
    label: "Deposit",
    bgColor: "bg-[#fbbf24]",
  },
  {
    icon: FileText,
    label: "Withdraw", 
    bgColor: "bg-[#3b82f6]",
  },
  {
    icon: Headphones,
    label: "Customer Service",
    bgColor: "bg-[#ef4444]",
    ringColor: "ring-[#ef4444]/30",
  },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-3 gap-4 py-5 px-6 bg-card mx-4 mt-4 rounded-xl border border-border/50">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          className="flex flex-col items-center gap-2.5 group"
        >
          <div className={`w-14 h-14 rounded-full ${action.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg ${action.ringColor ? `ring-4 ${action.ringColor}` : ''}`}>
            <action.icon className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs text-foreground font-medium text-center">{action.label}</span>
        </button>
      ))}
    </div>
  )
}
