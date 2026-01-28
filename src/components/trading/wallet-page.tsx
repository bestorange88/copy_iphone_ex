

import { useState, useEffect } from "react"
import { Eye, ArrowDown, ArrowUp, ArrowLeftRight, ChevronLeft, History, Copy, Lock, Upload, Check, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FloatingParticles } from "./floating-particles"

// Animated pie chart component - animates as fan/sector from line to circle
function AnimatedPieChart({ isGray, onToggle }: { isGray: boolean; onToggle: () => void }) {
  const [progress, setProgress] = useState(0)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(interval)
            return 100
          }
          return p + 1.5
        })
      }, 15)
      return () => clearInterval(interval)
    }, 300)
    return () => clearTimeout(timer)
  }, [])
  
  const color = isGray ? "#6b7280" : "#6366f1"
  const cx = 60
  const cy = 60
  const radius = 48
  
  // Calculate fan/sector path - starts from center, draws arc
  // Leave a small gap (like Pac-Man) - about 30 degrees gap
  const gapAngle = 30
  const maxAngle = 360 - gapAngle
  const currentAngle = (progress / 100) * maxAngle
  
  // Convert angle to radians, starting from bottom-right
  const startAngle = (90 + gapAngle / 2) * (Math.PI / 180)
  const endAngle = startAngle + currentAngle * (Math.PI / 180)
  
  // Calculate arc endpoints
  const x1 = cx + radius * Math.cos(startAngle)
  const y1 = cy + radius * Math.sin(startAngle)
  const x2 = cx + radius * Math.cos(endAngle)
  const y2 = cy + radius * Math.sin(endAngle)
  
  // Large arc flag
  const largeArc = currentAngle > 180 ? 1 : 0
  
  // Create pie sector path (from center to arc and back)
  const piePath = progress > 0 
    ? `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
    : ""
  
  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="w-full h-full" viewBox="0 0 120 120">
        {/* Animated pie sector */}
        <path
          d={piePath}
          fill={color}
          style={{ transition: "fill 0.3s ease" }}
        />
      </svg>
      
      {/* Center label - USDT inside the pie */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: progress >= 60 ? 1 : 0, transition: "opacity 0.3s ease" }}
      >
        <span className="text-white text-sm font-medium mt-4">USDT</span>
      </div>
      
      {/* Legend line extending from bottom of circle */}
      <svg 
        className="absolute w-full h-full" 
        viewBox="0 0 120 120"
        style={{ opacity: progress >= 80 ? 1 : 0, transition: "opacity 0.3s ease" }}
      >
        {/* Horizontal line from pie edge */}
        <line x1="60" y1="108" x2="60" y2="115" stroke={color} strokeWidth="1" />
        <line x1="60" y1="115" x2="85" y2="115" stroke={color} strokeWidth="1" />
      </svg>
      
      {/* USDT label at end of line */}
      <div 
        className="absolute bottom-0 left-1/2 translate-x-2"
        style={{ opacity: progress >= 85 ? 1 : 0, transition: "opacity 0.3s ease" }}
      >
        <span className="text-muted-foreground text-xs">USDT</span>
      </div>
      
      {/* External legend box - clickable to toggle gray */}
      <button
        type="button"
        onClick={onToggle}
        className="absolute -bottom-2 right-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:opacity-80 transition-opacity"
        style={{ opacity: progress >= 90 ? 1 : 0, transition: "opacity 0.3s ease" }}
      >
        <span>USDT</span>
        <div 
          className="w-5 h-3 rounded-sm transition-colors"
          style={{ backgroundColor: color }}
        />
      </button>
    </div>
  )
}

// Animated line chart for total assets - draws from left to right
function AnimatedLineChart() {
  const [progress, setProgress] = useState(0)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(interval)
            return 100
          }
          return p + 2
        })
      }, 25)
      return () => clearInterval(interval)
    }, 200)
    return () => clearTimeout(timer)
  }, [])
  
  // Staircase line data points (stepped chart)
  const points = [
    { x: 0, y: 80 },
    { x: 20, y: 80 },
    { x: 20, y: 60 },
    { x: 40, y: 60 },
    { x: 40, y: 45 },
    { x: 55, y: 45 },
    { x: 55, y: 35 },
    { x: 70, y: 35 },
    { x: 70, y: 25 },
    { x: 85, y: 25 },
    { x: 85, y: 15 },
    { x: 100, y: 15 },
  ]
  
  // Calculate which points to show based on progress
  const visiblePointsCount = Math.ceil((progress / 100) * points.length)
  const visiblePoints = points.slice(0, visiblePointsCount)
  
  // Create path string
  const pathD = visiblePoints.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ')
  
  return (
    <svg className="w-full h-16" viewBox="0 0 100 100" preserveAspectRatio="none">
      {/* Gradient definition */}
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      {/* The animated line */}
      <path
        d={pathD}
        fill="none"
        stroke="url(#lineGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type WalletView = "main" | "deposit" | "withdraw" | "records"
type RecordType = "deposit" | "withdraw"

// Asset data
const assets = [
  { symbol: "USDT", name: "Tether USD", balance: "4,552,025.50000000", usd: "4,552,025.50", icon: "bg-[#26a17b]", textIcon: "T" },
  { symbol: "BTC", name: "Bitcoin", balance: "0.00000000", usd: "0.00", icon: "bg-[#f7931a]", textIcon: "B" },
  { symbol: "ETH", name: "Ethereum", balance: "0.00000000", usd: "0.00", icon: "bg-[#627eea]", textIcon: "E" },
  { symbol: "DOGE", name: "Dogecoin", balance: "0.00000000", usd: "0.00", icon: "bg-[#c2a633]", textIcon: "D" },
  { symbol: "ADA", name: "Cardano", balance: "0.00000000", usd: "0.00", icon: "bg-[#0033ad]", textIcon: "A" },
  { symbol: "SOL", name: "Solana", balance: "0.00000000", usd: "0.00", icon: "bg-[#9945ff]", textIcon: "S" },
  { symbol: "AVAX", name: "Avalanche", balance: "0.00000000", usd: "0.00", icon: "bg-[#e84142]", textIcon: "A" },
  { symbol: "SHIB", name: "SHIBA INU", balance: "0.00000000", usd: "0.00", icon: "bg-[#ffa409]", textIcon: "S" },
]

// Transaction records
const transactions = [
  { type: "credit", amount: "+7,000.00000000", date: "2026/01/22 23:36:41", balance: "4,552,025.50000000", orderId: "20260123003610179­5", label: "Order settlement" },
  { type: "debit", amount: "-5,000.00000000", date: "2026/01/22 23:36:10", balance: "4,545,025.50000000", orderId: "20260123003610179­5", label: "Trade" },
  { type: "credit", amount: "+7,500.00000000", date: "2026/01/22 23:27:43", balance: "4,550,025.50000000", orderId: "20260123002642405­0", label: "Order settlement" },
  { type: "debit", amount: "-5,000.00000000", date: "2026/01/22 23:26:42", balance: "4,542,525.50000000", orderId: "20260123002642405­0", label: "Trade" },
]

const depositRecords = [
  { symbol: "USDT", amount: "108,888.00000000", submitAmount: "108,888.00000000", receivedAmount: "108,888.00000000", method: "錢包", submitTime: "2026/01/10 21:08:55", processTime: "2026/01/10 21:08:55", status: "已通過" }
]

// Network selector modal
function NetworkSelector({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (network: string) => void }) {
  if (!open) return null
  
  return (
    <>
      <div className="absolute inset-0 bg-black/70 z-50" onClick={onClose} />
      <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl p-4 z-50">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <span className="text-black font-medium">選擇入款網絡</span>
        </div>
        <button
          type="button"
          onClick={() => { onSelect("Tron"); onClose(); }}
          className="w-full flex items-center justify-between p-3 rounded-xl border border-[#22c55e] bg-[#22c55e]/5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#eb0029] flex items-center justify-center">
              <span className="text-white text-xs font-bold">TRX</span>
            </div>
            <div className="text-left">
              <div className="text-black font-medium">Tron (TRC20)</div>
              <div className="text-gray-500 text-sm">Tron (TRC20)</div>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full bg-[#22c55e] flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        </button>
      </div>
    </>
  )
}

// Records dropdown
function RecordsDropdown({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (type: RecordType) => void }) {
  if (!open) return null
  
  return (
    <>
      <div className="absolute inset-0 z-40" onClick={onClose} />
      <div className="absolute right-4 top-[420px] bg-white rounded-xl shadow-lg z-50 overflow-hidden">
        <button
          type="button"
          onClick={() => { onSelect("deposit"); onClose(); }}
          className="w-full px-6 py-3 text-black hover:bg-gray-100 text-left"
        >
          入款記錄
        </button>
        <button
          type="button"
          onClick={() => { onSelect("withdraw"); onClose(); }}
          className="w-full px-6 py-3 text-black hover:bg-gray-100 text-left border-t"
        >
          取款記錄
        </button>
      </div>
    </>
  )
}

// Main wallet view
function WalletMain({ onNavigate }: { onNavigate: (view: WalletView) => void }) {
  const [showRecordsDropdown, setShowRecordsDropdown] = useState(false)
  const [isPieGray, setIsPieGray] = useState(false)
  
  return (
    <div className="min-h-full bg-background relative">
      <FloatingParticles />
      
      {/* Header */}
      <div className="text-center pt-4 pb-2 relative z-10">
        <h1 className="text-xl font-bold text-foreground">錢包</h1>
        <p className="text-sm text-muted-foreground mt-1">SAXO資產管理專家，財富由您而定</p>
      </div>
      
      {/* Balance Card */}
      <div className="mx-4 mt-4 p-4 rounded-xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-border/50 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-muted-foreground text-sm">總資產 (USDT)</span>
          <Eye className="w-5 h-5 text-[#3b82f6]" />
        </div>
        
        {/* Animated line chart - draws from left to right */}
        <div className="mb-3 relative">
          <AnimatedLineChart />
        </div>
        
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-bold text-foreground">4,552,025.50</span>
            <span className="text-muted-foreground text-sm ml-1">USDT</span>
          </div>
          <span className="text-[#ef4444] text-sm">↓ 0.00%</span>
        </div>
        
        <div className="flex justify-between mt-3 text-sm">
          <div>
            <span className="text-muted-foreground">今日收益</span>
            <div className="text-[#22c55e] font-semibold">11,700.00 <span className="text-muted-foreground font-normal">USDT</span></div>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">鎖定中</span>
            <div className="text-foreground font-semibold">0.00 <span className="text-muted-foreground font-normal">USDT</span></div>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-3 mx-4 mt-4 relative z-10">
        <Button 
          onClick={() => onNavigate("deposit")}
          className="flex-1 h-11 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white font-medium"
        >
          <ArrowDown className="w-4 h-4 mr-2" />
          入款
        </Button>
        <Button 
          onClick={() => onNavigate("withdraw")}
          variant="outline"
          className="flex-1 h-11 rounded-xl border-[#ef4444]/50 text-[#ef4444] hover:bg-[#ef4444]/10 bg-transparent"
        >
          <ArrowUp className="w-4 h-4 mr-2" />
          取款
        </Button>
        <Button 
          onClick={() => setShowRecordsDropdown(true)}
          variant="outline"
          className="flex-1 h-11 rounded-xl border-[#3b82f6]/50 text-[#3b82f6] hover:bg-[#3b82f6]/10 bg-transparent"
        >
          <ArrowLeftRight className="w-4 h-4 mr-2" />
          明細
        </Button>
      </div>
      
      {/* My Assets */}
      <div className="mx-4 mt-6 p-4 rounded-xl bg-card border border-border/50 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground font-semibold">我的資產</h2>
          <button type="button" className="flex items-center gap-1 text-muted-foreground text-sm">
            <Eye className="w-4 h-4" />
            隱藏低餘額貨幣
          </button>
        </div>
        
        {/* Animated Pie Chart */}
        <div className="flex justify-center mb-6">
          <AnimatedPieChart isGray={isPieGray} onToggle={() => setIsPieGray(!isPieGray)} />
        </div>
        
        {/* Asset List */}
        <div className="space-y-3">
          {assets.map((asset) => (
            <div key={asset.symbol} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${asset.icon} flex items-center justify-center`}>
                  <span className="text-white text-sm font-bold">{asset.textIcon}</span>
                </div>
                <div>
                  <div className="text-foreground font-medium">{asset.symbol}</div>
                  <div className="text-muted-foreground text-xs">{asset.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-foreground font-medium">{asset.balance}</div>
                <div className="text-muted-foreground text-xs">≈ {asset.usd}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Recent Transactions */}
      <div className="mx-4 mt-4 mb-6 p-4 rounded-xl bg-card border border-border/50 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground font-semibold">最近交易</h2>
          <button type="button" className="flex items-center gap-1 text-muted-foreground text-sm">
            更多 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-4">
          {transactions.map((tx, i) => (
            <div key={i} className="pb-3 border-b border-border/50 last:border-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#26a17b] flex items-center justify-center">
                    <span className="text-white text-sm font-bold">T</span>
                  </div>
                  <div>
                    <div className={`font-semibold ${tx.type === "credit" ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                      {tx.amount}
                    </div>
                    <div className="text-muted-foreground text-xs">{tx.date}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground text-xs">USDT</div>
                  <div className="text-foreground text-sm">{tx.balance}</div>
                </div>
              </div>
              <div className="text-muted-foreground text-xs mt-2">{tx.label}: {tx.orderId}</div>
            </div>
          ))}
        </div>
      </div>
      
      <RecordsDropdown 
        open={showRecordsDropdown} 
        onClose={() => setShowRecordsDropdown(false)}
        onSelect={(type) => onNavigate("records")}
      />
    </div>
  )
}

// Deposit view
function DepositView({ onBack }: { onBack: () => void }) {
  const [showNetworkSelector, setShowNetworkSelector] = useState(false)
  const walletAddress = "TEwBvznTknHeS1QePBAwXdnvu5MgirSBXp"
  
  return (
    <div className="min-h-full bg-background relative">
      <FloatingParticles />
      
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-2 pb-3 relative z-10">
        <button type="button" onClick={onBack}>
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">入款</h1>
        <button type="button">
          <History className="w-5 h-5 text-foreground" />
        </button>
      </header>
      
      {/* USDT Tab */}
      <div className="px-4 relative z-10">
        <div className="inline-flex flex-col items-center p-3 rounded-xl border border-[#22c55e]/50 bg-[#22c55e]/10">
          <div className="w-10 h-10 rounded-lg bg-[#26a17b] flex items-center justify-center mb-1">
            <span className="text-white font-bold">T</span>
          </div>
          <span className="text-foreground text-sm">USDT</span>
        </div>
      </div>
      
      {/* QR Code Card */}
      <div className="mx-4 mt-4 p-4 rounded-xl bg-card border border-border/50 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground font-semibold">USDT 入款地址</h2>
          <button 
            type="button"
            onClick={() => setShowNetworkSelector(true)}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#f97316]/20 text-[#f97316] text-sm"
          >
            Tron <ArrowLeftRight className="w-3 h-3" />
          </button>
        </div>
        
        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <div className="w-48 h-48 bg-white p-2 rounded-lg">
            <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0id2hpdGUiLz48cmVjdCB4PSIyMCIgeT0iMjAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0iYmxhY2siLz48cmVjdCB4PSIxMjAiIHk9IjIwIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIGZpbGw9ImJsYWNrIi8+PHJlY3QgeD0iMjAiIHk9IjEyMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJibGFjayIvPjxyZWN0IHg9IjMwIiB5PSIzMCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSJ3aGl0ZSIvPjxyZWN0IHg9IjEzMCIgeT0iMzAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0id2hpdGUiLz48cmVjdCB4PSIzMCIgeT0iMTMwIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IndoaXRlIi8+PHJlY3QgeD0iNDAiIHk9IjQwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9ImJsYWNrIi8+PHJlY3QgeD0iMTQwIiB5PSI0MCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSJibGFjayIvPjxyZWN0IHg9IjQwIiB5PSIxNDAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iYmxhY2siLz48cmVjdCB4PSI5MCIgeT0iMjAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iYmxhY2siLz48cmVjdCB4PSI5MCIgeT0iNTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iYmxhY2siLz48cmVjdCB4PSI5MCIgeT0iOTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iYmxhY2siLz48cmVjdCB4PSIxMjAiIHk9IjkwIiB3aWR0aD0iNjAiIGhlaWdodD0iMjAiIGZpbGw9ImJsYWNrIi8+PHJlY3QgeD0iMjAiIHk9IjkwIiB3aWR0aD0iNjAiIGhlaWdodD0iMjAiIGZpbGw9ImJsYWNrIi8+PHJlY3QgeD0iMTIwIiB5PSIxMjAiIHdpZHRoPSIyMCIgaGVpZ2h0PSI2MCIgZmlsbD0iYmxhY2siLz48cmVjdCB4PSIxNTAiIHk9IjEyMCIgd2lkdGg9IjMwIiBoZWlnaHQ9IjIwIiBmaWxsPSJibGFjayIvPjxyZWN0IHg9IjE1MCIgeT0iMTUwIiB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIGZpbGw9ImJsYWNrIi8+PC9zdmc+')] bg-contain" />
          </div>
        </div>
        
        {/* Address */}
        <div className="text-center mb-4">
          <p className="text-foreground text-sm break-all">{walletAddress}</p>
        </div>
        
        <div className="flex justify-center mb-4">
          <Button variant="outline" className="rounded-full border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e]/10 bg-transparent">
            <Copy className="w-4 h-4 mr-2" />
            複製地址
          </Button>
        </div>
        
        <p className="text-center text-muted-foreground text-sm mb-2">
          請使用數字貨幣錢包掃描二維碼或複製地址進行轉賬。
        </p>
        <p className="text-center text-[#ef4444] text-sm">
          注意：請確認入款的貨幣與地址匹配，否則可能導致您的資產丟失。
        </p>
      </div>
      
      {/* Deposit Info */}
      <div className="mx-4 mt-4 p-4 rounded-xl bg-card border border-border/50 relative z-10">
        <h3 className="text-foreground font-semibold mb-4">入款信息</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-muted-foreground text-sm">貨幣</span>
            <div className="text-foreground font-medium">Tether USD (USDT)</div>
          </div>
          <div>
            <span className="text-muted-foreground text-sm">網絡</span>
            <div className="text-foreground font-medium">Tron</div>
          </div>
          <div>
            <span className="text-muted-foreground text-sm">最低入款額</span>
            <div className="text-foreground font-medium">1.00000000 USDT</div>
          </div>
          <div>
            <span className="text-muted-foreground text-sm">狀態</span>
            <div className="text-[#22c55e] font-medium">正常</div>
          </div>
        </div>
        
        <h3 className="text-foreground font-semibold mb-3">轉賬信息</h3>
        <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-background mb-4">
          <span className="text-[#3b82f6] font-medium">金額</span>
          <input 
            type="text" 
            placeholder="輸入入款金額" 
            className="flex-1 bg-transparent text-foreground outline-none"
          />
        </div>
        
        <div className="border border-dashed border-border rounded-xl p-6 text-center mb-4">
          <div className="text-muted-foreground text-sm mb-1">轉賬截圖</div>
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <div className="text-muted-foreground text-sm">點擊上傳</div>
          <div className="text-muted-foreground text-xs">支持JPG、PNG、WEBP格式</div>
        </div>
      </div>
      
      <div className="mx-4 mt-4 mb-6 relative z-10">
        <Button className="w-full h-12 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white font-medium">
          <ArrowDown className="w-4 h-4 mr-2" />
          提交入款申請
        </Button>
      </div>
      
      <NetworkSelector 
        open={showNetworkSelector}
        onClose={() => setShowNetworkSelector(false)}
        onSelect={() => {}}
      />
    </div>
  )
}

// Withdraw view
function WithdrawView({ onBack }: { onBack: () => void }) {
  const balance = 4552025.50
  
  return (
    <div className="min-h-full bg-background relative">
      <FloatingParticles />
      
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-2 pb-3 relative z-10">
        <button type="button" onClick={onBack}>
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">取款</h1>
        <button type="button">
          <History className="w-5 h-5 text-foreground" />
        </button>
      </header>
      
      {/* USDT Tab */}
      <div className="px-4 relative z-10">
        <div className="inline-flex flex-col items-center p-3 rounded-xl border border-[#22c55e]/50 bg-[#22c55e]/10">
          <div className="w-10 h-10 rounded-lg bg-[#26a17b] flex items-center justify-center mb-1">
            <span className="text-white font-bold">T</span>
          </div>
          <span className="text-foreground text-sm">USDT</span>
        </div>
      </div>
      
      {/* Form Card */}
      <div className="mx-4 mt-4 p-4 rounded-xl bg-card border border-border/50 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-foreground font-semibold">USDT</h2>
          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#f97316]/20 text-[#f97316] text-sm">
            Tron <ArrowLeftRight className="w-3 h-3" />
          </span>
        </div>
        
        {/* Wallet Address */}
        <div className="mb-4">
          <label className="text-foreground font-medium mb-2 block">錢包地址</label>
          <input 
            type="text"
            placeholder="請輸入錢包地址"
            className="w-full p-3 rounded-xl border border-border bg-background text-foreground outline-none"
          />
        </div>
        
        {/* Amount */}
        <div className="mb-4">
          <label className="text-foreground font-medium mb-2 block">金額</label>
          <div className="flex items-center p-3 rounded-xl border border-border bg-background">
            <input 
              type="text"
              placeholder="輸入取款金額"
              className="flex-1 bg-transparent text-foreground outline-none"
            />
            <span className="text-muted-foreground">USDT</span>
          </div>
        </div>
        
        {/* Security Password */}
        <div className="mb-6">
          <label className="text-foreground font-medium mb-2 block">安全密碼</label>
          <div className="flex items-center p-3 rounded-xl border border-border bg-background">
            <input 
              type="password"
              placeholder="輸入安全密碼"
              className="flex-1 bg-transparent text-foreground outline-none"
            />
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
        
        {/* Info */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">可取款餘額:</span>
            <span className="text-foreground">{balance.toLocaleString()} USDT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">取款手續費:</span>
            <span className="text-foreground">0.00 USDT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">預計到賬金額:</span>
            <span className="text-foreground">0.00 USDT</span>
          </div>
        </div>
      </div>
      
      <div className="mx-4 mt-4 relative z-10">
        <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#a855f7] hover:opacity-90 text-white font-medium">
          <ArrowUp className="w-4 h-4 mr-2" />
          提交
        </Button>
      </div>
      
      {/* Notes */}
      <div className="mx-4 mt-6 mb-6 relative z-10">
        <p className="text-[#ef4444] text-sm mb-1">1. 我們將在1個工作日內處理您的取款請求。</p>
        <p className="text-[#ef4444] text-sm mb-1">2. 取款將收取一定的手續費。</p>
        <p className="text-[#ef4444] text-sm">3. 請確認取款網絡正確，網絡錯誤可能導致您的資金丟失。</p>
      </div>
    </div>
  )
}

// Records view
function RecordsView({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-full bg-background relative">
      <FloatingParticles />
      
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-2 pb-3 relative z-10">
        <button type="button" onClick={onBack}>
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">入款記錄</h1>
        <button type="button">
          <History className="w-5 h-5 text-foreground" />
        </button>
      </header>
      
      {/* Records */}
      <div className="mx-4 mt-4 relative z-10">
        {depositRecords.map((record, i) => (
          <div key={i} className="p-4 rounded-xl bg-card border border-border/50 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#26a17b] flex items-center justify-center">
                  <span className="text-white text-sm font-bold">T</span>
                </div>
                <span className="text-foreground font-medium">{record.symbol}</span>
              </div>
              <span className="text-[#ef4444] font-semibold">{record.amount}</span>
              <div className="w-6 h-6 rounded-full bg-[#f97316] flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">提交金額</span>
                <span className="text-foreground">{record.submitAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">到賬金額</span>
                <span className="text-foreground">{record.receivedAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">方式</span>
                <span className="text-foreground">{record.method}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{record.submitTime}</span>
                <span>{record.processTime} {record.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Main export
export function WalletPage() {
  const [currentView, setCurrentView] = useState<WalletView>("main")
  
  switch (currentView) {
    case "deposit":
      return <DepositView onBack={() => setCurrentView("main")} />
    case "withdraw":
      return <WithdrawView onBack={() => setCurrentView("main")} />
    case "records":
      return <RecordsView onBack={() => setCurrentView("main")} />
    default:
      return <WalletMain onNavigate={setCurrentView} />
  }
}
