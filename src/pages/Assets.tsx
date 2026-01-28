import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetOverview } from "@/components/assets/AssetOverview";
import { OrderHistory } from "@/components/assets/OrderHistory";
import { TransferHistory } from "@/components/assets/TransferHistory";
import { TransactionHistory } from "@/components/assets/TransactionHistory";
import AppLayout from "@/components/layout/AppLayout";
import { ClipboardList, ArrowRightLeft, Receipt } from "lucide-react";

export default function Assets() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-4 lg:space-y-6 mb-20 lg:mb-0 px-2 lg:px-0">
        <AssetOverview />

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto bg-muted/30 p-1">
            <TabsTrigger value="orders" className="gap-1.5 text-[10px] lg:text-sm px-2 lg:px-4 data-[state=active]:bg-background">
              <ClipboardList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('assets.orders')}</span>
            </TabsTrigger>
            <TabsTrigger value="transfers" className="gap-1.5 text-[10px] lg:text-sm px-2 lg:px-4 data-[state=active]:bg-background">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('assets.transfers')}</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-1.5 text-[10px] lg:text-sm px-2 lg:px-4 data-[state=active]:bg-background">
              <Receipt className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('assets.transactions')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-4">
            <OrderHistory />
          </TabsContent>

          <TabsContent value="transfers" className="mt-4">
            <TransferHistory />
          </TabsContent>

          <TabsContent value="transactions" className="mt-4">
            <TransactionHistory />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
