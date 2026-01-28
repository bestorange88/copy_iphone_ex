

import { useState, useCallback } from "react"
import { ArrowLeftRight, TrendingUp, Clock, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ToastNotification } from "./toast-notification"

interface TradeOrderSheetProps {
  open: boolean
  onClose: () => void
  onConfirm: (order: OrderData) => void
}

export interface OrderData {
  type: "buy" | "sell"
  product: string
  productCode: string
  price: number
  duration: number
  returnRate: number
  amount: number
}

const durations = [
  { seconds: 360, rate: 90 },
  { seconds: 180, rate: 80 },
  { seconds: 120, rate: 70 },
  { seconds: 90, rate: 60 },
  { seconds: 60, rate: 50 },
  { seconds: 30, rate: 40 },
]

const amounts = [500, 1000, 2000, 5000, 10000]

export function TradeOrderSheet({ open, onClose, onConfirm }: TradeOrderSheetProps) {
  const [selectedDuration, setSelectedDuration] = useState(durations[5])
  const [selectedAmount, setSelectedAmount] = useState(1000)
  const [customAmount, setCustomAmount] = useState("")
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; visible: boolean }>({
    message: "",
    type: "info",
    visible: false
  })
  
  const currentPrice = 95.56
  const balance = 4543525.50

  const showToast = useCallback((message: string, type: "success" | "error" | "info") => {
    setToast({ message, type, visible: true })
  }, [])

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }))
  }, [])

  const handleConfirm = () => {
    const amount = customAmount ? Number(customAmount) : selectedAmount
    
    // Validation
    if (!amount || amount < 20 || amount > 50000) {
      showToast("請輸入訂單金額", "error")
      return
    }
    
    showToast("訂單創建成功", "success")
    
    setTimeout(() => {
      onConfirm({
        type: "buy",
        product: "London Silver",
        productCode: "XAG",
        price: currentPrice,
        duration: selectedDuration.seconds,
        returnRate: selectedDuration.rate,
        amount: amount,
      })
    }, 500)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Toast Notification */}
      <ToastNotification 
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
      
      {/* Sheet - fixed height, no scroll */}
      <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl z-50">
        {/* Top gradient bar */}
        <div className="h-1.5 bg-gradient-to-r from-[#ec4899] via-[#8b5cf6] to-[#3b82f6] rounded-t-3xl" />
        
        {/* Handle bar */}
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
        
        <div className="px-4 pb-8">
          {/* Header - Product Info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-full border border-[#f97316]/50 text-[#f97316] text-sm">
                買漲 · London Silver(XAG)
              </span>
              <ArrowLeftRight className="w-4 h-4 text-[#f97316]" />
            </div>
            <span className="text-[#3b82f6] font-semibold">{currentPrice}</span>
          </div>

          {/* Duration Selection */}
          <div className="mb-4">
            <h3 className="text-muted-foreground text-sm mb-3">期限</h3>
            <div className="grid grid-cols-3 gap-2">
              {durations.map((d) => (
                <button
                  key={d.seconds}
                  type="button"
                  onClick={() => setSelectedDuration(d)}
                  className={`relative p-2.5 rounded-xl border transition-all ${
                    selectedDuration.seconds === d.seconds
                      ? "border-[#f97316] bg-[#f97316]/10"
                      : "border-border bg-card"
                  }`}
                >
                  {/* Checkmark */}
                  {selectedDuration.seconds === d.seconds && (
                    <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#3b82f6] rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-foreground font-semibold text-sm">{d.seconds} 秒</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mb-0.5">
                    <TrendingUp className="w-2.5 h-2.5 inline mr-0.5" />
                    到期收益率
                  </div>
                  <div className="text-[#f97316] font-bold text-sm">{d.rate.toFixed(2)}%</div>
                </button>
              ))}
            </div>
          </div>

          {/* Investment Amount */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-muted-foreground text-sm">投資金額</h3>
              <span className="text-muted-foreground text-xs">20.00~50,000.00 USDT</span>
            </div>
            
            {/* Amount Input */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card mb-2">
              <span className="text-foreground font-medium text-sm">投資金額 (USDT)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder={selectedAmount.toString()}
                  className="bg-transparent text-right text-foreground w-20 outline-none text-sm"
                />
                <button type="button" className="text-[#3b82f6] text-sm font-medium">
                  全部
                </button>
              </div>
            </div>

            {/* Quick Amount Selection */}
            <div className="flex justify-between">
              {amounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(amount)
                    setCustomAmount("")
                  }}
                  className={`px-2 py-1.5 rounded-lg whitespace-nowrap transition-all text-sm ${
                    selectedAmount === amount && !customAmount
                      ? "bg-[#f97316]/20 text-[#f97316]"
                      : "text-muted-foreground"
                  }`}
                >
                  {amount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleConfirm}
              className="w-full h-12 rounded-full bg-gradient-to-r from-[#ec4899] via-[#8b5cf6] to-[#3b82f6] hover:opacity-90 text-white font-semibold text-base"
            >
              <span className="mr-2">&#x1F4CB;</span>
              立即交易
            </Button>
            
            <Button 
              variant="outline"
              onClick={onClose}
              className="w-full h-12 rounded-full border-border text-foreground font-semibold text-base bg-transparent"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              市場
            </Button>
          </div>

          {/* Balance */}
          <div className="text-center text-muted-foreground text-sm mt-4">
            可用餘額：{balance.toLocaleString()} USDT
          </div>
        </div>
      </div>
    </>
  )
}
