

import { useState, useEffect } from "react"
import { Home, ArrowUpDown, TrendingUp, Wallet, User } from "lucide-react"
import { useTranslation } from "react-i18next"
import { HomePage } from "./home-page"
import { TradePage } from "./trade-page"
import { TradeOrderSheet, type OrderData } from "./trade-order"
import { ConfirmDialog } from "./confirm-dialog"
import { TradePending, type TradeResult } from "./trade-pending"
import { TradeResultPage } from "./trade-result"
import { MinimizedWidget } from "./minimized-widget"
import { MarketPage } from "./market-page"
import { ProfilePage } from "./profile-page"
import { WalletPage } from "./wallet-page"
import { AuthPages } from "./auth-pages"
import { CustomerServicePage } from "./customer-service-page"

const navItems = [
  { icon: Home, labelKey: "saxo.nav_home", id: "home" },
  { icon: ArrowUpDown, labelKey: "saxo.nav_trade", id: "trade" },
  { icon: TrendingUp, labelKey: "saxo.nav_market", id: "market" },
  { icon: Wallet, labelKey: "saxo.nav_wallet", id: "wallet" },
  { icon: User, labelKey: "saxo.nav_profile", id: "profile" },
]

type TradeStep = "chart" | "order" | "pending" | "result"

function BottomNav({ activeTab, onTabChange, hidden }: { activeTab: string; onTabChange: (id: string) => void; hidden?: boolean }) {
  const { t } = useTranslation()
  if (hidden) return null
  
  return (
    <nav className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/50 z-40">
      <div className="flex items-center justify-around py-3 px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className="flex flex-col items-center gap-1.5 py-1 px-4 min-w-[60px] transition-all"
            >
              <item.icon
                className={`w-6 h-6 transition-colors ${isActive ? "text-[#3b82f6]" : "text-muted-foreground"}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-[11px] font-medium transition-colors ${isActive ? "text-[#3b82f6]" : "text-muted-foreground"}`}
              >
                {t(item.labelKey)}
              </span>
            </button>
          )
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="min-h-full bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-muted-foreground text-sm">Coming soon...</p>
      </div>
    </div>
  )
}

