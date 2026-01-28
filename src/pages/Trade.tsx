import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useKycStatus } from "@/hooks/useKycStatus";
import AppLayout from "@/components/layout/AppLayout";
import { TradingChart } from "@/components/trading/TradingChart";
import { OrderBook } from "@/components/trading/OrderBook";
import { MarketStats } from "@/components/trading/MarketStats";
import { RecentTrades } from "@/components/trading/RecentTrades";
import { TradingPairs } from "@/components/trading/TradingPairs";
import { TradeForm } from "@/components/trading/TradeForm";
import { OrderHistory } from "@/components/trading/OrderHistory";
import { KycRequiredGuard } from "@/components/KycRequiredGuard";

const Trade = () => {
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const { user, loading } = useAuth();
  const { hasBasicKyc, loading: kycLoading } = useKycStatus();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || kycLoading || !user) {
    return null;
  }

  // Require basic KYC for trading
  if (!hasBasicKyc) {
    return (
      <AppLayout>
        <KycRequiredGuard requiredLevel="basic">
          <div />
        </KycRequiredGuard>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Market Stats Bar */}
      <MarketStats selectedPair={selectedPair} />

      {/* Main Trading Interface */}
      <div className="mt-4 mb-20 lg:mb-4">
        {/* Mobile: Stacked Layout with improved spacing */}
        <div className="lg:hidden space-y-3">
          <TradingChart pair={selectedPair} />
          
          {/* First Row: Trade Form (60%) + Trading Pairs (40%) */}
          <div className="grid grid-cols-10 gap-3 h-[420px]">
            <div className="col-span-6 h-full">
              <TradeForm 
                pair={selectedPair}
                orderType={orderType}
                onOrderTypeChange={setOrderType}
              />
            </div>
            <div className="col-span-4 h-full">
              <TradingPairs 
                selectedPair={selectedPair}
                onSelectPair={setSelectedPair}
              />
            </div>
          </div>
          
          {/* Second Row: Order Book (50%) + Recent Trades (50%) */}
          <div className="grid grid-cols-2 gap-3">
            <OrderBook pair={selectedPair} />
            <RecentTrades />
          </div>

          {/* Order History */}
          <OrderHistory />
        </div>

        {/* Desktop: Grid Layout */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-4">
          {/* Left Sidebar - Trading Pairs */}
          <div className="lg:col-span-2">
            <TradingPairs 
              selectedPair={selectedPair}
              onSelectPair={setSelectedPair}
            />
          </div>

          {/* Center - Chart, Recent Trades, and Order History */}
          <div className="lg:col-span-7 space-y-4">
            <TradingChart pair={selectedPair} />
            <RecentTrades />
            <OrderHistory />
          </div>

          {/* Right Sidebar - Trade Form and Order Book */}
          <div className="lg:col-span-3 space-y-4">
            <TradeForm 
              pair={selectedPair}
              orderType={orderType}
              onOrderTypeChange={setOrderType}
            />
            <OrderBook pair={selectedPair} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Trade;
