

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import type { OrderData } from "./trade-order"
import { ToastNotification } from "./toast-notification"

interface TradePendingProps {
  order: OrderData
  onContinue: () => void
  onMinimize: () => void
  onComplete: (result: TradeResult) => void
}

export interface TradeResult {
  order: OrderData
  orderId: string
  createTime: string
  closePrice: number
  actualReturnRate: number
  actualProfit: number
  isProfit: boolean
}

export function TradePending({ order, onContinue, onMinimize, onComplete }: TradePendingProps) {
  const [remainingTime, setRemainingTime] = useState(order.duration)
  const [showSuccessToast, setShowSuccessToast] = useState(true)
  const balance = 4538525.50
  const orderId = "20260123002421673" + Math.floor(Math.random() * 10)
  const createTime = "2026/01/22 23:24:21"
  
  const hideToast = useCallback(() => {
    setShowSuccessToast(false)
  }, [])

  useEffect(() => {
    if (remainingTime <= 0) {
      // Simulate trade result
      const isProfit = Math.random() > 0.3 // 70% chance of profit for demo
      const actualProfit = isProfit ? (order.amount * order.returnRate) / 100 : -order.amount * 0.5
      
      onComplete({
        order,
        orderId,
        createTime,
        closePrice: order.price + (isProfit ? 0.001 : -0.001),
        actualReturnRate: isProfit ? order.returnRate : -50,
        actualProfit,
        isProfit,
      })
      return
    }

    const timer = setInterval(() => {
      setRemainingTime((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [remainingTime, order, onComplete])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const progress = ((order.duration - remainingTime) / order.duration) * 100
  const circumference = 2 * Math.PI * 70

  return (
    <div className="min-h-full bg-background flex flex-col relative">
      {/* Success Toast */}
      <ToastNotification 
        message="訂單創建成功"
        type="success"
        visible={showSuccessToast}
        onHide={hideToast}
      />
      
      {/* Top gradient bar */}
      <div className="h-1.5 bg-gradient-to-r from-[#ec4899] via-[#8b5cf6] to-[#3b82f6]" />
      
      <div className="flex-1 px-4 py-6">
        {/* Header Tags */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="px-4 py-2 rounded-full bg-card border border-border text-foreground text-sm">
            買漲 · {order.product}
          </span>
          <span className="px-4 py-2 rounded-full bg-card border border-border text-foreground text-sm">
            開倉價 · {order.price}
          </span>
        </div>

        {/* Countdown Circle */}
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
              {/* Progress circle */}
              <circle
                cx="88"
                cy="88"
                r="70"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (progress / 100) * circumference}
                className="transition-all duration-1000 ease-linear"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="50%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-foreground">{formatTime(remainingTime)}</span>
              <span className="text-muted-foreground text-sm mt-1">剩餘時間</span>
            </div>
          </div>
        </div>

        {/* Order Details Card */}
        <div className="bg-card rounded-2xl p-5 border border-border mb-6">
          <div className="space-y-4">
            <div>
              <span className="text-muted-foreground text-sm">訂單編號</span>
              <p className="text-foreground font-medium mt-1">{orderId}</p>
            </div>
            
            <div>
              <span className="text-muted-foreground text-sm">創建時間</span>
              <p className="text-foreground font-medium mt-1">{createTime}</p>
            </div>
            
            <div>
              <span className="text-muted-foreground text-sm">平倉價</span>
              <p className="text-foreground font-medium mt-1">-</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground text-sm">期限</span>
                <p className="text-foreground font-medium mt-1">{order.duration} 秒</p>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">預期收益率</span>
                <p className="text-foreground font-medium mt-1">-</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground text-sm">訂單金額</span>
                <p className="text-foreground font-medium mt-1">{order.amount.toLocaleString()}.00</p>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">預期收益</span>
                <p className="text-foreground font-medium mt-1">-</p>
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