export function AppShell() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState("home")
  const [tradeStep, setTradeStep] = useState<TradeStep>("chart")
  const [currentOrder, setCurrentOrder] = useState<OrderData | null>(null)
  const [showOrderSheet, setShowOrderSheet] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [tradeResult, setTradeResult] = useState<TradeResult | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [minimizedRemainingTime, setMinimizedRemainingTime] = useState(0)
  const [showAuth, setShowAuth] = useState(false)
  const [authView, setAuthView] = useState<"login" | "register" | "forgot">("login")
  const [showCustomerService, setShowCustomerService] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true'
  })

  const handleLoginSuccess = () => {
    setIsLoggedIn(true)
    setShowAuth(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userEmail')
    setIsLoggedIn(false)
  }

  const handleBuySell = () => {
    if (!isLoggedIn) {
      setAuthView("login")
      setShowAuth(true)
      return
    }
    setShowOrderSheet(true)
  }

  const handleOrderConfirm = (order: OrderData) => {
    setCurrentOrder(order)
    setShowOrderSheet(false)
    setShowConfirm(true)
  }

  const handleConfirmOrder = () => {
    setShowConfirm(false)
    setTradeStep("pending")
  }

  const handleTradeComplete = (result: TradeResult) => {
    setTradeResult(result)
    setTradeStep("result")
  }

  const handleContinueTrade = () => {
    setShowOrderSheet(true)
    setTradeStep("chart")
    setTradeResult(null)
  }

  const handleMinimize = () => {
    if (currentOrder) {
      setIsMinimized(true)
      setMinimizedRemainingTime(currentOrder.duration)
    }
    setTradeStep("chart")
  }
  
  const handleWidgetClick = () => {
    setIsMinimized(false)
    if (tradeResult) {
      setTradeStep("result")
    } else {
      setTradeStep("pending")
    }
  }
  
  // Handle minimized countdown
  useEffect(() => {
    if (!isMinimized || minimizedRemainingTime <= 0) return
    
    const timer = setInterval(() => {
      setMinimizedRemainingTime((prev) => {
        if (prev <= 1) {
          // Timer complete - simulate result
          const isProfit = Math.random() > 0.3
          const actualProfit = currentOrder 
            ? (isProfit ? (currentOrder.amount * currentOrder.returnRate) / 100 : -currentOrder.amount * 0.5)
            : 0
          
          if (currentOrder) {
            setTradeResult({
              order: currentOrder,
              orderId: "20260123002421673" + Math.floor(Math.random() * 10),
              createTime: "2026/01/22 23:24:21",
              closePrice: currentOrder.price + (isProfit ? 0.001 : -0.001),
              actualReturnRate: isProfit ? currentOrder.returnRate : -50,
              actualProfit,
              isProfit,
            })
          }
          setIsMinimized(false)
          setTradeStep("result")
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [isMinimized, minimizedRemainingTime, currentOrder])

  const renderTradePage = () => {
    switch (tradeStep) {
      case "chart":
        return (
          <div className="relative h-full">
            <TradePage 
              onBuySell={handleBuySell} 
              minimizedWidget={isMinimized && currentOrder ? (
                <MinimizedWidget
                  productName="London"
                  totalSeconds={currentOrder.duration}
                  remainingSeconds={minimizedRemainingTime}
                  onClick={handleWidgetClick}
                />
              ) : undefined}
            />
            <TradeOrderSheet 
              open={showOrderSheet} 
              onClose={() => setShowOrderSheet(false)}
              onConfirm={handleOrderConfirm}
            />
          </div>
        )
      case "pending":
        return currentOrder ? (
          <TradePending
            order={currentOrder}
            onContinue={handleContinueTrade}
            onMinimize={handleMinimize}
            onComplete={handleTradeComplete}
          />
        ) : null
      case "result":
        return tradeResult ? (
          <TradeResultPage
            result={tradeResult}
            onContinue={handleContinueTrade}
            onMinimize={handleMinimize}
          />
        ) : null
      default:
        return (
          <div className="relative h-full">
            <TradePage onBuySell={handleBuySell} />
            <TradeOrderSheet 
              open={showOrderSheet} 
              onClose={() => setShowOrderSheet(false)}
              onConfirm={handleOrderConfirm}
            />
          </div>
        )
    }
  }

  const renderPage = () => {
    switch (activeTab) {
      case "home":
        return (
          <HomePage 
            onShowAuth={(view) => {
              setAuthView(view)
              setShowAuth(true)
            }}
            onShowCustomerService={() => setShowCustomerService(true)}
          />
        )
      case "trade":
        return renderTradePage()
      case "market":
        return <MarketPage />
      case "wallet":
        return <WalletPage />
      case "profile":
        return <ProfilePage />
      default:
        return (
          <HomePage 
            onShowAuth={(view) => {
              setAuthView(view)
              setShowAuth(true)
            }}
            onShowCustomerService={() => setShowCustomerService(true)}
          />
        )
    }
  }

  const hideNav = activeTab === "trade" && (tradeStep === "pending" || tradeStep === "result")

  // Show Auth Pages
  if (showAuth) {
    return (
      <AuthPages
        initialView={authView}
        onClose={() => setShowAuth(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    )
  }

  // Show Customer Service Page
  if (showCustomerService) {
    return (
      <CustomerServicePage
        onBack={() => setShowCustomerService(false)}
      />
    )
  }

  return (
    <div className="min-h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {renderPage()}
      </div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} hidden={hideNav} />
      
      {/* Confirm Dialog */}
      {showConfirm && currentOrder && (
        <ConfirmDialog
          order={currentOrder}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleConfirmOrder}
        />
      )}
    </div>
  )
}
