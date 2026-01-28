

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import type { TradeResult } from "./trade-pending"

interface TradeResultProps {
  result: TradeResult
  onContinue: () => void
  onMinimize: () => void
}

export function TradeResultPage({ result, onContinue, onMinimize }: TradeResultProps) {
  const balance = 4540725.50
  const circumference = 2 * Math.PI * 70
  
  // Animated profit display
  const [displayedProfit, setDisplayedProfit] = useState(0)
  const [displayedRate, setDisplayedRate] = useState(0)
  
  useEffect(() => {
    const targetProfit = result.actualProfit
    const targetRate = result.actualReturnRate
    const duration = 1500 // 1.5 seconds animation
    const steps = 60
    const stepTime = duration / steps
    
    let currentStep = 0
    const timer = setInterval(() => {
      currentStep++
      const progress = currentStep / steps
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3)
      
      setDisplayedProfit(targetProfit * easeOut)
      setDisplayedRate(targetRate * easeOut)
      
      if (currentStep >= steps) {
        clearInterval(timer)
        setDisplayedProfit(targetProfit)
        setDisplayedRate(targetRate)
      }
    }, stepTime)
    
    return () => clearInterval(timer)
  }, [result.actualProfit, result.actualReturnRate])

  return (
    <div className="min-h-full bg-background flex flex-col">
      {/* Top gradient bar */}
      <div className="h-1.5 bg-gradient-to-r from-[#8b5cf6] via-[#06b6d4] to-[#22c55e]" />
      
      <div className="flex-1 px-4 py-6">
        {/* Header Tags */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="px-4 py-2 rounded-full bg-card border border-border text-foreground text-sm">
            買漲 · {result.order.product}
          </span>
          <span className="px-4 py-2 rounded-full bg-card border border-border text-foreground text-sm">
            開倉價 · {result.order.price}
          </span>
        </div>

        {/* Result Circle */}
        <div className="flex justify-center mb-8">
          <div className="relative w-44 h-44">
            {/* Background circle */}
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="88"
                cy="88"
                r="70"
                fill="none"
                stroke="#1e293b"
                strokeWidth="8"
              />
              {/* Full progress circle */}
              <circle
                cx="88"
                cy="88"
                r="70"
                fill="none"
                stroke={result.isProfit ? "url(#profitGradient)" : "url(#lossGradient)"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={0}
              />
              <defs>
                <linearGradient id="profitGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="50%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <linearGradient id="lossGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-sm ${result.isProfit ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                {result.isProfit ? "+" : ""}{displayedRate.toFixed(2)}%
              </span>
              <span className={`text-3xl font-bold ${result.isProfit ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                {result.isProfit ? "+" : ""}{displayedProfit.toFixed(2)}
              </span>
              <span className={`text-sm mt-1 ${result.isProfit ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                {result.isProfit ? "盈利" : "虧損"}
              </span>
            </div>
          </div>
        </div>

        {/* Order Details Card */}
        <div className="bg-card rounded-2xl p-5 border border-border mb-6">
          <div className="space-y-4">
            <div>
              <span className="text-muted-foreground text-sm">訂單編號</span>
              <p className="text-foreground font-medium mt-1">{result.orderId}</p>
            </div>
            
            <div>
              <span className="text-muted-foreground text-sm">創建時間</span>
              <p className="text-foreground font-medium mt-1">{result.createTime}</p>
            </div>
            
            <div>
              <span className="text-muted-foreground text-sm">平倉價</span>
              <p className={`font-medium mt-1 ${result.isProfit ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                {result.closePrice.toFixed(3)}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground text-sm">期限</span>
                <p className="text-foreground font-medium mt-1">{result.order.duration} 秒</p>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">實際收益率</span>
                <p className={`font-medium mt-1 ${result.isProfit ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                  {result.actualReturnRate.toFixed(2)}%
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground text-sm">訂單金額</span>
                <p className="text-foreground font-medium mt-1">{result.order.amount.toLocaleString()}.00</p>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">實際收益</span>
                <p className={`font-medium mt-1 ${result.isProfit ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                  {result.actualProfit.toFixed(2)} USDT
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={onContinue}
            className="flex-1 h-12 rounded-full bg-gradient-to-r from-[#f97316] to-[#fb923c] hover:from-[#ea580c] hover:to-[#f97316] text-white font-semibold"
          >
            <span className="mr-2">📋</span>
            繼續交易
          </Button>
          
          <Button 
            variant="outline"
            onClick={onMinimize}
            className="flex-1 h-12 rounded-full border-border text-foreground font-semibold bg-transparent"
          >
            <span className="mr-2">📊</span>
            最小化
          </Button>
        </div>

        {/* Balance */}
        <div className="text-center text-muted-foreground text-sm mt-4">
          可用餘額：{balance.toLocaleString()} USDT
        </div>
      </div>
    </div>
  )
}
