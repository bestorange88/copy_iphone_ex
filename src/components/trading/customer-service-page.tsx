

import React from "react"

import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FloatingParticles } from "./floating-particles"

interface CustomerServicePageProps {
  onBack: () => void
}

// LINE Icon Component
function LineIcon({ variant = "bubble" }: { variant?: "bubble" | "square" }) {
  if (variant === "square") {
    return (
      <div className="w-12 h-12 rounded-lg bg-[#06c755] flex items-center justify-center">
        <span className="text-white font-bold text-lg">LINE</span>
      </div>
    )
  }
  
  return (
    <div className="w-12 h-12 relative">
      <svg viewBox="0 0 48 48" className="w-full h-full">
        {/* Chat bubble shape */}
        <path
          d="M24 4C12.954 4 4 11.954 4 22c0 5.627 2.866 10.654 7.342 13.977C10.495 40.195 7 44 7 44s7.5-2 12-5c1.64.324 3.31.5 5 .5 11.046 0 20-7.954 20-17.5S35.046 4 24 4z"
          fill="#06c755"
        />
        {/* LINE text or eyes */}
        <ellipse cx="16" cy="20" rx="2.5" ry="3" fill="white" />
        <ellipse cx="24" cy="20" rx="2.5" ry="3" fill="white" />
        <ellipse cx="32" cy="20" rx="2.5" ry="3" fill="white" />
      </svg>
    </div>
  )
}

// WhatsApp Icon Component
function WhatsAppIcon() {
  return (
    <div className="w-12 h-12 rounded-full bg-[#25d366] flex items-center justify-center">
      <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    </div>
  )
}

// Phone/Call Icon for WhatsApp item
function PhoneCallIcon() {
  return (
    <div className="w-12 h-12 rounded-full bg-[#25d366] flex items-center justify-center">
      <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-current">
        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
      </svg>
    </div>
  )
}

// Service Item Component
function ServiceItem({ 
  name, 
  subtitle,
  icon 
}: { 
  name: string
  subtitle: string
  icon: React.ReactNode 
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-foreground font-medium">{name}</span>
            <span className="text-xs text-[#22c55e]">在線</span>
          </div>
          <span className="text-sm text-muted-foreground">{subtitle}</span>
        </div>
      </div>
      <Button 
        variant="outline" 
        className="border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e]/10 bg-transparent"
      >
        發送消息
      </Button>
    </div>
  )
}

export function CustomerServicePage({ onBack }: CustomerServicePageProps) {
  return (
    <div className="min-h-screen bg-background relative">
      <FloatingParticles />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <button type="button" onClick={onBack}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-medium">平台客服</h1>
          <div className="w-6" />
        </div>
        
        {/* Service Card */}
        <div className="mx-4 mt-4 p-4 rounded-xl bg-card/30 border border-border/50 backdrop-blur-sm">
          {/* LINE Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#06c755] flex items-center justify-center">
                <span className="text-white font-bold text-xs">LINE</span>
              </div>
              <h2 className="text-foreground font-medium">Line 客服</h2>
            </div>
            
            <div className="space-y-2">
              <ServiceItem
                name="line（2）"
                subtitle="誠摯為您服務"
                icon={<LineIcon variant="bubble" />}
              />
              <ServiceItem
                name="line（1）"
                subtitle="誠摯為您服務"
                icon={<LineIcon variant="bubble" />}
              />
            </div>
          </div>
          
          {/* WhatsApp Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <WhatsAppIcon />
              <h2 className="text-foreground font-medium">WhatsApp 客服</h2>
            </div>
            
            <ServiceItem
              name="whatsapp"
              subtitle="誠摯為您服務"
              icon={<PhoneCallIcon />}
            />
          </div>
        </div>
        
        {/* Footer Text */}
        <p className="text-center text-[#22d3ee] text-sm mt-8 px-8">
          專業金融服務，深受全球投資人信賴 30 年，SAXO客服團隊誠摯為您服務
        </p>
      </div>
    </div>
  )
}
