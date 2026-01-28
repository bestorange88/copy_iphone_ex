

import { useEffect, useState } from "react"

interface ToastNotificationProps {
  message: string
  type: "success" | "error" | "info"
  visible: boolean
  onHide: () => void
}

export function ToastNotification({ message, type, visible, onHide }: ToastNotificationProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onHide()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [visible, onHide])

  if (!visible) return null

  const bgColor = type === "success" 
    ? "bg-[#22c55e]" 
    : type === "error" 
    ? "bg-[#ef4444]" 
    : "bg-[#3b82f6]"

  return (
    <div className={`absolute top-0 left-0 right-0 z-[100] ${bgColor} py-3 px-4 text-white text-center font-medium animate-in slide-in-from-top duration-300`}>
      {message}
    </div>
  )
}
