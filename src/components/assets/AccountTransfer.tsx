import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRightLeft, ArrowDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AccountBalance {
  account_type: string;
  currency: string;
  available: number;
}

const ACCOUNT_TYPES = [
  { value: 'spot', labelKey: 'assetOverview.spot' },
  { value: 'futures', labelKey: 'assetOverview.contract' },
  { value: 'earn', labelKey: 'assetOverview.earn' },
];

export function AccountTransfer({ onTransferComplete }: { onTransferComplete?: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [fromAccount, setFromAccount] = useState('spot');
  const [toAccount, setToAccount] = useState('futures');
  const [currency, setCurrency] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [availableBalance, setAvailableBalance] = useState(0);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchBalances();
    }
  }, [open, user]);

  useEffect(() => {
    // Update available balance when from account or currency changes
    const balance = balances.find(
      b => b.account_type === fromAccount && b.currency === currency
    );
    setAvailableBalance(balance?.available || 0);
  }, [fromAccount, currency, balances]);

  const fetchBalances = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_balances')
        .select('account_type, currency, available')
        .eq('user_id', user.id);

      if (error) throw error;
      setBalances(data || []);
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  const getAvailableCurrencies = () => {
    const currencies = new Set<string>();
    balances
      .filter(b => b.account_type === fromAccount && b.available > 0)
      .forEach(b => currencies.add(b.currency));
    return Array.from(currencies);
  };

  const handleSwapAccounts = () => {
    const temp = fromAccount;
    setFromAccount(toAccount);
    setToAccount(temp);
  };

  const handleTransfer = async () => {
    if (!user || !amount) return;

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error(t('assets.transfer.invalid_amount', '無效金額'));
      return;
    }

    if (transferAmount > availableBalance) {
      toast.error(t('assets.transfer.insufficient_balance', '餘額不足'));
      return;
    }

    if (fromAccount === toAccount) {
      toast.error(t('assets.transfer.same_account', '不能轉入相同賬戶'));
      return;
    }

    setSubmitting(true);
    try {
      // Deduct from source account
      const { data: fromBalance, error: fromError } = await supabase
        .from('user_balances')
        .select('id, available, frozen')
        .eq('user_id', user.id)
        .eq('account_type', fromAccount)
        .eq('currency', currency)
        .maybeSingle();

      if (fromError) throw fromError;

      const newFromAvailable = (fromBalance.available || 0) - transferAmount;
      // Note: 'total' is a generated column, only update available and usd_value
      const newFromUsdValue = newFromAvailable + (fromBalance.frozen || 0);

      await supabase
        .from('user_balances')
        .update({ 
          available: newFromAvailable,
          usd_value: currency === 'USDT' ? newFromUsdValue : 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', fromBalance.id);

      // Add to destination account (create if not exists)
      const { data: toBalance, error: toError } = await supabase
        .from('user_balances')
        .select('id, available, frozen')
        .eq('user_id', user.id)
        .eq('account_type', toAccount)
        .eq('currency', currency)
        .maybeSingle();

      if (toError) throw toError;

      if (toBalance) {
        // Update existing balance
        const newToAvailable = (toBalance.available || 0) + transferAmount;
        const newToUsdValue = newToAvailable + (toBalance.frozen || 0);

        await supabase
          .from('user_balances')
          .update({ 
            available: newToAvailable,
            usd_value: currency === 'USDT' ? newToUsdValue : 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', toBalance.id);
      } else {
        // Create new balance record
        await supabase
          .from('user_balances')
          .insert({
            user_id: user.id,
            account_type: toAccount,
            currency: currency,
            available: transferAmount,
            frozen: 0,
            usd_value: currency === 'USDT' ? transferAmount : 0
          });
      }

      // Record transfer in user_transfers table
      const { error: transferRecordError } = await supabase
        .from('user_transfers')
        .insert({
          user_id: user.id,
          from_account: fromAccount,
          to_account: toAccount,
          currency: currency,
          amount: transferAmount,
          status: 'completed'
        });

      if (transferRecordError) {
        console.error('Failed to record transfer:', transferRecordError);
        // Don't throw - transfer already completed, just log the error
      }

      toast.success(t('assets.transfer.success', '劃轉成功'), {
        description: `${transferAmount} ${currency} ${t(`assetOverview.${fromAccount}`)} → ${t(`assetOverview.${toAccount}`)}`
      });

      setOpen(false);
      setAmount('');
      onTransferComplete?.();
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error(t('assets.transfer.failed', '劃轉失敗'));
    } finally {
      setSubmitting(false);
    }
  };

  const availableCurrencies = getAvailableCurrencies();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowRightLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t('assets.transfer.title', '劃轉')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            {t('assets.transfer.title', '資金劃轉')}
          </DialogTitle>
          <DialogDescription>
            {t('assets.transfer.description', '在不同賬戶間轉移資金')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* From Account */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">{t('assets.transfer.from', '從')}</Label>
            <Select value={fromAccount} onValueChange={setFromAccount}>
              <SelectTrigger className="h-12 bg-muted/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map(acc => (
                  <SelectItem key={acc.value} value={acc.value}>
                    {t(acc.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full bg-muted/50 hover:bg-muted"
              onClick={handleSwapAccounts}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>

          {/* To Account */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">{t('assets.transfer.to', '至')}</Label>
            <Select value={toAccount} onValueChange={setToAccount}>
              <SelectTrigger className="h-12 bg-muted/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.filter(acc => acc.value !== fromAccount).map(acc => (
                  <SelectItem key={acc.value} value={acc.value}>
                    {t(acc.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Currency Selection */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">{t('assets.transfer.currency', '幣種')}</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-12 bg-muted/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCurrencies.length > 0 ? (
                  availableCurrencies.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="USDT">USDT</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground text-sm">{t('assets.transfer.amount', '金額')}</Label>
              <span className="text-xs text-muted-foreground">
                {t('assets.transfer.available', '可用')}: {availableBalance.toFixed(4)} {currency}
              </span>
            </div>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-12 pr-20 bg-muted/30"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary text-xs"
                onClick={() => setAmount(availableBalance.toString())}
              >
                {t('assets.transfer.max', '全部')}
              </Button>
            </div>
          </div>

          {/* Transfer Button */}
          <Button 
            className="w-full h-12" 
            onClick={handleTransfer}
            disabled={submitting || !amount || parseFloat(amount) <= 0}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('assets.transfer.confirm', '確認劃轉')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}