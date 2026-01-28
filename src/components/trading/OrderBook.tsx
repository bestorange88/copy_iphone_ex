import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface OrderBookProps {
  pair: string;
}

const generateOrders = (type: 'buy' | 'sell') => {
  const basePrice = 43251.80;
  return Array.from({ length: 10 }, (_, i) => {
    const offset = type === 'buy' ? -(i + 1) * 10 : (i + 1) * 10;
    return {
      price: (basePrice + offset).toFixed(2),
      amount: (Math.random() * 2).toFixed(4),
      total: ((basePrice + offset) * Math.random() * 2).toFixed(2)
    };
  });
};

export const OrderBook = ({ pair }: OrderBookProps) => {
  const { t } = useTranslation();
  const sellOrders = generateOrders('sell');
  const buyOrders = generateOrders('buy');

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 pt-3 lg:pt-6 px-3 lg:px-6">
        <CardTitle className="text-sm lg:text-base font-medium">{t('trade.order_book')}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col p-0 pb-0">
        <div className="px-2 lg:px-4 py-1 lg:py-2 grid grid-cols-3 gap-1 lg:gap-2 text-[9px] lg:text-xs text-muted-foreground border-b border-border">
          <div className="truncate">{t('trade.price')}</div>
          <div className="text-right truncate">{t('trade.amount')}</div>
          <div className="text-right truncate">{t('trade.total')}</div>
        </div>

        {/* Sell Orders */}
        <div className="flex-1 overflow-y-auto px-2 lg:px-4">
          {sellOrders.reverse().map((order, i) => (
            <div key={`sell-${i}`} className="grid grid-cols-3 gap-1 lg:gap-2 text-[9px] lg:text-xs py-0.5 hover:bg-destructive/5 transition-colors">
              <div className="text-destructive font-medium truncate">{order.price}</div>
              <div className="text-right truncate">{order.amount}</div>
              <div className="text-right text-muted-foreground truncate">{order.total}</div>
            </div>
          ))}
        </div>

        {/* Current Price */}
        <div className="px-2 lg:px-4 py-1.5 lg:py-3 bg-accent border-y border-border">
          <div className="text-xs lg:text-lg font-bold text-success">43,251.80</div>
          <div className="text-[9px] lg:text-xs text-muted-foreground">≈ 43,251.80 USDT</div>
        </div>

        {/* Buy Orders */}
        <div className="flex-1 overflow-y-auto px-2 lg:px-4">
          {buyOrders.map((order, i) => (
            <div key={`buy-${i}`} className="grid grid-cols-3 gap-1 lg:gap-2 text-[9px] lg:text-xs py-0.5 hover:bg-success/5 transition-colors">
              <div className="text-success font-medium truncate">{order.price}</div>
              <div className="text-right truncate">{order.amount}</div>
              <div className="text-right text-muted-foreground truncate">{order.total}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
