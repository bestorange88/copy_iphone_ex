import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRightLeft, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

interface Transfer {
  id: string;
  from_account: string;
  to_account: string;
  currency: string;
  amount: number;
  status: string;
  created_at: string;
}

export function TransferHistory() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadTransfers();
    }
  }, [user]);

  const loadTransfers = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_transfers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error("Failed to load transfers:", error);
        return;
      }

      setTransfers(data || []);
    } catch (error) {
      console.error("Failed to load transfers:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTransfers();
  };

  const getAccountLabel = (account: string) => {
    const accountMap: Record<string, string> = {
      spot: t('assets.spot_account'),
      futures: t('assets.futures_account'),
      earn: t('assets.earn_account'),
    };
    return accountMap[account] || account;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3 lg:py-4">
        <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
          <ArrowRightLeft className="h-4 w-4 lg:h-5 lg:w-5" />
          {t('assets.transfers')}
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="p-2 lg:p-6">
        {transfers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t('assets.no_transfers')}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 lg:mx-0">
            <Table>
              <TableHeader>
                <TableRow className="text-[10px] lg:text-sm">
                  <TableHead className="py-2 lg:py-3">{t('common.time')}</TableHead>
                  <TableHead className="py-2 lg:py-3">{t('assets.from_account')}</TableHead>
                  <TableHead className="py-2 lg:py-3">{t('assets.to_account')}</TableHead>
                  <TableHead className="py-2 lg:py-3">{t('assets.currency')}</TableHead>
                  <TableHead className="text-right py-2 lg:py-3">{t('assets.amount')}</TableHead>
                  <TableHead className="py-2 lg:py-3">{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer) => (
                  <TableRow key={transfer.id} className="text-[11px] lg:text-sm">
                    <TableCell className="whitespace-nowrap py-2 lg:py-3">
                      {new Date(transfer.created_at).toLocaleString('zh-CN', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </TableCell>
                    <TableCell className="py-2 lg:py-3">
                      <Badge variant="outline" className="text-[10px] lg:text-xs">
                        {getAccountLabel(transfer.from_account)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 lg:py-3">
                      <Badge variant="outline" className="text-[10px] lg:text-xs">
                        {getAccountLabel(transfer.to_account)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 lg:py-3">{transfer.currency}</TableCell>
                    <TableCell className="text-right font-medium py-2 lg:py-3">
                      {transfer.amount}
                    </TableCell>
                    <TableCell className="py-2 lg:py-3">
                      <Badge variant="default" className="text-[10px] lg:text-xs">
                        {t(`common.${transfer.status}`)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
