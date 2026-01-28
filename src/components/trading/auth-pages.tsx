import { useState } from "react"
import { Eye, EyeOff, User, Lock, Globe, Check, ChevronDown, Phone, Mail, Code } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useTranslation } from "react-i18next"

type AuthView = "login" | "register" | "forgot" | "language"

interface AuthPagesProps {
  onClose?: () => void
  onLoginSuccess?: () => void
  initialView?: AuthView
}

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "zh-CN", name: "简体中文", flag: "🇨🇳" },
  { code: "zh-TW", name: "繁體中文", flag: "🇹🇼" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
]

const countries = [
  { code: "+886", name: "Taiwan", flag: "🇹🇼" },
  { code: "+86", name: "China", flag: "🇨🇳" },
  { code: "+852", name: "Hong Kong", flag: "🇭🇰" },
  { code: "+81", name: "Japan", flag: "🇯🇵" },
  { code: "+82", name: "South Korea", flag: "🇰🇷" },
  { code: "+1", name: "United States", flag: "🇺🇸" },
]

function NetworkBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <g stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1">
          <line x1="10%" y1="20%" x2="30%" y2="35%" />
          <line x1="30%" y1="35%" x2="50%" y2="25%" />
          <line x1="50%" y1="25%" x2="70%" y2="40%" />
          <line x1="70%" y1="40%" x2="90%" y2="30%" />
          <line x1="20%" y1="60%" x2="40%" y2="75%" />
          <line x1="40%" y1="75%" x2="60%" y2="65%" />
          <line x1="60%" y1="65%" x2="80%" y2="80%" />
          <line x1="30%" y1="35%" x2="40%" y2="75%" />
          <line x1="70%" y1="40%" x2="60%" y2="65%" />
          <line x1="10%" y1="85%" x2="30%" y2="90%" />
          <line x1="70%" y1="85%" x2="90%" y2="95%" />
        </g>
        <g fill="#22d3ee">
          <circle cx="10%" cy="20%" r="3" opacity="0.6" />
          <circle cx="30%" cy="35%" r="4" opacity="0.8" />
          <circle cx="50%" cy="25%" r="3" opacity="0.5" />
          <circle cx="70%" cy="40%" r="5" opacity="0.7" />
          <circle cx="90%" cy="30%" r="3" opacity="0.6" />
          <circle cx="20%" cy="60%" r="3" opacity="0.5" />
          <circle cx="40%" cy="75%" r="4" opacity="0.7" />
          <circle cx="60%" cy="65%" r="3" opacity="0.6" />
          <circle cx="80%" cy="80%" r="4" opacity="0.8" />
          <circle cx="10%" cy="85%" r="3" opacity="0.5" />
          <circle cx="90%" cy="95%" r="3" opacity="0.6" />
        </g>
      </svg>
    </div>
  )
}

