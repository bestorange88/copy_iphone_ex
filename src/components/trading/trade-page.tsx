

import type React from "react"
import { useState } from "react"
import { Star, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProductDropdown } from "./product-dropdown"
import { useTranslation } from "react-i18next"

// Mock candlestick data
const generateCandleData = () => {
  const data = []
  let price = 4820
  for (let i = 0; i < 30; i++) {
    const open = price + (Math.random() - 0.5) * 10
    const close = open + (Math.random() - 0.5) * 15
    const high = Math.max(open, close) + Math.random() * 8
    const low = Math.min(open, close) - Math.random() * 8
    data.push({ open, close, high, low })
    price = close
  }
  return data
}

const candleData = generateCandleData()

// Mock MACD data
const macdData = Array.from({ length: 30 }, () => (Math.random() - 0.5) * 4)

interface TradePageProps {
  onBuySell?: () => void
  minimizedWidget?: React.ReactNode
}

export function TradePage({ onBuySell, minimizedWidget }: TradePageProps) {
  const { t } = useTranslation()
  const [timeframe, setTimeframe] = useState("24h")
  const [selectedProduct, setSelectedProduct] = useState("London Silver")
  
  return (
    <div className="min-h-full bg-background flex flex-col relative">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-2 pb-3">
        <button type="button" className="text-sm text-muted-foreground">
          {t('saxo.trade_history')}
        </button>
        <ProductDropdown 
          selected={selectedProduct}
          onSelect={(product) => setSelectedProduct(product.name)}
        />
        <button type="button" className="text-[#f59e0b]">
          <Star className="w-5 h-5 fill-current" />
        </button>
      </header>

      {/* Asset Info Row */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fbbf24] to-[#d97706] flex items-center justify-center">
            <div className="w-5 h-4 bg-[#fbbf24] border-2 border-white rounded-sm" />
          </div>
          <div>
            <div className="font-semibold text-[#22c55e]">London Silver</div>
            <div className="text-xs text-muted-foreground">XAG</div>
          </div>
        </div>
        <div className="flex gap-1">
          {[{ key: "minute", labelKey: "saxo.minute" }, { key: "24h", labelKey: "saxo.hours_24" }, { key: "more", labelKey: "saxo.more" }].map((tf) => (
            <Button
              key={tf.key}
              variant={timeframe === tf.key ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeframe(tf.key)}
              className={`rounded-full px-3 h-8 text-xs ${
                timeframe === tf.key 
                  ? "bg-[#3b82f6] hover:bg-[#2563eb] text-white" 
                  : "bg-transparent border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(tf.labelKey)}
            </Button>
          ))}
        </div>
      </div>

      {/* Price Card */}
      <div className="mx-4 mt-2 p-4 rounded-xl bg-gradient-to-br from-[#4c1d95] via-[#5b21b6] to-[#1e3a8a]">
        <div className="flex justify-between">
          <div>
            <div className="text-xs text-white/70 mb-1">{t('saxo.latest_price')}</div>
            <div className="text-3xl font-bold text-white">95.56</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-white/70">{t('saxo.change_24h')}</span>
              <span className="text-sm text-[#ef4444] font-medium">-0.042%</span>
            </div>
          </div>
          <div className="text-right space-y-2">
            <div>
              <div className="text-xs text-white/70">{t('saxo.high_24h')}</div>
              <div className="text-sm text-white font-medium">95.76</div>
            </div>
            <div>
              <div className="text-xs text-white/70">{t('saxo.volume_24h')}</div>
              <div className="text-sm text-white font-medium">-</div>
            </div>
          </div>
          <div className="text-right space-y-2">
            <div>
              <div className="text-xs text-white/70">{t('saxo.low_24h')}</div>
              <div className="text-sm text-white font-medium">95.29</div>
            </div>
            <div>
              <div className="text-xs text-white/70">{t('saxo.amount_24h')}</div>
              <div className="text-sm text-white font-medium">-</div>
            </div>
          </div>
        </div>
      </div>

      {/* MA Indicators */}
      <div className="px-4 py-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="text-muted-foreground">MA(5,7,30)</span>
        <span className="text-[#f59e0b]">MA5: 4,828.45</span>
        <span className="text-[#3b82f6]">MA7: 4,826.66</span>
        <span className="text-[#a855f7]">MA30: 4,825.65</span>
      </div>

      {/* Candlestick Chart - positioned in lower half */}
      <div className="flex-1 px-2 relative min-h-[280px]">
        <div className="h-[220px] relative">
          {/* Price labels on right */}
          <div className="absolute right-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-muted-foreground text-right pr-1 py-2">
            <span>4,845.00</span>
            <span>4,840.00</span>
            <span className="text-[#22c55e] bg-[#22c55e]/20 px-1 rounded">4,836.21</span>
            <span>4,830.00</span>
            <span>4,825.00</span>
            <span>4,820.00</span>
          </div>
          
          {/* Chart area */}
          <div className="absolute left-0 right-16 top-0 bottom-0 flex items-end gap-[2px] px-2">
            {candleData.map((candle, i) => {
              const isGreen = candle.close > candle.open
              const range = 30
              const bodyHeight = Math.abs(candle.close - candle.open) / range * 100
              const wickTop = (candle.high - Math.max(candle.open, candle.close)) / range * 100
              const wickBottom = (Math.min(candle.open, candle.close) - candle.low) / range * 100
              const bottom = ((Math.min(candle.open, candle.close) - 4810) / range) * 100
              
              return (
                <div 
                  key={i} 
                  className="flex-1 flex flex-col items-center relative"
                  style={{ height: '100%' }}
                >
                  {/* Wick */}
                  <div 
                    className={`w-[1px] ${isGreen ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}
                    style={{
                      position: 'absolute',
                      bottom: `${bottom + bodyHeight}%`,
                      height: `${wickTop}%`
                    }}
                  />
                  {/* Body */}
                  <div 
                    className={`w-full max-w-[8px] ${isGreen ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}
                    style={{
                      position: 'absolute',
                      bottom: `${bottom}%`,
                      height: `${Math.max(bodyHeight, 2)}%`,
                      minHeight: '2px'
                    }}
                  />
                  {/* Lower wick */}
                  <div 
                    className={`w-[1px] ${isGreen ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}
                    style={{
                      position: 'absolute',
                      bottom: `${bottom - wickBottom}%`,
                      height: `${wickBottom}%`
                    }}
                  />
                </div>
              )
            })}
          </div>
          
          {/* Current price line */}
          <div className="absolute left-0 right-16 top-[40%] border-t border-dashed border-[#22c55e]/50" />
        </div>

        {/* MACD Section */}
        <div className="mt-4 border-t border-border/30 pt-2">
          <div className="flex gap-4 text-xs px-2 mb-2">
            <span className="text-muted-foreground">MACD(5,7,30)</span>
            <span className="text-[#3b82f6]">DIF: 1.4864</span>
            <span className="text-[#f59e0b]">DEA: 0.0012</span>
          </div>
          <div className="flex gap-4 text-xs px-2 mb-2">
            <span className="text-[#a855f7]">MACD: 2.9705</span>
          </div>
          
          {/* MACD bars */}
          <div className="h-[60px] flex items-center gap-[2px] px-2">
            {macdData.map((value, i) => (
              <div 
                key={i}
                className={`flex-1 ${value > 0 ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}
                style={{
                  height: `${Math.abs(value) * 12}px`,
                  marginTop: value > 0 ? 'auto' : undefined,
                  marginBottom: value < 0 ? 'auto' : undefined,
                }}
              />
            ))}
          </div>
          
          {/* Watermark */}
          <div className="text-xs text-muted-foreground/50 px-2 mt-1">
            <span className="font-medium">TDMOCK</span>
          </div>
        </div>
      </div>

      {/* Floating Buttons Area - positioned alongside K-line chart */}
      <div className="absolute bottom-32 right-4 flex flex-col items-center gap-3 z-30">
        {/* Minimized Widget */}
        {minimizedWidget}
        
        {/* Buy Up Button (Red/Orange) */}
        <Button 
          onClick={onBuySell}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f97316] to-[#ef4444] hover:from-[#ea580c] hover:to-[#dc2626] text-white flex flex-col items-center justify-center shadow-lg shadow-[#ef4444]/30"
        >
          <ArrowUp className="w-5 h-5" />
          <span className="text-xs font-medium">{t('saxo.trade_buy')}</span>
        </Button>
        {/* Buy Down Button (Red) */}
        <Button 
          onClick={onBuySell}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ef4444] to-[#dc2626] hover:from-[#dc2626] hover:to-[#b91c1c] text-white flex flex-col items-center justify-center shadow-lg shadow-[#ef4444]/30"
        >
          <ArrowDown className="w-5 h-5" />
          <span className="text-xs font-medium">{t('saxo.trade_sell')}</span>
        </Button>
      </div>
    </div>
  )
}
