

import React, { useState } from "react"

import { 
  Bell, 
  Wallet, 
  CreditCard, 
  Clock, 
  Shield, 
  UserCheck, 
  Globe,
  Copy,
  QrCode,
  Edit,
  ChevronRight
} from "lucide-react"
import { FloatingParticles } from "./floating-particles"
import { PersonalInfoPage, UserVerificationPage, PlatformLoanPage, TradingRecordsPage } from "./profile-subpages"
import { SecuritySettingsPage, LanguageSettingsPage } from "./settings-pages"

type ProfileView = "main" | "personal" | "verification" | "loan" | "records" | "security" | "language"

interface MenuItem {
  icon: React.ReactNode
  label: string
  rightContent?: React.ReactNode
}

const menuItems: MenuItem[] = [
  {
    icon: <Bell className="w-5 h-5 text-foreground" />,
    label: "Notification",
    rightContent: (
      <span className="w-6 h-6 rounded-full bg-[#3b82f6] text-white text-xs flex items-center justify-center">
        0
      </span>
    ),
  },
  {
    icon: <Wallet className="w-5 h-5 text-foreground" />,
    label: "Asset Management",
    rightContent: <ChevronRight className="w-5 h-5 text-muted-foreground" />,
  },
  {
    icon: <CreditCard className="w-5 h-5 text-foreground" />,
    label: "Platform Loan",
    rightContent: <ChevronRight className="w-5 h-5 text-muted-foreground" />,
  },
  {
    icon: <Clock className="w-5 h-5 text-foreground" />,
    label: "Transaction Records",
    rightContent: <ChevronRight className="w-5 h-5 text-[#3b82f6]" />,
  },
]

const settingsItems: MenuItem[] = [
  {
    icon: <Shield className="w-5 h-5 text-foreground" />,
    label: "Security settings",
    rightContent: <ChevronRight className="w-5 h-5 text-muted-foreground" />,
  },
  {
    icon: <UserCheck className="w-5 h-5 text-foreground" />,
    label: "Authentication",
    rightContent: <ChevronRight className="w-5 h-5 text-[#ec4899]" />,
  },
  {
    icon: <Globe className="w-5 h-5 text-foreground" />,
    label: "Language settings",
    rightContent: <ChevronRight className="w-5 h-5 text-muted-foreground" />,
  },
]

export function ProfilePage() {
  const [currentView, setCurrentView] = useState<ProfileView>("main")
  
  const username = "82****88"
  const displayName = "旭陽高照"
  const userId = "82536060"
  const invitationCode = "GpDNZNY"
  const creditScore = 100

  // Render sub-pages
  if (currentView === "personal") {
    return <PersonalInfoPage onBack={() => setCurrentView("main")} />
  }
  if (currentView === "verification") {
    return <UserVerificationPage onBack={() => setCurrentView("main")} />
  }
  if (currentView === "loan") {
    return <PlatformLoanPage onBack={() => setCurrentView("main")} />
  }
  if (currentView === "records") {
    return <TradingRecordsPage onBack={() => setCurrentView("main")} />
  }
  if (currentView === "security") {
    return <SecuritySettingsPage onBack={() => setCurrentView("main")} />
  }
  if (currentView === "language") {
    return <LanguageSettingsPage currentLanguage="zh-TW" onLanguageChange={() => setCurrentView("main")} />
  }

  return (
    <div className="min-h-full bg-background flex flex-col relative">
      <FloatingParticles />
      
      {/* Header */}
      <header className="text-center pt-4 pb-2 relative z-10">
        <h1 className="text-xl font-bold text-foreground">User Center</h1>
        <p className="text-sm text-muted-foreground mt-2 px-8">
          Whether you are an active or inactive trading client, you will receive tailor-made first-class services
        </p>
      </header>

      {/* User Card */}
      <div className="mx-4 mt-4 relative z-10">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#4c1d95] via-[#5b21b6] to-[#1e3a8a] p-4">
          {/* SAXO Watermark */}
          <div className="absolute top-4 right-4 opacity-30">
            <div className="text-white text-2xl font-bold tracking-widest">SAXO</div>
            <div className="text-white text-[8px] tracking-wider">BE INVESTED</div>
          </div>
          
          {/* Edit Button */}
          <button 
            type="button" 
            onClick={() => setCurrentView("personal")}
            className="absolute top-4 right-4 text-white/70 hover:text-white"
          >
            <Edit className="w-5 h-5" />
          </button>
          
          {/* Username */}
          <div className="text-white/80 text-sm mb-8">{username}</div>
          
          {/* Avatar */}
          <div className="flex items-end justify-between">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f472b6] to-[#ec4899] flex items-center justify-center text-3xl text-white font-bold shadow-lg">
                旭
              </div>
            </div>
            
            {/* ID and Invitation Code */}
            <div className="text-right">
              <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                <span>ID:{userId}</span>
                <button type="button" className="hover:text-white">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <span>Invitation Code:{invitationCode}</span>
                <button type="button" className="hover:text-white">
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Credit Score Badge */}
        <div className="flex items-center justify-between mt-3 px-1">
          <div>
            <div className="text-muted-foreground text-xs">Credit Score: {creditScore}</div>
            <div className="text-foreground font-semibold">{displayName}</div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="mt-6 mx-4 bg-card rounded-xl overflow-hidden relative z-10">
        {menuItems.map((item, index) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              if (item.label === "Platform Loan") setCurrentView("loan")
              if (item.label === "Transaction Records") setCurrentView("records")
            }}
            className={`w-full flex items-center justify-between px-4 py-4 hover:bg-muted/50 transition-colors ${
              index !== menuItems.length - 1 ? "border-b border-border/30" : ""
            }`}
          >
            <div className="flex items-center gap-4">
              {item.icon}
              <span className="text-foreground font-medium">{item.label}</span>
            </div>
            {item.rightContent}
          </button>
        ))}
      </div>

      {/* Settings Items */}
      <div className="mt-4 mx-4 bg-card rounded-xl overflow-hidden relative z-10 mb-4">
        {settingsItems.map((item, index) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              if (item.label === "Authentication") setCurrentView("verification")
              if (item.label === "Security settings") setCurrentView("security")
              if (item.label === "Language settings") setCurrentView("language")
            }}
            className={`w-full flex items-center justify-between px-4 py-4 hover:bg-muted/50 transition-colors ${
              index !== settingsItems.length - 1 ? "border-b border-border/30" : ""
            }`}
          >
            <div className="flex items-center gap-4">
              {item.icon}
              <span className="text-foreground font-medium">{item.label}</span>
            </div>
            {item.rightContent}
          </button>
        ))}
      </div>
    </div>
  )
}
