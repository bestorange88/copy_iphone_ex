import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Receipt } from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  currency: string;
  amount: number;
  status: string;
  created_at: string;
  tx_hash?: string;
}

export function TransactionHistory() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      // 获取充值记录
      const { data: deposits } = await supabase
        .from('deposit_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // 获取提现记录
      const { data: withdrawals } = await supabase
        .from('withdraw_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // 合并并排序
      const allTransactions: Transaction[] = [
        ...(deposits || []).map(d => ({
          id: d.id,
          type: 'deposit',
          currency: d.coin_symbol,
          amount: d.amount,
          status: d.status,
          created_at: d.created_at,
          tx_hash: d.tx_hash,
        })),
        ...(withdrawals || []).map(w => ({
          id: w.id,
          type: 'withdraw',
          currency: w.coin_symbol,
          amount: w.amount,
          status: w.status,
          created_at: w.created_at,
          tx_hash: w.tx_hash,
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTransactions(allTransactions);
    } catch (error) {
      console.error("Failed to load transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      completed: "default",
      failed: "destructive",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "outline"} className="text-[10px] lg:text-xs px-1.5 lg:px-2">{t(`common.${status}`)}</Badge>;
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
      <CardHeader className="py-3 lg:py-4">
        <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
          <Receipt className="h-4 w-4 lg:h-5 lg:w-5" />
          {t('assets.transactions')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 lg:p-6">
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t('assets.no_transactions')}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 lg:mx-0">
            <Table>
              <TableHeader>
                <TableRow className="text-[10px] lg:text-sm">
                  <TableHead className="py-2 lg:py-3">{t('common.time')}</TableHead>
                  <TableHead className="py-2 lg:py-3">{t('assets.type')}</TableHead>
                  <TableHead className="py-2 lg:py-3">{t('assets.currency')}</TableHead>
                  <TableHead className="text-right py-2 lg:py-3">{t('assets.amount')}</TableHead>
                  <TableHead className="py-2 lg:py-3">{t('common.status')}</TableHead>
                  <TableHead className="max-w-[120px] lg:max-w-[200px] py-2 lg:py-3">TX Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="text-[11px] lg:text-sm">
                    <TableCell className="whitespace-nowrap py-2 lg:py-3">
                      {new Date(tx.created_at).toLocaleString('zh-CN', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </TableCell>
                    <TableCell className="py-2 lg:py-3">
                      <Badge variant={tx.type === 'deposit' ? 'default' : 'secondary'} className="text-[10px] lg:text-xs px-1.5 lg:px-2">
                        {t(`assets.${tx.type}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 lg:py-3">{tx.currency}</TableCell>
                    <TableCell className="text-right font-medium py-2 lg:py-3">
                      {tx.type === 'deposit' ? '+' : '-'}{tx.amount}
                    </TableCell>
                    <TableCell className="py-2 lg:py-3">{getStatusBadge(tx.status)}</TableCell>
                    <TableCell className="font-mono text-[9px] lg:text-xs truncate max-w-[120px] lg:max-w-[200px] py-2 lg:py-3">
                      {tx.tx_hash || '-'}
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
