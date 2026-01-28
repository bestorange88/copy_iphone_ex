

import { useState } from "react"
import { ChevronLeft, Camera, Upload, User, Calendar, FileText, CreditCard, Car, Globe, ChevronDown, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FloatingParticles } from "./floating-particles"

// Personal Info Page
export function PersonalInfoPage({ onBack }: { onBack: () => void }) {
  const [nickname, setNickname] = useState("旭陽高照")
  
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <FloatingParticles />
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 relative z-10">
        <button type="button" onClick={onBack} className="text-foreground">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-medium text-foreground">個人資訊</h1>
        <div className="w-6" />
      </div>
      
      <div className="px-4 relative z-10">
        <div className="bg-[#1e293b]/80 rounded-xl p-6 border border-border/30">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-[#f5d0c5] flex items-center justify-center">
                <span className="text-3xl text-[#d4a59a]">旭</span>
              </div>
              <button 
                type="button"
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#3b82f6] flex items-center justify-center"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>
            <p className="text-muted-foreground text-sm mt-3">點擊相機按鈕更換頭像</p>
          </div>
          
          {/* Form */}
          <div className="space-y-5">
            <div>
              <label className="text-foreground text-sm mb-2 block">暱稱</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full bg-[#0f172a] border border-border/50 rounded-lg px-4 py-3 text-foreground"
                maxLength={20}
              />
              <p className="text-muted-foreground text-xs mt-1">{nickname.length}/20</p>
            </div>
            
            <div>
              <label className="text-foreground text-sm mb-2 block">使用者名稱</label>
              <input
                type="text"
                value="xuyang01"
                disabled
                className="w-full bg-[#0f172a]/50 border border-border/30 rounded-lg px-4 py-3 text-muted-foreground"
              />
            </div>
            
            <div>
              <label className="text-foreground text-sm mb-2 block">ID</label>
              <input
                type="text"
                value="82536060"
                disabled
                className="w-full bg-[#0f172a]/50 border border-border/30 rounded-lg px-4 py-3 text-muted-foreground"
              />
            </div>
          </div>
          
          {/* Save Button */}
          <Button className="w-full mt-8 bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] hover:from-[#5558e8] hover:to-[#7c4fe0] text-white py-6">
            保存資訊
          </Button>
        </div>
      </div>
    </div>
  )
}

// User Verification Page
export function UserVerificationPage({ onBack }: { onBack: () => void }) {
  const [docType, setDocType] = useState("id")
  const [idNumber, setIdNumber] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [realName, setRealName] = useState("")
  
  const docTypes = [
    { id: "id", label: "身份證", icon: CreditCard },
    { id: "passport", label: "護照", icon: Globe },
    { id: "driver", label: "駕駛證", icon: Car },
    { id: "other", label: "其他", icon: FileText },
  ]
  
  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-6">
      <FloatingParticles />
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 relative z-10">
        <button type="button" onClick={onBack} className="text-foreground">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-medium text-foreground">用戶認證</h1>
        <User className="w-6 h-6 text-foreground" />
      </div>
      
      <div className="px-4 relative z-10">
        {/* Document Type Selection */}
        <div className="mb-6">
          <p className="text-foreground mb-3">選擇證件類型</p>
          <div className="grid grid-cols-4 gap-2">
            {docTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setDocType(type.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${
                  docType === type.id 
                    ? "bg-[#6366f1]/20 border-[#6366f1]" 
                    : "bg-[#1e293b]/50 border-border/30"
                }`}
              >
                <type.icon className={`w-5 h-5 ${docType === type.id ? "text-[#6366f1]" : "text-muted-foreground"}`} />
                <span className={`text-xs ${docType === type.id ? "text-foreground" : "text-muted-foreground"}`}>
                  {type.label}
                </span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Form */}
        <div className="bg-[#1e293b]/80 rounded-xl p-4 border border-border/30 space-y-5">
          <h3 className="text-foreground font-medium">填寫證件信息</h3>
          
          <div>
            <label className="text-foreground text-sm mb-2 block">證件號碼</label>
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="證件號碼"
              className="w-full bg-[#0f172a] border border-border/50 rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          
          <div>
            <label className="text-foreground text-sm mb-2 block">出生日期</label>
            <div className="relative">
              <input
                type="text"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                placeholder="年 /月 /日"
                className="w-full bg-[#0f172a] border border-border/50 rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            </div>
          </div>
          
          <div>
            <label className="text-foreground text-sm mb-2 block">真實姓名</label>
            <input
              type="text"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              placeholder="真實姓名"
              className="w-full bg-[#0f172a] border border-border/50 rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          
          {/* Front Photo Upload */}
          <div>
            <label className="text-foreground text-sm mb-2 block">證件正面照片</label>
            <div className="border-2 border-dashed border-border/50 rounded-xl p-8 flex flex-col items-center justify-center bg-[#0f172a]/50">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-sm">點擊上傳</p>
              <p className="text-muted-foreground text-xs mt-1">支持JPG、PNG、WEBP格式</p>
            </div>
          </div>
          
          {/* Back Photo Upload */}
          <div>
            <label className="text-foreground text-sm mb-2 block">證件反面照片</label>
            <div className="border-2 border-dashed border-border/50 rounded-xl p-8 flex flex-col items-center justify-center bg-[#0f172a]/50">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-sm">點擊上傳</p>
              <p className="text-muted-foreground text-xs mt-1">支持JPG、PNG、WEBP格式</p>
            </div>
          </div>
        </div>
        
        {/* Submit Button */}
        <Button className="w-full mt-6 bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] hover:from-[#5558e8] hover:to-[#7c4fe0] text-white py-6 flex items-center justify-center gap-2">
          <Upload className="w-5 h-5" />
          提交認證申請
        </Button>
      </div>
    </div>
  )
}

// Platform Loan Page
type LoanStep = "main" | "step1" | "step2" | "step3"

export function PlatformLoanPage({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<LoanStep>("main")
  const [loanTerm, setLoanTerm] = useState("30")
  const [loanAmount, setLoanAmount] = useState("")
  
  // Main empty state
  if (step === "main") {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <FloatingParticles />
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 relative z-10">
          <button type="button" onClick={onBack} className="text-foreground">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-medium text-foreground">平台貸款</h1>
          <User className="w-6 h-6 text-foreground" />
        </div>
        
        <div className="px-4 relative z-10">
          <div className="bg-[#1e293b]/80 rounded-xl p-8 border border-border/30 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-[#374151] flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-foreground text-lg font-medium mb-2">暫無貸款記錄</h3>
            <p className="text-muted-foreground text-sm mb-6">您當前沒有任何貸款記錄</p>
            
            <Button 
              onClick={() => setStep("step1")}
              className="w-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] hover:from-[#5558e8] hover:to-[#7c4fe0] text-white py-6"
            >
              + 立即申請貸款
            </Button>
          </div>
        </div>
      </div>
    )
  }
  
  // Progress indicator component
  const ProgressIndicator = ({ currentStep }: { currentStep: number }) => (
    <div className="flex items-center justify-between px-4 mb-6">
      {[
        { num: 1, label: "基本信息", icon: User },
        { num: 2, label: "貸款信息", icon: CreditCard },
        { num: 3, label: "資料上傳", icon: FileText },
      ].map((s, i) => (
        <div key={s.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              currentStep >= s.num ? "bg-[#6366f1]" : "bg-[#374151]"
            }`}>
              <s.icon className={`w-5 h-5 ${currentStep >= s.num ? "text-white" : "text-muted-foreground"}`} />
            </div>
            <span className={`text-xs mt-1 ${currentStep >= s.num ? "text-foreground" : "text-muted-foreground"}`}>
              {s.label}
            </span>
          </div>
          {i < 2 && (
            <div className={`w-16 h-1 mx-2 ${currentStep > s.num ? "bg-[#6366f1]" : "bg-[#374151]"}`} />
          )}
        </div>
      ))}
    </div>
  )
  
  // Step 1: Basic Info
  if (step === "step1") {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden pb-24">
        <FloatingParticles />
        
        <div className="flex items-center justify-between px-4 py-4 relative z-10">
          <button type="button" onClick={() => setStep("main")} className="text-foreground">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-medium text-foreground">步驟 1/3</h1>
          <User className="w-6 h-6 text-foreground" />
        </div>
        
        <div className="relative z-10">
          <ProgressIndicator currentStep={1} />
          
          <div className="px-4">
            <div className="bg-[#1e293b]/80 rounded-xl p-4 border border-border/30 space-y-4">
              <h3 className="text-foreground font-medium">基本信息</h3>
              
              <div>
                <label className="text-foreground text-sm mb-2 block">姓名</label>
                <input
                  type="text"
                  placeholder="請輸入真實姓名"
                  className="w-full bg-[#0f172a] border border-border/50 rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground"
                />
              </div>
              
              <div>
                <label className="text-foreground text-sm mb-2 block">身份證號</label>
                <input
                  type="text"
                  placeholder="請輸入身份證號"
                  className="w-full bg-[#0f172a] border border-border/50 rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground"
                />
              </div>
              
              <div>
                <label className="text-foreground text-sm mb-2 block">聯繫電話</label>
                <input
                  type="text"
                  placeholder="請輸入聯繫電話"
                  className="w-full bg-[#0f172a] border border-border/50 rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="fixed bottom-6 left-4 right-4 z-20">
          <Button 
            onClick={() => setStep("step2")}
            className="w-full bg-gradient-to-r from-[#6366f1] to-[#22d3ee] hover:from-[#5558e8] hover:to-[#1eb8cc] text-white py-6"
          >
            下一步
          </Button>
        </div>
      </div>
    )
  }
  
  // Step 2: Loan Info
  if (step === "step2") {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden pb-24">
        <FloatingParticles />
        
        <div className="flex items-center justify-between px-4 py-4 relative z-10">
          <button type="button" onClick={() => setStep("step1")} className="text-foreground">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-medium text-foreground">步驟 2/3</h1>
          <User className="w-6 h-6 text-foreground" />
        </div>
        
        <div className="relative z-10">
          <ProgressIndicator currentStep={2} />
          
          <div className="px-4">
            <div className="bg-[#1e293b]/80 rounded-xl p-4 border border-border/30 space-y-5">
              <h3 className="text-foreground font-medium">貸款信息</h3>
              
              <div>
                <label className="text-foreground text-sm mb-2 block">貸款期限</label>
                <div className="relative">
                  <select
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(e.target.value)}
                    className="w-full bg-[#0f172a] border border-border/50 rounded-lg px-4 py-3 text-foreground appearance-none"
                  >
                    <option value="7">7 天</option>
                    <option value="14">14 天</option>
                    <option value="30">30 天</option>
                    <option value="60">60 天</option>
                    <option value="90">90 天</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                </div>
              </div>
              
              <div>
                <label className="text-foreground text-sm mb-2 block">申請貸款額度</label>
                <input
                  type="text"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  placeholder="請輸入申請額度"
                  className="w-full bg-[#0f172a] border border-border/50 rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground"
                />
                <p className="text-muted-foreground text-xs mt-1">額度範圍:1,000.00 ~ 200,000.00 USDT</p>
              </div>
              
              {/* Info Table */}
              <div className="bg-[#0f172a]/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">每日利率</span>
                  <span className="text-foreground text-sm">0.0658 %</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">手續費</span>
                  <span className="text-foreground text-sm">0.20 %</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">本息合計</span>
                  <span className="text-foreground text-sm">0.00 USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">違約金比例</span>
                  <span className="text-[#22d3ee] text-sm">0.03 %/天</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="fixed bottom-6 left-4 right-4 z-20">
          <Button 
            onClick={() => setStep("step3")}
            className="w-full bg-gradient-to-r from-[#6366f1] to-[#22d3ee] hover:from-[#5558e8] hover:to-[#1eb8cc] text-white py-6"
          >
            下一步
          </Button>
        </div>
      </div>
    )
  }
  
  // Step 3: Document Upload
  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-24">
      <FloatingParticles />
      
      <div className="flex items-center justify-between px-4 py-4 relative z-10">
        <button type="button" onClick={() => setStep("step2")} className="text-foreground">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-medium text-foreground">步驟 3/3</h1>
        <User className="w-6 h-6 text-foreground" />
      </div>
      
      <div className="relative z-10">
        <ProgressIndicator currentStep={3} />
        
        <div className="px-4">
          <div className="bg-[#1e293b]/80 rounded-xl p-4 border border-border/30 space-y-5">
            <h3 className="text-foreground font-medium">資料上傳</h3>
            
            {/* Front Photo */}
            <div>
              <label className="text-foreground text-sm mb-2 block">證件正面照片</label>
              <div className="border-2 border-dashed border-border/50 rounded-xl p-10 flex flex-col items-center justify-center bg-[#f8fafc]">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">點擊上傳</p>
                <p className="text-muted-foreground text-xs mt-1">支持JPG、PNG、WEBP格式</p>
              </div>
            </div>
            
            {/* Back Photo */}
            <div>
              <label className="text-foreground text-sm mb-2 block">證件反面照片</label>
              <div className="border-2 border-dashed border-border/50 rounded-xl p-10 flex flex-col items-center justify-center bg-[#f8fafc]">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">點擊上傳</p>
                <p className="text-muted-foreground text-xs mt-1">支持JPG、PNG、WEBP格式</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="fixed bottom-6 left-4 right-4 z-20 flex gap-3">
        <Button 
          onClick={() => setStep("step2")}
          variant="outline"
          className="flex-1 bg-transparent border-border/50 text-foreground py-6"
        >
          上一步
        </Button>
        <Button 
          onClick={() => setStep("main")}
          className="flex-1 bg-gradient-to-r from-[#6366f1] to-[#22d3ee] hover:from-[#5558e8] hover:to-[#1eb8cc] text-white py-6"
        >
          提交申請
        </Button>
      </div>
    </div>
  )
}

