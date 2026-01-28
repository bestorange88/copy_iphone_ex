import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { ApiKeyManager } from "@/components/settings/ApiKeyManager";
import { WithdrawalAddressManager } from "@/components/settings/WithdrawalAddressManager";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Settings() {
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
      <div className="max-w-4xl mx-auto space-y-4 lg:space-y-6 mb-20 lg:mb-0 px-2 lg:px-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">{t('nav.settings')}</h1>
          <p className="text-sm lg:text-base text-muted-foreground">{t('settings.description')}</p>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general" className="text-xs lg:text-sm">{t('settings.general')}</TabsTrigger>
            <TabsTrigger value="withdrawal-addresses" className="text-xs lg:text-sm truncate">{t('settings.withdrawal_addresses')}</TabsTrigger>
            <TabsTrigger value="api-keys" className="text-xs lg:text-sm">{t('settings.api_keys')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="mt-6">
            <GeneralSettings />
          </TabsContent>
          
          <TabsContent value="withdrawal-addresses" className="mt-6">
            <WithdrawalAddressManager />
          </TabsContent>
          
          <TabsContent value="api-keys" className="mt-6">
            <ApiKeyManager />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
