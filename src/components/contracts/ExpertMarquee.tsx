import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Crown, TrendingUp, TrendingDown } from "lucide-react";

interface Showcase {
  id: string;
  expert_name: string;
  symbol: string;
  direction: string;
  leverage: number;
  profit_amount: number;
  profit_percent: number;
}

export const ExpertMarquee = () => {
  const { t } = useTranslation();
  const [showcases, setShowcases] = useState<Showcase[]>([]);

  useEffect(() => {
    fetchShowcases();
  }, []);

  const fetchShowcases = async () => {
    try {
      const { data, error } = await supabase
        .from('expert_showcases')
        .select('id, expert_name, symbol, direction, leverage, profit_amount, profit_percent')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setShowcases(data || []);
    } catch (error) {
      console.error('Error fetching showcases:', error);
    }
  };

  if (showcases.length === 0) return null;

  // Duplicate items for seamless loop
  const items = [...showcases, ...showcases];

  return (
    <div className="relative overflow-hidden bg-muted/30 border border-border/50 rounded-lg py-2 px-3">
      {/* Left fade gradient */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-muted/30 to-transparent z-10 pointer-events-none" />
      
      {/* Right fade gradient */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-muted/30 to-transparent z-10 pointer-events-none" />
      
      {/* Marquee container */}
      <div className="flex items-center gap-2">
        <Crown className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        <span className="text-xs font-medium text-primary flex-shrink-0">
          {t('contracts.showcase.title', '大神曬單')}
        </span>
        <div className="h-3 w-px bg-border/50 flex-shrink-0" />
        
        {/* Scrolling content */}
        <div className="overflow-hidden flex-1">
          <div className="flex animate-marquee whitespace-nowrap">
            {items.map((showcase, index) => (
              <div 
                key={`${showcase.id}-${index}`}
                className="inline-flex items-center gap-2 mx-4"
              >
                <span className="text-xs text-muted-foreground">{showcase.expert_name}</span>
                <span className="text-xs font-medium">{showcase.symbol}</span>
                {showcase.direction === 'long' ? (
                  <span className="inline-flex items-center text-[10px] text-success">
                    <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                    {t('contracts.long', '多')}
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10px] text-destructive">
                    <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                    {t('contracts.short', '空')}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">{showcase.leverage}x</span>
                <span className="text-xs font-bold text-success">
                  +{showcase.profit_percent.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};