import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const BANNER_DISMISSED_KEY = "app_download_banner_dismissed";
const BANNER_DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const AppDownloadBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const dismissedAt = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (dismissedAt) {
      const dismissTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissTime < BANNER_DISMISS_DURATION) {
        return; // Still within dismiss period
      }
    }
    setIsVisible(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, Date.now().toString());
    setIsVisible(false);
  };

  const handleDownload = () => {
    navigate("/download");
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-primary/90 to-primary-glow/90 text-primary-foreground px-4 py-2 relative">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
            <Smartphone className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {t('download.bannerTitle', '下載 APP 享受更流暢的交易體驗')}
            </p>
            <p className="text-xs opacity-80 hidden sm:block">
              {t('download.bannerSubtitle', '支援 iOS 和 Android 設備')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleDownload}
            className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs px-3"
          >
            <Download className="h-3 w-3 mr-1" />
            {t('download.bannerButton', '立即下載')}
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
