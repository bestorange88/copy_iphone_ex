import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Zap, History, Layers, ArrowLeftRight, LineChart } from "lucide-react";
import { PerpetualTrading } from "@/components/contracts/PerpetualTrading";
import { PerpetualPositions } from "@/components/contracts/PerpetualPositions";
import { SecondContracts } from "@/components/contracts/SecondContracts";
import { SecondContractHistory } from "@/components/contracts/SecondContractHistory";
import { ExpertShowcases } from "@/components/contracts/ExpertShowcases";

type MobileView = "trade" | "chart";

const Contracts = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileView, setMobileView] = useState<MobileView>("trade");
  const [activeTab, setActiveTab] = useState("perpetual");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return null;
  }

  // 移動端：只在永續或分鐘頁籤顯示交易/圖表切換組件
  const showViewToggle = activeTab === "perpetual" || activeTab === "futures";

  return (
    <AppLayout>
      <div className="space-y-6 mb-20 lg:mb-0">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl lg:text-3xl font-bold">{t('contracts.title')}</h1>
          
          {/* 移動端：交易/圖表視圖切換 - 與行情頁面一致的樣式 */}
          {showViewToggle && (
            <div className="flex lg:hidden gap-1 p-0.5 bg-secondary/30 rounded-xl border border-border/50">
              <button
                onClick={() => setMobileView("trade")}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                  mobileView === "trade" 
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <ArrowLeftRight className="h-3 w-3" />
                <span>{t('contracts.trade', '交易')}</span>
              </button>
              <button
                onClick={() => setMobileView("chart")}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                  mobileView === "chart" 
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <LineChart className="h-3 w-3" />
                <span>{t('contracts.chart', '圖表')}</span>
              </button>
            </div>
          )}
        </div>

        <Tabs defaultValue="perpetual" value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* 四個選項卡列 - 移動端和桌面端都顯示 */}
          <TabsList className="grid w-full grid-cols-4 lg:w-[800px]">
            <TabsTrigger value="perpetual" className="gap-1 lg:gap-2 text-xs lg:text-sm px-2 lg:px-4">
              <TrendingUp className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{t('contracts.perpetual_short', t('contracts.perpetual'))}</span>
            </TabsTrigger>
            <TabsTrigger value="positions" className="gap-1 lg:gap-2 text-xs lg:text-sm px-2 lg:px-4">
              <Layers className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{t('contracts.positions_short', t('contracts.positions'))}</span>
            </TabsTrigger>
            <TabsTrigger value="futures" className="gap-1 lg:gap-2 text-xs lg:text-sm px-2 lg:px-4">
              <Zap className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{t('contracts.second_short', t('contracts.second'))}</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 lg:gap-2 text-xs lg:text-sm px-2 lg:px-4">
              <History className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{t('contracts.history_short', t('contracts.history'))}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="perpetual" className="space-y-4 mt-4 lg:mt-6">
            <PerpetualTrading mobileView={mobileView} />
          </TabsContent>

          <TabsContent value="positions" className="space-y-4 mt-4 lg:mt-6">
            <PerpetualPositions />
          </TabsContent>

          <TabsContent value="futures" className="space-y-4 mt-4 lg:mt-6">
            <SecondContracts mobileView={mobileView} />
            <ExpertShowcases />
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4 lg:mt-6">
            <SecondContractHistory />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Contracts;
