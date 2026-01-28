import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { fetchOKXTicker, MarketTicker } from "@/services/marketData";

interface MarketStatsProps {
  selectedPair: string;
}

export const MarketStats = ({ selectedPair }: MarketStatsProps) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<MarketTicker | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const ticker = await fetchOKXTicker(selectedPair);
        setStats(ticker);
      } catch (error) {
        console.error('Failed to load market stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 5000);
    
    return () => clearInterval(interval);
  }, [selectedPair]);

  if (!stats) {
    return (
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const isPositive = parseFloat(stats.priceChangePercent) > 0;

  const formatVolume = (volume: string) => {
    const num = parseFloat(volume);
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  return (
    <div className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-8 overflow-x-auto">
          <div>
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
              {selectedPair}
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">${parseFloat(stats.lastPrice).toFixed(2)}</span>
              <span className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
                {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {isPositive ? '+' : ''}{stats.priceChangePercent}%
              </span>
            </div>
          </div>

          <div className="hidden md:block h-10 w-px bg-border" />

          <div className="hidden md:block">
            <div className="text-xs text-muted-foreground mb-1">{t('trade.high')}</div>
            <div className="text-sm font-medium">${parseFloat(stats.high24h).toFixed(2)}</div>
          </div>

          <div className="hidden md:block">
            <div className="text-xs text-muted-foreground mb-1">{t('trade.low')}</div>
            <div className="text-sm font-medium">${parseFloat(stats.low24h).toFixed(2)}</div>
          </div>

          <div className="hidden md:block">
            <div className="text-xs text-muted-foreground mb-1">{t('trade.volume')}</div>
            <div className="text-sm font-medium">{formatVolume(stats.volume24h)} {selectedPair.split('/')[0]}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
