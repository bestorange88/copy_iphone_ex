import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TradingViewChartProps {
  symbol?: string;
}

export const TradingViewChart = ({ symbol = "OKX:BTCUSDT" }: TradingViewChartProps) => {
  const { i18n, t } = useTranslation();
  
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
  
  useEffect(() => {
    const container = document.getElementById('tv_chart_widget');
    if (!container) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).TradingView) {
        new (window as any).TradingView.widget({
          container_id: 'tv_chart_widget',
          width: container.offsetWidth || 800,
          height: container.offsetHeight || 400,
          symbol: symbol,
          interval: '60',
          theme: 'dark',
          timezone: 'Asia/Shanghai',
          locale: getTradingViewLocale(i18n.language),
          toolbar_bg: '#1a1d2e',
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          studies: ['MASimple@tv-basicstudies'],
          style: '1'
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      const existingScript = document.querySelector(`script[src="${script.src}"]`);
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [symbol, i18n.language]);

  return (
    <Card className="h-[500px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{t('quant.chart_title')}</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)]">
        <div id="tv_chart_widget" className="w-full h-full" />
      </CardContent>
    </Card>
  );
};