// Trading Records Page
export function TradingRecordsPage({ onBack }: { onBack: () => void }) {
  const trades = [
    { id: 1, asset: "London Silver", type: "買漲", duration: "30 秒", rate: "40.00%", profit: 2000, openPrice: "95.47", closePrice: "95.48", time: "2026/01/22 23:36:10", orderId: "20260123003610175" },
    { id: 2, asset: "London Silver", type: "買漲", duration: "60 秒", rate: "50.00%", profit: 2500, openPrice: "95.53", closePrice: "95.54", time: "2026/01/22 23:26:42", orderId: "20260123002642450" },
    { id: 3, asset: "London Silver", type: "買跌", duration: "30 秒", rate: "40.00%", profit: 2000, openPrice: "95.57", closePrice: "95.54", time: "2026/01/22 23:25:35", orderId: "20260123002535763" },
  ]
  
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <FloatingParticles />
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 relative z-10">
        <button type="button" onClick={onBack} className="text-foreground">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-medium text-foreground">交易記錄</h1>
        <Filter className="w-5 h-5 text-foreground" />
      </div>
      
      <div className="px-4 relative z-10">
        {/* Stats Card */}
        <div className="bg-[#1e293b]/80 rounded-xl p-4 border border-border/30 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground text-sm">一周合約概覽</span>
            <span className="text-[#22d3ee] text-sm">41.79%</span>
          </div>
          
          {/* Donut Chart */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <svg className="w-32 h-32" viewBox="0 0 100 100">
                {/* Outer ring - red for loss */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ef4444" strokeWidth="12" />
                {/* Inner filled circle for profit */}
                <circle cx="50" cy="50" r="28" fill="#ef4444" />
                <text x="50" y="45" textAnchor="middle" className="text-[8px] fill-white">虧損</text>
                <text x="50" y="58" textAnchor="middle" className="text-[8px] fill-white">盈利</text>
              </svg>
              
              {/* Labels */}
              <div className="absolute -top-2 right-0 text-xs">
                <span className="text-muted-foreground">虧損: </span>
                <span className="text-foreground">0</span>
              </div>
              <div className="absolute top-1/2 -left-14 -translate-y-1/2 text-xs">
                <span className="text-muted-foreground">平倉: </span>
                <span className="text-foreground">0</span>
              </div>
              <div className="absolute -bottom-2 right-0 text-xs">
                <span className="text-muted-foreground">盈利: </span>
                <span className="text-foreground">7</span>
              </div>
            </div>
          </div>
          
          {/* Stats Row */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">訂單數量:7</span>
            <span className="text-[#22c55e]">盈利金額:11,700.00</span>
            <span className="text-[#ef4444]">虧損金額:0.00</span>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex gap-3 mb-4">
          {["全部", "全部", "全部"].map((label, i) => (
            <button
              key={i}
              type="button"
              className="flex items-center gap-1 text-muted-foreground text-sm"
            >
              {label}
              <ChevronDown className="w-4 h-4" />
            </button>
          ))}
        </div>
        
        {/* Trade List */}
        <div className="space-y-3">
          {trades.map((trade) => (
            <div key={trade.id} className="bg-[#1e293b]/80 rounded-xl p-4 border border-border/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#f59e0b] flex items-center justify-center">
                    <span className="text-white text-xs">金</span>
                  </div>
                  <span className="text-foreground font-medium">{trade.asset}</span>
                  <span className="text-[#22c55e] text-xs px-2 py-0.5 bg-[#22c55e]/10 rounded">盈利</span>
                </div>
                <span className="text-[#22c55e] font-medium">+{trade.profit.toLocaleString()}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className={trade.type === "買漲" ? "text-[#22c55e]" : "text-[#ef4444]"}>
                    {trade.type} · {trade.duration}
                  </span>
                </div>
                <div className="text-right text-muted-foreground">
                  開倉價 {trade.openPrice}
                </div>
                <div className="text-muted-foreground">
                  實際收益率 · {trade.rate}
                </div>
                <div className="text-right text-muted-foreground">
                  平倉價 {trade.closePrice}
                </div>
                <div className="text-muted-foreground text-xs">
                  {trade.time}
                </div>
                <div className="text-right text-muted-foreground text-xs">
                  {trade.orderId}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
