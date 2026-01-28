

import React from "react"

import { Button } from "@/components/ui/button"
import { Pyramid, Box, Droplet, Circle } from "lucide-react"

interface MarketItem {
  symbol: string
  name: string
  price: string
  change: string
  isPositive: boolean
  iconBg: string
  icon: React.ReactNode
}

const marketData: MarketItem[] = [
  {
    symbol: "XAU",
    name: "London Gold",
    price: "$ 4,839.35",
    change: "+1.23%",
    isPositive: true,
    iconBg: "bg-gradient-to-br from-[#f59e0b] to-[#b45309]",
    icon: <Pyramid className="w-5 h-5 text-white" />,
  },
  {
    symbol: "XAG",
    name: "London Silver",
    price: "$ 93.96",
    change: "+3.37%",
    isPositive: true,
    iconBg: "bg-gradient-to-br from-[#fbbf24] to-[#d97706]",
    icon: <Box className="w-5 h-5 text-white" />,
  },
  {
    symbol: "CL",
    name: "WTI Oil",
    price: "$ 59.539",
    change: "-1.71%",
    isPositive: false,
    iconBg: "bg-gradient-to-br from-[#7f1d1d] to-[#450a0a]",
    icon: <Droplet className="w-5 h-5 text-white" />,
  },
  {
    symbol: "HG",
    name: "COMEX Copper",
    price: "$ 574.099",
    change: "-0.02%",
    isPositive: false,
    iconBg: "bg-gradient-to-br from-[#c2410c] to-[#9a3412]",
    icon: <Circle className="w-5 h-5 text-white" />,
  },
]

function MarketIcon({ iconBg, icon }: { iconBg: string; icon: React.ReactNode }) {
  return (
    <div className={`w-11 h-11 rounded-full ${iconBg} flex items-center justify-center shadow-md`}>
      {icon}
    </div>
  )
}

export function MarketData() {
  return (
    <div className="mx-4 mt-4 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-1 py-4">
        <h2 className="text-xl font-bold text-foreground">Market Data</h2>
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full border-[#3b82f6] text-[#3b82f6] hover:bg-[#3b82f6]/10 px-5 bg-transparent h-9"
        >
          Options
        </Button>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-3 px-1 pb-3 text-sm text-muted-foreground">
        <span>Name</span>
        <span>Price</span>
        <span className="text-right">24h</span>
      </div>

      {/* Market Items */}
      <div className="space-y-1">
        {marketData.map((item) => (
          <div
            key={item.symbol}
            className="grid grid-cols-3 items-center px-1 py-4 hover:bg-muted/30 transition-colors rounded-lg"
          >
            {/* Name Column */}
            <div className="flex items-center gap-3">
              <MarketIcon iconBg={item.iconBg} icon={item.icon} />
              <div>
                <div className="font-semibold text-foreground text-base">{item.symbol}</div>
                <div className="text-xs text-muted-foreground">{item.name}</div>
              </div>
            </div>

            {/* Price Column */}
            <div className="font-medium text-foreground">{item.price}</div>

            {/* Change Column */}
            <div className={`text-right font-semibold ${item.isPositive ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
              {item.change}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
