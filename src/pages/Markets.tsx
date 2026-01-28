import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import { MarketList } from "@/components/market/MarketList";
import { NoticeMarquee } from "@/components/market/NoticeMarquee";

export default function Markets() {
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
        {/* 跑馬燈公告 */}
        <NoticeMarquee />

        {/* 標題 */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl lg:text-2xl font-bold">{t('markets.title')}</h1>
        </div>

        <MarketList category="crypto" />
      </div>
    </AppLayout>
  );
}
