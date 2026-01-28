

import React from "react"

import { useState } from "react"
import { FloatingParticles } from "./floating-particles"

const filters = [
  { id: "optional", label: "Optional" },
  { id: "all", label: "All" },
  { id: "cfd", label: "CFD" },
  { id: "forex", label: "Forex" },
  { id: "crypto", label: "Crypto" },
]

interface MarketAsset {
  symbol: string
  name: string
  code: string
  price: string
  change: string
  isPositive: boolean
  iconBg: string
  iconContent: React.ReactNode
}

const marketAssets: MarketAsset[] = [
  {
    symbol: "XAU",
    name: "London Gold",
    code: "XAU",
    price: "$ 4,836.22",
    change: "+1.19%",
    isPositive: true,
    iconBg: "bg-gradient-to-br from-[#f59e0b] to-[#b45309]",
    iconContent: <div className="w-4 h-3 border-2 border-white rounded-sm" />,
  },
  {
    symbol: "XAG",
    name: "London Silver",
    code: "XAG",
    price: "$ 93.86",
    change: "+3.28%",
    isPositive: true,
    iconBg: "bg-gradient-to-br from-[#fbbf24] to-[#d97706]",
    iconContent: <div className="w-4 h-4 bg-[#fbbf24] border-2 border-white rounded-sm" />,
  },
  {
    symbol: "CL",
    name: "WTI Oil",
    code: "CL",
    price: "$ 59.546",
    change: "-1.74%",
    isPositive: false,
    iconBg: "bg-gradient-to-br from-[#7f1d1d] to-[#450a0a]",
    iconContent: <div className="w-3 h-4 bg-white/80 rounded-full" />,
  },
  {
    symbol: "HG",
    name: "COMEX Copper",
    code: "HG",
    price: "$ 574.440",
    change: "+0.04%",
    isPositive: true,
    iconBg: "bg-gradient-to-br from-[#c2410c] to-[#9a3412]",
    iconContent: <div className="w-4 h-4 rounded-full border-2 border-white" />,
  },
  {
    symbol: "NG",
    name: "Natural Gas",
    code: "Futures",
    price: "$ 3.680",
    change: "+4.93%",
    isPositive: true,
    iconBg: "bg-gradient-to-br from-[#1e3a5f] to-[#0c1929]",
    iconContent: <span className="text-[10px] text-white font-bold">NG</span>,
  },
  {
    symbol: "USDAUD",
    name: "USDAUD",
    code: "USDAUD",
    price: "$ 1.4668",
    change: "-0.71%",
    isPositive: false,
    iconBg: "bg-gradient-to-br from-[#dc2626] to-[#991b1b]",
    iconContent: <span className="text-[8px] text-white font-bold">AUD</span>,
  },
  {
    symbol: "USDGBP",
    name: "USDGBP",
    code: "USDGBP",
    price: "$ 0.7443",
    change: "-0.06%",
    isPositive: false,
    iconBg: "bg-gradient-to-br from-[#1e40af] to-[#1e3a8a]",
    iconContent: <span className="text-[8px] text-white font-bold">GBP</span>,
  },
  {
    symbol: "USDJPY",
    name: "USDJPY",
    code: "USDJPY",
    price: "$ 158.6138",
    change: "+0.26%",
    isPositive: true,
    iconBg: "bg-white",
    iconContent: <div className="w-3 h-3 rounded-full bg-[#dc2626]" />,
  },
  {
    symbol: "BTC",
    name: "Bitcoin",
    code: "BTC",
    price: "$ 89,229.06",
    change: "-0.38%",
    isPositive: false,
    iconBg: "bg-gradient-to-br from-[#f59e0b] to-[#d97706]",
    iconContent: <span className="text-white font-bold text-sm">B</span>,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    code: "ETH",
    price: "$ 2,953.23",
    change: "-0.84%",
    isPositive: false,
    iconBg: "bg-gradient-to-br from-[#6366f1] to-[#4f46e5]",
    iconContent: <span className="text-white font-bold text-xs">E</span>,
  },
]

export function MarketPage() {
  const [activeFilter, setActiveFilter] = useState("all")

  return (
    <div className="min-h-full bg-background flex flex-col relative">
      <FloatingParticles />
      
      {/* Header */}
      <header className="text-center py-4 relative z-10">
        <h1 className="text-xl font-bold text-foreground">Market</h1>
      </header>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 px-4 mb-4 relative z-10">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActiveFilter(filter.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeFilter === filter.id
                ? "bg-[#3b82f6] text-white"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Gradient line */}
      <div className="h-0.5 bg-gradient-to-r from-[#ec4899] via-[#8b5cf6] to-[#3b82f6] mx-4 mb-4" />

      {/* Table Header */}
      <div className="grid grid-cols-3 px-4 py-2 text-sm text-muted-foreground relative z-10">
        <span>Name</span>
        <span>Price</span>
        <span className="text-right">24h</span>
      </div>

      {/* Market List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 relative z-10">
        {marketAssets.map((asset) => (
          <div
            key={asset.symbol}
            className="grid grid-cols-3 items-center py-4 border-b border-border/30"
          >
            {/* Name Column */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${asset.iconBg} flex items-center justify-center shadow-md`}>
                {asset.iconContent}
              </div>
              <div>
                <div className="font-semibold text-foreground">{asset.name}</div>
                <div className="text-xs text-muted-foreground">{asset.code}</div>
              </div>
            </div>

            {/* Price Column */}
            <div className="font-medium text-foreground">{asset.price}</div>

            {/* Change Column */}
            <div className={`text-right font-semibold ${asset.isPositive ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
              {asset.change}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
