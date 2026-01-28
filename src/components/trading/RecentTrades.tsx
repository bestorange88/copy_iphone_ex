import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const generateTrades = () => {
  return Array.from({ length: 15 }, (_, i) => ({
    price: (43251.80 + (Math.random() - 0.5) * 100).toFixed(2),
    amount: (Math.random() * 0.5).toFixed(4),
    time: new Date(Date.now() - i * 60000).toLocaleTimeString(),
    type: Math.random() > 0.5 ? 'buy' : 'sell'
  }));
};

export const RecentTrades = () => {
  const { t } = useTranslation();
  const trades = generateTrades();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 pt-3 lg:pt-6 px-3 lg:px-6">
        <CardTitle className="text-sm lg:text-base font-medium">{t('trade.recent_trades')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-0 flex-1 overflow-hidden flex flex-col">
        <div className="px-2 lg:px-4 py-1 lg:py-2 grid grid-cols-3 gap-1 lg:gap-4 text-[9px] lg:text-xs text-muted-foreground border-b border-border">
          <div className="truncate">{t('trade.price')}</div>
          <div className="text-right truncate">{t('trade.amount')}</div>
          <div className="text-right truncate">{t('trade.time')}</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {trades.map((trade, i) => (
            <div 
              key={i} 
              className="px-2 lg:px-4 py-0.5 lg:py-2 grid grid-cols-3 gap-1 lg:gap-4 text-[9px] lg:text-xs hover:bg-accent transition-colors"
            >
              <div className={`font-medium truncate ${trade.type === 'buy' ? 'text-success' : 'text-destructive'}`}>
                {trade.price}
              </div>
              <div className="text-right truncate">{trade.amount}</div>
              <div className="text-right text-muted-foreground truncate text-[8px] lg:text-xs">{trade.time}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
