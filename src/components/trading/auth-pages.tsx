

import { useState } from "react"
import { ChevronLeft, Home, Eye, EyeOff, User, Key, Code, Globe, Check, ChevronDown, Phone, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { FloatingParticles } from "./floating-particles"

type AuthView = "login" | "register" | "forgot" | "language"

interface AuthPagesProps {
  onClose?: () => void
  initialView?: AuthView
}

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "zh-CN", name: "简体中文", flag: "🇸🇬" },
  { code: "zh-TW", name: "繁體中文", flag: "🇹🇼" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
]

const countries = [
  { code: "+886", name: "Taiwan", flag: "🇹🇼" },
  { code: "+86", name: "China", flag: "🇨🇳" },
  { code: "+852", name: "Hong Kong", flag: "🇭🇰" },
  { code: "+81", name: "Japan", flag: "🇯🇵" },
  { code: "+82", name: "South Korea", flag: "🇰🇷" },
  { code: "+1", name: "United States", flag: "🇺🇸" },
]

// SAXO Logo Component
function SaxoLogo({ size = "normal" }: { size?: "normal" | "small" }) {
  const sizeClasses = size === "small" ? "w-16 h-16" : "w-24 h-24"
  return (
    <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-[#67e8f9] to-[#22d3ee] flex items-center justify-center`}>
      <div className="text-center">
        <div className={`font-bold text-[#0f172a] ${size === "small" ? "text-lg" : "text-2xl"}`}>SAXO</div>
        <div className={`text-[#0f172a] ${size === "small" ? "text-[6px]" : "text-[8px]"}`}>BE INVESTED</div>
      </div>
    </div>
  )
}

// Password Strength Indicator
function PasswordStrength({ password }: { password: string }) {
  const getStrength = () => {
    if (password.length === 0) return 0
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[!@#$%^&*]/.test(password)) strength++
    return Math.min(strength, 4)
  }
  
  const strength = getStrength()
  const labels = ["", "弱", "中", "強", "很強"]
  const colors = ["bg-muted", "bg-red-500", "bg-yellow-500", "bg-green-500", "bg-emerald-500"]
  
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">密碼強度</span>
        <span className="text-xs text-muted-foreground">{labels[strength]}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded ${level <= strength ? colors[strength] : "bg-muted"}`}
          />
        ))}
      </div>
    </div>
  )
}

// Language Selection View
function LanguageView({ 
  selectedLang, 
  onSelect, 
  onClose 
}: { 
  selectedLang: string
  onSelect: (code: string) => void
  onClose: () => void 
}) {
  return (
    <div className="min-h-screen bg-background relative">
      <FloatingParticles />
      <div className="relative z-10 pt-32 px-4 space-y-3">
        {languages.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => {
              onSelect(lang.code)
              onClose()
            }}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm hover:bg-card/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{lang.flag}</span>
              <span className="text-foreground">{lang.name}</span>
            </div>
            {selectedLang === lang.code && (
              <Check className="w-5 h-5 text-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// Login View
function LoginView({ 
  onNavigate, 
  onShowLanguage,
  selectedLang 
}: { 
  onNavigate: (view: AuthView) => void
  onShowLanguage: () => void
  selectedLang: string
}) {
  const [phone, setPhone] = useState("82345688")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  
  const langInfo = languages.find(l => l.code === selectedLang) || languages[3]
  
  return (
    <div className="min-h-screen bg-background relative">
      <FloatingParticles />
      
      <div className="relative z-10 p-4">
        {/* Language Selector */}
        <button
          type="button"
          onClick={onShowLanguage}
          className="flex items-center gap-2 text-foreground mb-8"
        >
          <span className="text-lg">{langInfo.flag}</span>
          <span>{langInfo.name}</span>
          <ChevronDown className="w-4 h-4" />
        </button>
        
        {/* Login Card */}
        <div className="bg-card/30 border border-border/50 rounded-2xl p-6 backdrop-blur-sm">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <SaxoLogo />
          </div>
          <h2 className="text-center text-[#22d3ee] text-lg mb-6">用戶登錄</h2>
          
          {/* Phone/Email Field */}
          <div className="mb-4">
            <label className="block text-sm text-foreground mb-2">郵箱/手機號</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10 bg-card/80 border-border/50 h-12"
                placeholder="輸入郵箱或手機號"
              />
            </div>
          </div>
          
          {/* Password Field */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-foreground">密碼</label>
              <button
                type="button"
                onClick={() => onNavigate("forgot")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                忘記密碼?
              </button>
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 bg-card/80 border-border/50 h-12"
                placeholder="輸入密碼"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <Eye className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
          
          {/* Remember Me */}
          <div className="flex items-center gap-2 mb-6">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            />
            <label htmlFor="remember" className="text-sm text-muted-foreground">
              記住我的登錄狀態
            </label>
          </div>
          
          {/* Login Button */}
          <Button className="w-full h-12 bg-gradient-to-r from-[#8b5cf6] to-[#22d3ee] hover:opacity-90 text-white font-medium">
            登錄
          </Button>
          
          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-muted-foreground text-sm">或者</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>
          
          {/* Register Link */}
          <p className="text-center text-muted-foreground">
            沒有賬戶？{" "}
            <button
              type="button"
              onClick={() => onNavigate("register")}
              className="text-foreground underline hover:text-primary"
            >
              立即註冊
            </button>
          </p>
        </div>
        
        {/* Footer */}
        <p className="text-center text-muted-foreground text-sm mt-8">
          ©2021-2026 Saxo.Ex 版權所有
        </p>
      </div>
    </div>
  )
}

// Register View
function RegisterView({ 
  onNavigate,
  onShowLanguage,
  selectedLang
}: { 
  onNavigate: (view: AuthView) => void
  onShowLanguage: () => void
  selectedLang: string
}) {
  const [useEmail, setUseEmail] = useState(false)
  const [country, setCountry] = useState(countries[0])
  const [phone, setPhone] = useState("82345688")
  const [email, setEmail] = useState("")
  const [verifyCode, setVerifyCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  
  const langInfo = languages.find(l => l.code === selectedLang) || languages[3]
  
  return (
    <div className="min-h-screen bg-background relative overflow-auto">
      <FloatingParticles />
      
      <div className="relative z-10 p-4 pb-24">
        {/* Language Selector */}
        <button
          type="button"
          onClick={onShowLanguage}
          className="flex items-center gap-2 text-foreground mb-4"
        >
          <span className="text-lg">{langInfo.flag}</span>
          <span>{langInfo.name}</span>
          <ChevronDown className="w-4 h-4" />
        </button>
        
        {/* Register Card */}
        <div className="bg-card/30 border border-border/50 rounded-2xl p-6 backdrop-blur-sm">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <SaxoLogo />
          </div>
          <h2 className="text-center text-[#22d3ee] text-lg mb-6">用戶註冊</h2>
          
          {/* Country/Region */}
          <div className="mb-4">
            <label className="block text-sm text-foreground mb-2">國家或地區</label>
            <button
              type="button"
              onClick={() => setShowCountryPicker(!showCountryPicker)}
              className="w-full flex items-center gap-3 p-3 bg-card/80 border border-border/50 rounded-lg"
            >
              <Globe className="w-5 h-5 text-muted-foreground" />
              <span>{country.name}</span>
            </button>
            
            {showCountryPicker && (
              <div className="mt-2 bg-card border border-border rounded-lg overflow-hidden">
                {countries.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setCountry(c)
                      setShowCountryPicker(false)
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50"
                  >
                    <span>{c.flag}</span>
                    <span>{c.name}</span>
                    <span className="text-muted-foreground ml-auto">{c.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Phone/Email Field */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-foreground">
                {useEmail ? "郵箱" : "手機號"}
              </label>
              <button
                type="button"
                onClick={() => setUseEmail(!useEmail)}
                className="text-sm text-[#22d3ee] hover:underline"
              >
                {useEmail ? "切換成手機註冊" : "切換成郵箱註冊"}
              </button>
            </div>
            <div className="relative">
              {useEmail ? (
                <>
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-card/80 border-border/50 h-12"
                    placeholder="輸入郵箱地址"
                  />
                </>
              ) : (
                <>
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#22d3ee] text-sm">
                    {country.code}
                  </span>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-14 bg-card/80 border-border/50 h-12"
                    placeholder="輸入手機號"
                  />
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                </>
              )}
            </div>
          </div>
          
          {/* Verification Code */}
          <div className="mb-4">
            <label className="block text-sm text-foreground mb-2">驗證碼</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Code className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  className="pl-10 bg-card/80 border-border/50 h-12"
                  placeholder="輸入驗證碼"
                />
              </div>
              <Button className="h-12 px-4 bg-[#3b82f6] hover:bg-[#2563eb] text-white whitespace-nowrap">
                <span className="mr-1">✈</span> 獲取驗證碼
              </Button>
            </div>
          </div>
          
          {/* Password Field */}
          <div className="mb-4">
            <label className="block text-sm text-foreground mb-2">密碼</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 bg-card/80 border-border/50 h-12"
                placeholder="輸入密碼"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <Eye className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>
          
          {/* Confirm Password */}
          <div className="mb-4">
            <label className="block text-sm text-foreground mb-2">確認密碼</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10 bg-card/80 border-border/50 h-12"
                placeholder="再次輸入密碼"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showConfirmPassword ? (
                  <Eye className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
          
          {/* Terms Checkbox */}
          <div className="flex items-start gap-2 mb-6">
            <Checkbox
              id="terms"
              checked={agreeTerms}
              onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
              className="mt-0.5"
            />
            <label htmlFor="terms" className="text-sm text-muted-foreground">
              我同意{" "}
              <span className="text-[#22d3ee]">服務條款</span>
              {" "}和{" "}
              <span className="text-[#22d3ee]">隱私政策</span>
            </label>
          </div>
          
          {/* Register Button */}
          <Button className="w-full h-12 bg-gradient-to-r from-[#8b5cf6] to-[#22d3ee] hover:opacity-90 text-white font-medium">
            立即註冊
          </Button>
          
          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-muted-foreground text-sm">或者</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>
          
          {/* Login Link */}
          <p className="text-center text-muted-foreground">
            已有賬戶？{" "}
            <button
              type="button"
              onClick={() => onNavigate("login")}
              className="text-foreground underline hover:text-primary"
            >
              立即登錄
            </button>
          </p>
        </div>
        
        {/* Footer */}
        <p className="text-center text-muted-foreground text-sm mt-8">
          ©2021-2026 Saxo.Ex 版權所有
        </p>
      </div>
    </div>
  )
}

// Forgot Password View
function ForgotPasswordView({ 
  onNavigate,
  onClose
}: { 
  onNavigate: (view: AuthView) => void
  onClose?: () => void
}) {
  const [phone, setPhone] = useState("82345688")
  const [verifyCode, setVerifyCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  return (
    <div className="min-h-screen bg-background relative">
      <FloatingParticles />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <button type="button" onClick={() => onNavigate("login")}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-medium">找回密碼</h1>
          <button type="button" onClick={onClose}>
            <Home className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4">
          {/* Phone/Email Field */}
          <div className="mb-4">
            <label className="block text-sm text-foreground mb-2">郵箱/手機號</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10 bg-card/80 border-border/50 h-12"
                placeholder="輸入郵箱或手機號"
              />
            </div>
          </div>
          
          {/* Verification Code */}
          <div className="mb-4">
            <label className="block text-sm text-foreground mb-2">驗證碼</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Code className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  className="pl-10 bg-card/80 border-border/50 h-12"
                  placeholder="輸入驗證碼"
                />
              </div>
              <Button className="h-12 px-4 bg-[#3b82f6] hover:bg-[#2563eb] text-white whitespace-nowrap">
                <span className="mr-1">✈</span> 獲取驗證碼
              </Button>
            </div>
          </div>
          
          {/* New Password */}
          <div className="mb-4">
            <label className="block text-sm text-foreground mb-2">新密碼</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 bg-card/80 border-border/50 h-12"
                placeholder="輸入新密碼"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <Eye className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
            <PasswordStrength password={password} />
            
            {/* Password Requirements */}
            <div className="mt-3 text-xs text-muted-foreground">
              <p className="mb-1">密碼要求：</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>至少8個字符</li>
                <li>至少包含以下2種：大寫字母、小寫字母、數字、特殊字符</li>
                <li>{"允許的特殊字符：!@#$%^&*"}</li>
              </ul>
            </div>
          </div>
          
          {/* Confirm Password */}
          <div className="mb-6">
            <label className="block text-sm text-foreground mb-2">確認密碼</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10 bg-card/80 border-border/50 h-12"
                placeholder="再次輸入密碼"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showConfirmPassword ? (
                  <Eye className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
          
          {/* Reset Button */}
          <Button className="w-full h-12 bg-gradient-to-r from-[#8b5cf6] to-[#22d3ee] hover:opacity-90 text-white font-medium">
            重置密碼
          </Button>
        </div>
        
        {/* Footer */}
        <p className="text-center text-muted-foreground text-sm mt-8">
          ©2021-2026 Saxo.Ex 版權所有
        </p>
      </div>
    </div>
  )
}

// Main Auth Pages Component
export function AuthPages({ onClose, initialView = "login" }: AuthPagesProps) {
  const [view, setView] = useState<AuthView>(initialView)
  const [selectedLang, setSelectedLang] = useState("zh-TW")
  const [showLanguage, setShowLanguage] = useState(false)
  
  if (showLanguage) {
    return (
      <LanguageView
        selectedLang={selectedLang}
        onSelect={setSelectedLang}
        onClose={() => setShowLanguage(false)}
      />
    )
  }
  
  switch (view) {
    case "login":
      return (
        <LoginView
          onNavigate={setView}
          onShowLanguage={() => setShowLanguage(true)}
          selectedLang={selectedLang}
        />
      )
    case "register":
      return (
        <RegisterView
          onNavigate={setView}
          onShowLanguage={() => setShowLanguage(true)}
          selectedLang={selectedLang}
        />
      )
    case "forgot":
      return (
        <ForgotPasswordView
          onNavigate={setView}
          onClose={onClose}
        />
      )
    default:
      return null
  }
}
