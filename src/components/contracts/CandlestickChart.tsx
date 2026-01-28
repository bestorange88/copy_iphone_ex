import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings2, TrendingUp, BarChart3, Activity, Layers } from "lucide-react";

interface CandlestickChartProps {
  symbol: string;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

// Available technical indicators
const AVAILABLE_INDICATORS = [
  { id: "MASimple@tv-basicstudies", name: "MA", fullName: "Moving Average", category: "trend" },
  { id: "MAExp@tv-basicstudies", name: "EMA", fullName: "Exponential MA", category: "trend" },
  { id: "BB@tv-basicstudies", name: "BB", fullName: "Bollinger Bands", category: "trend" },
  { id: "MACD@tv-basicstudies", name: "MACD", fullName: "MACD", category: "momentum" },
  { id: "RSI@tv-basicstudies", name: "RSI", fullName: "Relative Strength Index", category: "momentum" },
  { id: "Stochastic@tv-basicstudies", name: "Stoch", fullName: "Stochastic", category: "momentum" },
  { id: "Volume@tv-basicstudies", name: "Vol", fullName: "Volume", category: "volume" },
  { id: "VWAP@tv-basicstudies", name: "VWAP", fullName: "Volume Weighted Avg Price", category: "volume" },
  { id: "ATR@tv-basicstudies", name: "ATR", fullName: "Average True Range", category: "volatility" },
  { id: "IchimokuCloud@tv-basicstudies", name: "Ichimoku", fullName: "Ichimoku Cloud", category: "trend" },
];

// Time intervals
const TIME_INTERVALS = [
  { value: "1", label: "1m" },
  { value: "5", label: "5m" },
  { value: "15", label: "15m" },
  { value: "30", label: "30m" },
  { value: "60", label: "1H" },
  { value: "240", label: "4H" },
  { value: "D", label: "1D" },
  { value: "W", label: "1W" },
];

export const CandlestickChart = ({ symbol }: CandlestickChartProps) => {
  const { i18n, t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const containerIdRef = useRef<string>(`tv_contract_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const widgetRef = useRef<any>(null);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(["MASimple@tv-basicstudies", "Volume@tv-basicstudies"]);
  const [selectedInterval, setSelectedInterval] = useState("15");
  
  // Map i18next language codes to TradingView locale codes
  const getTradingViewLocale = (lang: string) => {
    const localeMap: Record<string, string> = {
      'zh-CN': 'zh_CN',
      'zh-TW': 'zh_TW',
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

  const toggleIndicator = (indicatorId: string) => {
    setSelectedIndicators(prev => {
      if (prev.includes(indicatorId)) {
        return prev.filter(id => id !== indicatorId);
      } else {
        return [...prev, indicatorId];
      }
    });
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

    // Convert symbol format (BTC-USDT -> BTCUSDT)
    const tvSymbol = symbol.replace('-', '');
    
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

    // Detect mobile
    const isMobile = window.innerWidth < 1024;
    const chartHeight = isMobile ? 280 : 350;

    try {
      setHasError(false);
      // Create TradingView Advanced Chart Widget
      widgetRef.current = new window.TradingView.widget({
        width: containerRef.current.offsetWidth || 800,
        height: chartHeight,
        symbol: `OKX:${tvSymbol}.P`, // .P for perpetual contracts
        interval: selectedInterval,
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
        studies: selectedIndicators,
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
  }, [symbol, isLibraryLoaded, i18n.language, resolvedTheme, selectedIndicators, selectedInterval]);

  if (!isLibraryLoaded || hasError) {
    return (
      <Card className="p-0 overflow-hidden">
        <div className="w-full h-[280px] lg:h-[350px] flex items-center justify-center">
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
                <p className="text-sm text-muted-foreground">{t('trade.loading_chart', '載入圖表中...')}</p>
              </>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      {/* Chart Toolbar */}
      <div className="flex items-center justify-between gap-2 p-2 border-b border-border bg-muted/30">
        {/* Time Intervals */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {TIME_INTERVALS.map((interval) => (
            <Button
              key={interval.value}
              variant={selectedInterval === interval.value ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2 text-[10px] lg:text-xs"
              onClick={() => setSelectedInterval(interval.value)}
            >
              {interval.label}
            </Button>
          ))}
        </div>

        {/* Indicators Dropdown */}
        <div className="flex items-center gap-2">
          {/* Selected Indicators Badges */}
          <div className="hidden lg:flex items-center gap-1">
            {selectedIndicators.slice(0, 3).map((id) => {
              const indicator = AVAILABLE_INDICATORS.find(i => i.id === id);
              return indicator ? (
                <Badge key={id} variant="secondary" className="text-[10px] px-1.5">
                  {indicator.name}
                </Badge>
              ) : null;
            })}
            {selectedIndicators.length > 3 && (
              <Badge variant="secondary" className="text-[10px] px-1.5">
                +{selectedIndicators.length - 3}
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 px-2 gap-1">
                <Settings2 className="h-3 w-3" />
                <span className="text-[10px] lg:text-xs">{t('contracts.indicators', 'Indicators')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3" />
                {t('contracts.trend_indicators', 'Trend')}
              </DropdownMenuLabel>
              {AVAILABLE_INDICATORS.filter(i => i.category === 'trend').map((indicator) => (
                <DropdownMenuCheckboxItem
                  key={indicator.id}
                  checked={selectedIndicators.includes(indicator.id)}
                  onCheckedChange={() => toggleIndicator(indicator.id)}
                >
                  <span className="font-medium">{indicator.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">({indicator.fullName})</span>
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-2">
                <Activity className="h-3 w-3" />
                {t('contracts.momentum_indicators', 'Momentum')}
              </DropdownMenuLabel>
              {AVAILABLE_INDICATORS.filter(i => i.category === 'momentum').map((indicator) => (
                <DropdownMenuCheckboxItem
                  key={indicator.id}
                  checked={selectedIndicators.includes(indicator.id)}
                  onCheckedChange={() => toggleIndicator(indicator.id)}
                >
                  <span className="font-medium">{indicator.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">({indicator.fullName})</span>
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-2">
                <BarChart3 className="h-3 w-3" />
                {t('contracts.volume_indicators', 'Volume')}
              </DropdownMenuLabel>
              {AVAILABLE_INDICATORS.filter(i => i.category === 'volume').map((indicator) => (
                <DropdownMenuCheckboxItem
                  key={indicator.id}
                  checked={selectedIndicators.includes(indicator.id)}
                  onCheckedChange={() => toggleIndicator(indicator.id)}
                >
                  <span className="font-medium">{indicator.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">({indicator.fullName})</span>
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-2">
                <Layers className="h-3 w-3" />
                {t('contracts.volatility_indicators', 'Volatility')}
              </DropdownMenuLabel>
              {AVAILABLE_INDICATORS.filter(i => i.category === 'volatility').map((indicator) => (
                <DropdownMenuCheckboxItem
                  key={indicator.id}
                  checked={selectedIndicators.includes(indicator.id)}
                  onCheckedChange={() => toggleIndicator(indicator.id)}
                >
                  <span className="font-medium">{indicator.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">({indicator.fullName})</span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chart Container */}
      <div 
        ref={containerRef}
        id={containerIdRef.current}
        className="w-full h-[280px] lg:h-[350px]"
      />
    </Card>
  );
};
