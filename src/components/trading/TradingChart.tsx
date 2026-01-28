import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Card } from "@/components/ui/card";

interface TradingChartProps {
  pair: string;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

export const TradingChart = ({ pair }: TradingChartProps) => {
  const { i18n, t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const containerIdRef = useRef<string>(`tv_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const widgetRef = useRef<any>(null);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Map i18next language codes to TradingView locale codes
  const getTradingViewLocale = (lang: string) => {
    const localeMap: Record<string, string> = {
      'zh-CN': 'zh_CN',
      'en': 'en',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'ja': 'ja',
      'ko': 'ko',
      'ar': 'ar'
    };
    return localeMap[lang] || 'en';
  };

  // Check if TradingView library is loaded
  useEffect(() => {
    const checkLibrary = () => {
      if (window.TradingView) {
        setIsLibraryLoaded(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkLibrary()) return;

    // If not loaded, wait for it
    const interval = setInterval(() => {
      if (checkLibrary()) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !isLibraryLoaded || !window.TradingView) {
      return;
    }

    // Clean up previous widget
    if (widgetRef.current) {
      try {
        const activeId = containerIdRef.current;
        const containerPresent = activeId ? document.getElementById(activeId) : null;
        if (containerPresent && widgetRef.current.remove && typeof widgetRef.current.remove === 'function') {
          widgetRef.current.remove();
        }
      } catch (e) {
        console.warn('TradingView widget cleanup skipped:', e);
      }
      widgetRef.current = null;
    }

    // Convert pair format (BTC/USDT -> BTCUSDT)
    const symbol = pair.replace('/', '');
    
    // Determine theme settings
    const isDark = resolvedTheme === 'dark';
    const themeConfig = isDark ? {
      theme: "dark",
      toolbar_bg: "#131722",
      overrides: {
        "paneProperties.background": "#131722",
        "paneProperties.backgroundType": "solid",
        "paneProperties.vertGridProperties.color": "#1e222d",
        "paneProperties.horzGridProperties.color": "#1e222d",
        "scalesProperties.textColor": "#d1d4dc",
        "scalesProperties.lineColor": "#1e222d",
        "mainSeriesProperties.candleStyle.upColor": "#26a69a",
        "mainSeriesProperties.candleStyle.downColor": "#ef5350",
        "mainSeriesProperties.candleStyle.borderUpColor": "#26a69a",
        "mainSeriesProperties.candleStyle.borderDownColor": "#ef5350",
        "mainSeriesProperties.candleStyle.wickUpColor": "#26a69a",
        "mainSeriesProperties.candleStyle.wickDownColor": "#ef5350",
      }
    } : {
      theme: "light",
      toolbar_bg: "#f8f9fa",
      overrides: {
        "paneProperties.background": "#ffffff",
        "paneProperties.backgroundType": "solid",
        "paneProperties.vertGridProperties.color": "#e1e3eb",
        "paneProperties.horzGridProperties.color": "#e1e3eb",
        "scalesProperties.textColor": "#131722",
        "scalesProperties.lineColor": "#e1e3eb",
        "mainSeriesProperties.candleStyle.upColor": "#26a69a",
        "mainSeriesProperties.candleStyle.downColor": "#ef5350",
        "mainSeriesProperties.candleStyle.borderUpColor": "#26a69a",
        "mainSeriesProperties.candleStyle.borderDownColor": "#ef5350",
        "mainSeriesProperties.candleStyle.wickUpColor": "#26a69a",
        "mainSeriesProperties.candleStyle.wickDownColor": "#ef5350",
      }
    };

    try {
      setHasError(false);
      // Create TradingView Advanced Chart Widget
      widgetRef.current = new window.TradingView.widget({
        width: containerRef.current.offsetWidth || 800,
        height: 400,
        symbol: `OKX:${symbol}`,
        interval: "15",
        timezone: "Asia/Shanghai",
        theme: themeConfig.theme,
        style: "1",
        locale: getTradingViewLocale(i18n.language),
        toolbar_bg: themeConfig.toolbar_bg,
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: containerIdRef.current,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: true,
        studies: [
          "MASimple@tv-basicstudies",
          "Volume@tv-basicstudies"
        ],
        overrides: themeConfig.overrides
      });
    } catch (error) {
      console.warn('TradingView widget creation failed:', error);
      setHasError(true);
    }

    return () => {
      if (widgetRef.current) {
        try {
          const activeId = containerIdRef.current;
          const containerPresent = activeId ? document.getElementById(activeId) : null;
          if (containerPresent && widgetRef.current.remove && typeof widgetRef.current.remove === 'function') {
            widgetRef.current.remove();
          }
        } catch (e) {
          console.warn('TradingView widget cleanup skipped:', e);
        } finally {
          widgetRef.current = null;
        }
      }
    };
  }, [pair, isLibraryLoaded, i18n.language, resolvedTheme]);

  if (!isLibraryLoaded || hasError) {
    return (
      <Card className="p-0 overflow-hidden">
        <div className="w-full h-[400px] flex items-center justify-center">
          <div className="text-center space-y-2">
            {hasError ? (
              <>
                <p className="text-sm text-muted-foreground">{t('trade.chart_unavailable', 'Chart temporarily unavailable')}</p>
                <button 
                  onClick={() => setHasError(false)} 
                  className="text-xs text-primary hover:underline"
                >
                  {t('common.retry', 'Retry')}
                </button>
              </>
            ) : (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">{t('trade.loading_chart')}</p>
              </>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div 
        ref={containerRef}
        id={containerIdRef.current}
        className="w-full h-[400px]"
      />
    </Card>
  );
};
