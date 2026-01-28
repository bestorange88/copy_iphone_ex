

import { useState } from "react"
import { ChevronLeft, Lock, Key, Eye, EyeOff, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FloatingParticles } from "./floating-particles"

type SettingsView = "main" | "changeLogin" | "changeSecurity" | "language"

// Language options
const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "zh-CN", name: "简体中文", flag: "🇨🇳" },
  { code: "zh-TW", name: "繁體中文", flag: "🇹🇼" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
]

// Main Security Settings Page
export function SecuritySettingsPage({ onBack }: { onBack: () => void }) {
  const [currentView, setCurrentView] = useState<SettingsView>("main")
  const [currentLanguage, setCurrentLanguage] = useState("zh-TW")

  if (currentView === "changeLogin") {
    return (
      <ChangeLoginPasswordPage
        onBack={() => setCurrentView("main")}
      />
    )
  }

  if (currentView === "changeSecurity") {
    return (
      <ChangeSecurityPasswordPage
        onBack={() => setCurrentView("main")}
      />
    )
  }

  if (currentView === "language") {
    return (
      <LanguageSettingsPage
        currentLanguage={currentLanguage}
        onLanguageChange={(lang) => {
          setCurrentLanguage(lang)
          setCurrentView("main")
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 text-foreground pb-20 relative overflow-hidden">
      <FloatingParticles />

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-4 bg-background/90 backdrop-blur-sm border-b border-border/20">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">安全設置</h1>
        <div className="w-6" />
      </div>

      {/* Settings Options */}
      <div className="mx-4 mt-6 space-y-3 relative z-10">
        {/* Change Login Password */}
        <button
          type="button"
          onClick={() => setCurrentView("changeLogin")}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-card hover:bg-card/80 transition-colors border border-border/30"
        >
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-[#3b82f6]" />
            <span className="font-medium">修改登錄密碼</span>
          </div>
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Change Security Password */}
        <button
          type="button"
          onClick={() => setCurrentView("changeSecurity")}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-card hover:bg-card/80 transition-colors border border-border/30"
        >
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-[#8b5cf6]" />
            <span className="font-medium">修改安全密碼</span>
          </div>
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Language Settings */}
        <button
          type="button"
          onClick={() => setCurrentView("language")}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-card hover:bg-card/80 transition-colors border border-border/30"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🌐</span>
            <span className="font-medium">語言設置</span>
          </div>
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

// Change Login Password Page
function ChangeLoginPasswordPage({ onBack }: { onBack: () => void }) {
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSave = () => {
    if (newPassword !== confirmPassword) {
      alert("新密碼和確認密碼不一致")
      return
    }
    alert("登錄密碼已修改")
    onBack()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 text-foreground pb-20 relative overflow-hidden">
      <FloatingParticles />

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-4 bg-background/90 backdrop-blur-sm border-b border-border/20">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">修改登錄密碼</h1>
        <div className="w-6" />
      </div>

      {/* Form */}
      <div className="mx-4 mt-6 p-6 rounded-xl bg-card border border-border/30 space-y-6 relative z-10">
        {/* Old Password */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">舊密碼</label>
          <div className="relative">
            <input
              type={showOld ? "text" : "password"}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="請輸入舊密碼"
              className="w-full px-4 py-3 rounded-lg bg-input border border-border/50 text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#3b82f6]"
            />
            <button
              type="button"
              onClick={() => setShowOld(!showOld)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showOld ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">新密碼</label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="請輸入新密碼"
              className="w-full px-4 py-3 rounded-lg bg-input border border-border/50 text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#3b82f6]"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">確認密碼</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="請再次輸入新密碼"
              className="w-full px-4 py-3 rounded-lg bg-input border border-border/50 text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#3b82f6]"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4] hover:from-[#7c3aed] hover:to-[#0891b2] text-white font-medium py-3 rounded-lg"
        >
          保存密碼
        </Button>
      </div>
    </div>
  )
}

// Change Security Password Page
function ChangeSecurityPasswordPage({ onBack }: { onBack: () => void }) {
  const [hasSecurityPassword, setHasSecurityPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSave = () => {
    if (!newPassword) {
      alert("請輸入新安全密碼")
      return
    }
    if (newPassword !== confirmPassword) {
      alert("新密碼和確認密碼不一致")
      return
    }
    alert("安全密碼已修改")
    setHasSecurityPassword(true)
    setNewPassword("")
    setConfirmPassword("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 text-foreground pb-20 relative overflow-hidden">
      <FloatingParticles />

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-4 bg-background/90 backdrop-blur-sm border-b border-border/20">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">修改安全密碼</h1>
        <div className="w-6" />
      </div>

      {/* Form */}
      <div className="mx-4 mt-6 p-6 rounded-xl bg-card border border-border/30 space-y-6 relative z-10">
        {/* Warning Message */}
        {!hasSecurityPassword && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            檢測到您尚未設置安全密碼，請直接輸入安全密碼。
          </div>
        )}

        {/* New Security Password */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">新安全密碼</label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="請輸入新安全密碼"
              className="w-full px-4 py-3 rounded-lg bg-input border border-border/50 text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#3b82f6]"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Confirm Security Password */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">確認安全密碼</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="請再次輸入新安全密碼"
              className="w-full px-4 py-3 rounded-lg bg-input border border-border/50 text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#3b82f6]"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4] hover:from-[#7c3aed] hover:to-[#0891b2] text-white font-medium py-3 rounded-lg"
        >
          保存密碼
        </Button>
      </div>
    </div>
  )
}

// Language Settings Page
export function LanguageSettingsPage({
  currentLanguage,
  onLanguageChange,
}: {
  currentLanguage: string
  onLanguageChange: (lang: string) => void
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 text-foreground pb-20 relative overflow-hidden">
      <FloatingParticles />

      {/* Language List */}
      <div className="mt-8 mx-4 space-y-3 relative z-10">
        {languages.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => onLanguageChange(lang.code)}
            className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-all border ${
              currentLanguage === lang.code
                ? "bg-[#1e293b] border-[#3b82f6]"
                : "bg-card border-border/30 hover:bg-card/80"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{lang.flag}</span>
              <span className="font-medium">{lang.name}</span>
            </div>
            {currentLanguage === lang.code && (
              <div className="w-5 h-5 rounded-full border-2 border-[#3b82f6] flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