function SaxoLogo({ size = "normal" }: { size?: "normal" | "small" }) {
  const sizeClasses = size === "small" ? "w-16 h-16" : "w-24 h-24"
  return (
    <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-[#67e8f9] to-[#22d3ee] flex items-center justify-center shadow-lg shadow-[#22d3ee]/30`}>
      <div className="text-center">
        <div className={`font-bold text-[#0f172a] ${size === "small" ? "text-lg" : "text-2xl"}`}>SAXO</div>
        <div className={`text-[#0f172a] font-medium ${size === "small" ? "text-[6px]" : "text-[8px]"}`}>BE INVESTED</div>
      </div>
    </div>
  )
}

function PasswordStrength({ password, t }: { password: string; t: (key: string) => string }) {
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
  const labels = ["", t('saxo.password_weak'), t('saxo.password_medium'), t('saxo.password_strong'), t('saxo.password_very_strong')]
  const colors = ["bg-muted", "bg-red-500", "bg-yellow-500", "bg-green-500", "bg-emerald-500"]
  
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{t('saxo.password_strength')}</span>
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

function LanguageView({ 
  selectedLang, 
  onSelect, 
  onClose 
}: { 
  selectedLang: string
  onSelect: (code: string) => void
  onClose: () => void 
}) {
  const { t } = useTranslation()
  
  return (
    <div className="min-h-screen bg-[#0a0e1a] relative">
      <NetworkBackground />
      <div className="relative z-10 pt-20 px-4 space-y-3">
        <h2 className="text-center text-white text-xl mb-6">{t('saxo.select_language')}</h2>
        {languages.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => {
              onSelect(lang.code)
              onClose()
            }}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-[#1e293b]/50 border border-[#22d3ee]/20 backdrop-blur-sm hover:bg-[#1e293b]/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{lang.flag}</span>
              <span className="text-white">{lang.name}</span>
            </div>
            {selectedLang === lang.code && (
              <Check className="w-5 h-5 text-[#22d3ee]" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function LoginView({ 
  onNavigate, 
  onShowLanguage,
  onLoginSuccess,
  selectedLang 
}: { 
  onNavigate: (view: AuthView) => void
  onShowLanguage: () => void
  onLoginSuccess?: () => void
  selectedLang: string
}) {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  
  const langInfo = languages.find(l => l.code === selectedLang) || languages[3]
  
  const handleLogin = () => {
    if (email && password) {
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userEmail', email)
      onLoginSuccess?.()
    }
  }
  
  return (
    <div className="min-h-screen bg-[#0a0e1a] relative flex flex-col">
      <NetworkBackground />
      
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4">
          <button
            type="button"
            onClick={onShowLanguage}
            className="flex items-center gap-2 text-white"
          >
            <span className="text-lg">{langInfo.flag}</span>
            <span className="text-sm">{langInfo.name}</span>
          </button>
          <div className="text-center">
            <div className="text-white font-bold text-lg tracking-wider">SAXO</div>
            <div className="text-[#22d3ee] text-[8px]">BE INVESTED</div>
          </div>
          <div className="w-16" />
        </div>
        
        <div className="flex-1 flex flex-col justify-center px-4 py-8">
          <div className="bg-[#1e293b]/40 border border-[#22d3ee]/20 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex justify-center mb-4 -mt-16">
              <SaxoLogo />
            </div>
            <h2 className="text-center text-white text-xl mb-6">{t('saxo.user_login')}</h2>
            
            <div className="mb-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 bg-[#0f172a]/80 border-[#334155] h-14 text-white placeholder:text-muted-foreground rounded-xl"
                  placeholder={t('saxo.email_or_phone_placeholder')}
                />
              </div>
            </div>
            
            <div className="mb-4">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-12 bg-[#0f172a]/80 border-[#334155] h-14 text-white placeholder:text-muted-foreground rounded-xl"
                  placeholder={t('saxo.password_placeholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mb-6">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                className="border-[#334155] data-[state=checked]:bg-[#22d3ee] data-[state=checked]:border-[#22d3ee]"
              />
              <label htmlFor="remember" className="text-sm text-white">
                {t('saxo.remember_me')}
              </label>
            </div>
            
            <Button 
              onClick={handleLogin}
              className="w-full h-14 bg-gradient-to-r from-[#8b5cf6] to-[#22d3ee] hover:opacity-90 text-white font-medium text-lg rounded-xl"
            >
              {t('saxo.login')}
            </Button>
            
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                type="button"
                onClick={() => onNavigate("forgot")}
                className="text-muted-foreground text-sm hover:text-white"
              >
                {t('saxo.forgot_password')}?
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                type="button"
                onClick={() => onNavigate("register")}
                className="text-[#22d3ee] text-sm hover:underline"
              >
                {t('saxo.register_now')}
              </button>
            </div>
          </div>
        </div>
        
        <div className="px-4 pb-8">
          <p className="text-center text-muted-foreground text-xs">
            {t('saxo.copyright')}
          </p>
        </div>
      </div>
    </div>
  )
}

function RegisterView({ 
  onNavigate,
  onShowLanguage,
  selectedLang
}: { 
  onNavigate: (view: AuthView) => void
  onShowLanguage: () => void
  selectedLang: string
}) {
  const { t } = useTranslation()
  const [useEmail, setUseEmail] = useState(false)
  const [country, setCountry] = useState(countries[0])
  const [phone, setPhone] = useState("")
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
    <div className="min-h-screen bg-[#0a0e1a] relative flex flex-col overflow-auto">
      <NetworkBackground />
      
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4">
          <button
            type="button"
            onClick={onShowLanguage}
            className="flex items-center gap-2 text-white"
          >
            <span className="text-lg">{langInfo.flag}</span>
            <span className="text-sm">{langInfo.name}</span>
          </button>
          <div className="text-center">
            <div className="text-white font-bold text-lg tracking-wider">SAXO</div>
            <div className="text-[#22d3ee] text-[8px]">BE INVESTED</div>
          </div>
          <div className="w-16" />
        </div>
        
        <div className="flex-1 px-4 py-6">
          <div className="bg-[#1e293b]/40 border border-[#22d3ee]/20 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex justify-center mb-4 -mt-16">
              <SaxoLogo />
            </div>
            <h2 className="text-center text-white text-xl mb-6">{t('saxo.user_register')}</h2>
            
            <div className="mb-4">
              <label className="block text-sm text-white mb-2">{t('saxo.country_region')}</label>
              <button
                type="button"
                onClick={() => setShowCountryPicker(!showCountryPicker)}
                className="w-full flex items-center gap-3 p-4 bg-[#0f172a]/80 border border-[#334155] rounded-xl text-white"
              >
                <Globe className="w-5 h-5 text-muted-foreground" />
                <span>{country.flag} {country.name}</span>
                <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
              </button>
              
              {showCountryPicker && (
                <div className="mt-2 bg-[#1e293b] border border-[#334155] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {countries.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCountry(c)
                        setShowCountryPicker(false)
                      }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-[#334155]/50 text-white"
                    >
                      <span>{c.flag}</span>
                      <span>{c.name}</span>
                      <span className="text-muted-foreground ml-auto">{c.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-white">
                  {useEmail ? t('saxo.email') : t('saxo.phone_number')}
                </label>
                <button
                  type="button"
                  onClick={() => setUseEmail(!useEmail)}
                  className="text-sm text-[#22d3ee] hover:underline"
                >
                  {useEmail ? t('saxo.switch_to_phone') : t('saxo.switch_to_email')}
                </button>
              </div>
              <div className="relative">
                {useEmail ? (
                  <>
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 bg-[#0f172a]/80 border-[#334155] h-14 text-white placeholder:text-muted-foreground rounded-xl"
                      placeholder={t('saxo.email_placeholder')}
                    />
                  </>
                ) : (
                  <>
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#22d3ee] text-sm">
                      {country.code}
                    </span>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-16 bg-[#0f172a]/80 border-[#334155] h-14 text-white placeholder:text-muted-foreground rounded-xl"
                      placeholder={t('saxo.phone_placeholder')}
                    />
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  </>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm text-white mb-2">{t('saxo.verification_code')}</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Code className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    className="pl-12 bg-[#0f172a]/80 border-[#334155] h-14 text-white placeholder:text-muted-foreground rounded-xl"
                    placeholder={t('saxo.verification_code_placeholder')}
                  />
                </div>
                <Button className="h-14 px-4 bg-[#3b82f6] hover:bg-[#2563eb] text-white whitespace-nowrap rounded-xl">
                  {t('saxo.get_code')}
                </Button>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm text-white mb-2">{t('saxo.password')}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-12 bg-[#0f172a]/80 border-[#334155] h-14 text-white placeholder:text-muted-foreground rounded-xl"
                  placeholder={t('saxo.password_placeholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
              <PasswordStrength password={password} t={t} />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm text-white mb-2">{t('saxo.confirm_password')}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-12 pr-12 bg-[#0f172a]/80 border-[#334155] h-14 text-white placeholder:text-muted-foreground rounded-xl"
                  placeholder={t('saxo.password_placeholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  {showConfirmPassword ? (
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex items-start gap-2 mb-6">
              <Checkbox
                id="terms"
                checked={agreeTerms}
                onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                className="border-[#334155] data-[state=checked]:bg-[#22d3ee] data-[state=checked]:border-[#22d3ee] mt-0.5"
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground">
                {t('saxo.agree_terms')} <span className="text-[#22d3ee]">{t('saxo.terms_of_service')}</span> {t('saxo.and')} <span className="text-[#22d3ee]">{t('saxo.privacy_policy')}</span>
              </label>
            </div>
            
            <Button className="w-full h-14 bg-gradient-to-r from-[#8b5cf6] to-[#22d3ee] hover:opacity-90 text-white font-medium text-lg rounded-xl">
              {t('saxo.register')}
            </Button>
            
            <div className="flex items-center justify-center gap-2 mt-6">
              <span className="text-muted-foreground text-sm">{t('saxo.has_account')}</span>
              <button
                type="button"
                onClick={() => onNavigate("login")}
                className="text-[#22d3ee] text-sm hover:underline"
              >
                {t('saxo.login_now')}
              </button>
            </div>
          </div>
        </div>
        
        <div className="px-4 pb-6">
          <p className="text-center text-muted-foreground text-xs">
            {t('saxo.copyright')}
          </p>
        </div>
      </div>
    </div>
  )
}

function ForgotPasswordView({ 
  onNavigate,
  onClose
}: { 
  onNavigate: (view: AuthView) => void
  onClose?: () => void
}) {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [verifyCode, setVerifyCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  
  return (
    <div className="min-h-screen bg-[#0a0e1a] relative flex flex-col">
      <NetworkBackground />
      
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex items-center justify-center px-4 pt-4">
          <div className="text-center">
            <div className="text-white font-bold text-lg tracking-wider">SAXO</div>
            <div className="text-[#22d3ee] text-[8px]">BE INVESTED</div>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col justify-center px-4 py-8">
          <div className="bg-[#1e293b]/40 border border-[#22d3ee]/20 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex justify-center mb-4 -mt-16">
              <SaxoLogo />
            </div>
            <h2 className="text-center text-white text-xl mb-6">{t('saxo.reset_password')}</h2>
            
            <div className="mb-4">
              <label className="block text-sm text-white mb-2">{t('saxo.email')}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 bg-[#0f172a]/80 border-[#334155] h-14 text-white placeholder:text-muted-foreground rounded-xl"
                  placeholder={t('saxo.email_placeholder')}
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm text-white mb-2">{t('saxo.verification_code')}</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Code className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    className="pl-12 bg-[#0f172a]/80 border-[#334155] h-14 text-white placeholder:text-muted-foreground rounded-xl"
                    placeholder={t('saxo.verification_code_placeholder')}
                  />
                </div>
                <Button className="h-14 px-4 bg-[#3b82f6] hover:bg-[#2563eb] text-white whitespace-nowrap rounded-xl">
                  {t('saxo.send_code')}
                </Button>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm text-white mb-2">{t('saxo.password')}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-12 pr-12 bg-[#0f172a]/80 border-[#334155] h-14 text-white placeholder:text-muted-foreground rounded-xl"
                  placeholder={t('saxo.password_placeholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
              <PasswordStrength password={newPassword} t={t} />
            </div>
            
            <Button className="w-full h-14 bg-gradient-to-r from-[#8b5cf6] to-[#22d3ee] hover:opacity-90 text-white font-medium text-lg rounded-xl">
              {t('saxo.reset_password')}
            </Button>
            
            <div className="flex items-center justify-center mt-6">
              <button
                type="button"
                onClick={() => onNavigate("login")}
                className="text-[#22d3ee] text-sm hover:underline"
              >
                {t('saxo.back_to_login')}
              </button>
            </div>
          </div>
        </div>
        
        <div className="px-4 pb-8">
          <p className="text-center text-muted-foreground text-xs">
            {t('saxo.copyright')}
          </p>
        </div>
      </div>
    </div>
  )
}

export function AuthPages({ onClose, onLoginSuccess, initialView = "login" }: AuthPagesProps) {
  const { i18n } = useTranslation()
  const [view, setView] = useState<AuthView>(initialView)
  const [selectedLang, setSelectedLang] = useState(i18n.language || "zh-TW")
  const [showLanguage, setShowLanguage] = useState(false)
  
  const handleLanguageSelect = (code: string) => {
    setSelectedLang(code)
    i18n.changeLanguage(code)
  }
  
  if (showLanguage) {
    return (
      <LanguageView
        selectedLang={selectedLang}
        onSelect={handleLanguageSelect}
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
          onLoginSuccess={onLoginSuccess}
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
