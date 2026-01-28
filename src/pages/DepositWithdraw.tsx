import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, Copy, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { QRCodeSVG } from 'qrcode.react';
import { TransactionHistory } from "@/components/assets/TransactionHistory";
import { sendWithdrawalNotification } from "@/services/notificationService";

const DepositWithdraw = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedCoin, setSelectedCoin] = useState("BTC");
  const [selectedNetwork, setSelectedNetwork] = useState("BTC");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [depositAddresses, setDepositAddresses] = useState<any[]>([]);
  const [currentDepositAddress, setCurrentDepositAddress] = useState<any>(null);
  const [userWithdrawalAddresses, setUserWithdrawalAddresses] = useState<any[]>([]);
  const [selectedWithdrawalAddressId, setSelectedWithdrawalAddressId] = useState<string>("");
  const [txHash, setTxHash] = useState("");
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [verifiedAmount, setVerifiedAmount] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [depositSubmitMethod, setDepositSubmitMethod] = useState<"manual" | "hash">("manual");
  const [manualDepositAmount, setManualDepositAmount] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  // Reset form helper
  const resetDepositForm = () => {
    setTxHash("");
    setVerifiedAmount(null);
    setManualDepositAmount("");
    setScreenshotFile(null);
    // Reset file input
    const fileInput = document.getElementById('screenshot') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchDepositAddresses = async () => {
      const { data } = await supabase
        .from("deposit_addresses")
        .select("*")
        .eq("is_active", true);
      
      if (data) {
        setDepositAddresses(data);
      }
    };

    const fetchUserWithdrawalAddresses = async () => {
      const { data } = await supabase
        .from("user_withdrawal_addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      
      if (data) {
        setUserWithdrawalAddresses(data);
      }
    };

    fetchDepositAddresses();
    fetchUserWithdrawalAddresses();

    // Fetch user balance for selected coin
    const fetchBalance = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from("user_balances")
        .select("available")
        .eq("user_id", user.id)
        .eq("currency", selectedCoin)
        .eq("account_type", "spot")
        .maybeSingle();
      
      if (data) {
        setAvailableBalance(Number(data.available));
      } else {
        setAvailableBalance(0);
      }
    };

    fetchBalance();

    // Subscribe to deposit records changes for real-time status updates
    const depositSubscription = supabase
      .channel('deposit_records_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deposit_records',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          // Only show notification if status changed from pending
          if (oldRecord?.status === 'pending' && newRecord.status !== 'pending') {
            if (newRecord.status === 'completed') {
              toast.success(t('deposit.deposit_approved'), {
                description: `${t('deposit.deposit_approved_desc')}${newRecord.amount} ${newRecord.coin_symbol}`,
              });
              // Refresh page to show updated balance
              window.location.reload();
            } else if (newRecord.status === 'failed' || newRecord.status === 'rejected') {
              toast.error(t('deposit.deposit_rejected'), {
                description: t('deposit.deposit_rejected_desc'),
              });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to withdraw records changes for real-time status updates
    const withdrawSubscription = supabase
      .channel('withdraw_records_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'withdraw_records',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          // Only show notification if status changed from pending
          if (oldRecord?.status === 'pending' && newRecord.status !== 'pending') {
            if (newRecord.status === 'completed') {
              toast.success(t('deposit.withdraw_approved'), {
                description: `${t('deposit.withdraw_approved_desc')}${newRecord.amount} ${newRecord.coin_symbol}`,
              });
              // Refresh page to show updated balance
              window.location.reload();
            } else if (newRecord.status === 'rejected') {
              toast.error(t('deposit.withdraw_rejected'), {
                description: newRecord.reject_reason || t('deposit.withdraw_rejected_desc'),
              });
              // Refresh page to show updated balance (unfrozen)
              window.location.reload();
            }
          }
        }
      )
      .subscribe();

    return () => {
      depositSubscription.unsubscribe();
      withdrawSubscription.unsubscribe();
    };
  }, [user?.id, selectedCoin, t]);

  useEffect(() => {
    // When coin changes, auto-select first available network for that coin
    const availableNetworks = depositAddresses
      .filter((addr) => addr.coin_symbol === selectedCoin)
      .map((addr) => addr.network);
    
    if (availableNetworks.length > 0 && !availableNetworks.includes(selectedNetwork)) {
      setSelectedNetwork(availableNetworks[0]);
    }
    
    const address = depositAddresses.find(
      (addr) => addr.coin_symbol === selectedCoin && addr.network === selectedNetwork
    );
    setCurrentDepositAddress(address);
  }, [selectedCoin, selectedNetwork, depositAddresses]);

  useEffect(() => {
    // Auto-fill withdrawal address when coin/network changes
    const savedAddresses = userWithdrawalAddresses.filter(
      (addr) => addr.coin_symbol === selectedCoin && addr.network === selectedNetwork
    );
    
    if (savedAddresses.length > 0) {
      // Use default address if exists, otherwise use first one
      const defaultAddr = savedAddresses.find(addr => addr.is_default);
      const addrToUse = defaultAddr || savedAddresses[0];
      setSelectedWithdrawalAddressId(addrToUse.id);
      setWithdrawAddress(addrToUse.address);
    } else {
      setSelectedWithdrawalAddressId("");
      setWithdrawAddress("");
    }
  }, [selectedCoin, selectedNetwork, userWithdrawalAddresses]);

  if (loading || !user) {
    return null;
  }

  const handleVerifyTransaction = async () => {
    if (!txHash || !currentDepositAddress) {
      toast.error(t('deposit.deposit_submit_error'));
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-deposit-transaction', {
        body: {
          txHash,
          network: selectedNetwork,
          coinSymbol: selectedCoin,
          toAddress: currentDepositAddress.address,
        },
      });

      if (error) throw error;

      if (data.success) {
        setVerifiedAmount(data.transaction.amount);
        toast.success(`${t('deposit.verify_success')}${data.transaction.amount} ${selectedCoin}`);
      } else if (data.needsManualReview) {
        toast.info(data.message);
        setVerifiedAmount(null);
      } else {
        toast.error(data.error || t('common.error'));
        setVerifiedAmount(null);
      }
    } catch (error) {
      console.error('Error verifying transaction:', error);
      toast.error(t('common.error'));
      setVerifiedAmount(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmitManualDeposit = async () => {
    if (!manualDepositAmount || !screenshotFile || !currentDepositAddress) {
      toast.error(t('deposit.manual_submit_error'));
      return;
    }

    setIsSubmittingDeposit(true);
    setIsUploadingScreenshot(true);

    try {
      // Upload screenshot to storage
      const fileExt = screenshotFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('deposit-screenshots')
        .upload(fileName, screenshotFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('deposit-screenshots')
        .getPublicUrl(fileName);

      // Insert deposit record
      const { error } = await supabase
        .from('deposit_records')
        .insert({
          user_id: user.id,
          coin_symbol: selectedCoin,
          network: selectedNetwork,
          amount: parseFloat(manualDepositAmount),
          to_address: currentDepositAddress.address,
          screenshot_url: publicUrl,
          submit_method: 'manual',
          status: 'pending',
          confirmations: 0
        });

      if (error) throw error;

      toast.success(t('deposit.manual_submit_success'));
      resetDepositForm();
    } catch (error) {
      console.error('Error submitting manual deposit:', error);
      toast.error(t('deposit.manual_submit_failed'));
    } finally {
      setIsSubmittingDeposit(false);
      setIsUploadingScreenshot(false);
    }
  };

  const handleSubmitHashDeposit = async () => {
    if (!txHash) {
      toast.error(t('deposit.deposit_submit_error'));
      return;
    }

    setIsSubmittingDeposit(true);
    try {
      const { error } = await supabase
        .from('deposit_records')
        .insert({
          user_id: user.id,
          coin_symbol: selectedCoin,
          network: selectedNetwork,
          amount: verifiedAmount || 0,
          to_address: currentDepositAddress?.address,
          tx_hash: txHash,
          submit_method: 'hash',
          status: 'pending',
          confirmations: 0
        });

      if (error) throw error;

      toast.success(t('deposit.deposit_submitted'));
      resetDepositForm();
    } catch (error) {
      console.error('Error submitting deposit:', error);
      toast.error(t('deposit.deposit_submit_error'));
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  const handleSubmitWithdraw = async () => {
    if (!withdrawAddress || !withdrawAmount) {
      toast.error(t('deposit.withdraw_submit_error'));
      return;
    }

    const amount = parseFloat(withdrawAmount);
    const fee = amount * 0.02; // 提现手续费 2%
    const minWithdraw = 0.001;

    // 验证提现金额
    if (amount < minWithdraw) {
      toast.error(`${t('deposit.min_withdraw')} ${minWithdraw} ${selectedCoin}`);
      return;
    }

    // 验证余额是否足够
    if (amount + fee > availableBalance) {
      toast.error(t('deposit.insufficient_balance'));
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      // 1. 先查询并冻结用户余额
      const { data: balance, error: balanceError } = await supabase
        .from('user_balances')
        .select('available, frozen')
        .eq('user_id', user.id)
        .eq('currency', selectedCoin)
        .eq('account_type', 'spot')
        .maybeSingle();

      if (balanceError) throw balanceError;
      
      if (!balance) {
        throw new Error('余额记录不存在');
      }

      const newAvailable = Number(balance.available) - (amount + fee);
      const newFrozen = Number(balance.frozen) + (amount + fee);

      // 确保余额足够
      if (newAvailable < 0) {
        throw new Error(t('deposit.insufficient_balance'));
      }

      const { error: updateError } = await supabase
        .from('user_balances')
        .update({
          available: newAvailable,
          frozen: newFrozen
        })
        .eq('user_id', user.id)
        .eq('currency', selectedCoin)
        .eq('account_type', 'spot');

      if (updateError) throw updateError;

      // 2. 余额冻结成功后，再插入提现记录
      const { error: insertError } = await supabase
        .from('withdraw_records')
        .insert({
          user_id: user.id,
          coin_symbol: selectedCoin,
          network: selectedNetwork,
          to_address: withdrawAddress,
          amount: amount,
          fee: fee,
          status: 'pending'
        });

      if (insertError) {
        // 如果插入失败，回滚余额
        await supabase
          .from('user_balances')
          .update({
            available: balance.available,
            frozen: balance.frozen
          })
          .eq('user_id', user.id)
          .eq('currency', selectedCoin)
          .eq('account_type', 'spot');
        
        throw insertError;
      }

      // Send withdrawal notification email (fire and forget)
      sendWithdrawalNotification(
        user.id,
        amount,
        selectedCoin,
        selectedNetwork,
        withdrawAddress,
        fee
      ).catch(console.error);

      toast.success(t('deposit.withdraw_submitted'));
      setWithdrawAmount("");
      setWithdrawAddress("");
      setSelectedWithdrawalAddressId("");
      
      // 刷新余额
      setAvailableBalance(newAvailable);
    } catch (error) {
      console.error('Error submitting withdraw:', error);
      toast.error(t('deposit.withdraw_submit_failed'));
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const coins = Array.from(
    new Set(depositAddresses.map((addr) => addr.coin_symbol))
  ).map((symbol) => {
    const addr = depositAddresses.find((a) => a.coin_symbol === symbol);
    return {
      symbol,
      name: addr?.coin_name || symbol,
      networks: depositAddresses
        .filter((a) => a.coin_symbol === symbol)
        .map((a) => a.network),
    };
  });

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-4 lg:space-y-6 mb-20 lg:mb-0 px-2 lg:px-0">
        <div className="text-center space-y-2">
          <h1 className="text-2xl lg:text-3xl font-bold">{t('deposit.title')}</h1>
          <p className="text-sm lg:text-base text-muted-foreground">{t('deposit.subtitle')}</p>
        </div>

        <Tabs defaultValue="deposit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposit" className="gap-1 lg:gap-2 text-xs lg:text-sm">
              <Download className="h-3 w-3 lg:h-4 lg:w-4" />
              {t('deposit.deposit')}
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="gap-1 lg:gap-2 text-xs lg:text-sm">
              <Upload className="h-3 w-3 lg:h-4 lg:w-4" />
              {t('deposit.withdraw')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('deposit.deposit_address')}</CardTitle>
                <CardDescription>
                  {t('deposit.deposit_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('deposit.select_coin')}</Label>
                    <Select value={selectedCoin} onValueChange={setSelectedCoin}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {coins.map((coin) => (
                          <SelectItem key={coin.symbol} value={coin.symbol}>
                            {coin.symbol} - {coin.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('deposit.select_network')}</Label>
                    <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {coins.find(c => c.symbol === selectedCoin)?.networks.map((network) => (
                          <SelectItem key={network} value={network}>
                            {network}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t('deposit.network_warning')}
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
                    {currentDepositAddress?.address ? (
                      <QRCodeSVG
                        value={currentDepositAddress.address}
                        size={192}
                        level="H"
                        includeMargin={true}
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        {t('deposit.no_address')}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t('deposit.address')}</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={currentDepositAddress?.address || t('deposit.no_address')} 
                        readOnly 
                        className="font-mono" 
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => {
                          if (currentDepositAddress?.address) {
                            navigator.clipboard.writeText(currentDepositAddress.address);
                            toast.success(t('deposit.address_copied'));
                          }
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="text-muted-foreground">{t('deposit.min_deposit')}</div>
                      <div className="font-medium">
                        {currentDepositAddress?.min_deposit || 0} {selectedCoin}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">{t('deposit.arrival_time')}</div>
                      <div className="font-medium">
                        {currentDepositAddress?.confirmations_required || 12}{t('deposit.confirmations')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Deposit Record */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">{t('deposit.submit_application_title')}</CardTitle>
                    <CardDescription>{t('deposit.submit_application_desc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={depositSubmitMethod} onValueChange={(v) => setDepositSubmitMethod(v as "manual" | "hash")}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="manual">{t('deposit.manual_submit')}</TabsTrigger>
                        <TabsTrigger value="hash">{t('deposit.hash_verification')}</TabsTrigger>
                      </TabsList>

                      {/* Manual Submit Method */}
                      <TabsContent value="manual" className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="manual-amount">{t('deposit.manual_amount')}</Label>
                          <Input
                            id="manual-amount"
                            type="number"
                            placeholder={t('deposit.manual_amount_placeholder')}
                            value={manualDepositAmount}
                            onChange={(e) => setManualDepositAmount(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            {t('deposit.manual_amount_hint')}
                          </p>
                        </div>

                                                <div className="space-y-2">
                                                  <Label htmlFor="screenshot">{t('deposit.screenshot_upload')}</Label>
                                                  <div className="flex flex-col gap-2">
                                                    {/* 方框样式上传区域 */}
                                                    <div 
                                                      onClick={() => document.getElementById('screenshot')?.click()}
                                                      className="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-8 cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40"
                                                    >
                                                      <div className="flex flex-col items-center justify-center text-center">
                                                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                                        <span className="text-sm font-medium text-foreground">
                                                          {screenshotFile ? screenshotFile.name : t('kyc.click_upload')}
                                                        </span>
                                                        {screenshotFile && (
                                                          <span className="text-xs text-success mt-1">{t('deposit.screenshot_selected_short') || '已選擇'}</span>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <Input
                                                      id="screenshot"
                                                      type="file"
                                                      accept="image/*"
                                                      className="hidden"
                                                      onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                          setScreenshotFile(file);
                                                        }
                                                      }}
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                      {t('deposit.screenshot_upload_hint')}
                                                    </p>
                                                  </div>
                                                </div>

                        <Button 
                          className="w-full" 
                          onClick={handleSubmitManualDeposit}
                          disabled={!manualDepositAmount || !screenshotFile || isSubmittingDeposit}
                        >
                          {isUploadingScreenshot ? t('deposit.uploading') : isSubmittingDeposit ? t('common.submitting') : t('deposit.submit_review')}
                        </Button>
                      </TabsContent>

                      {/* Hash Verification Method */}
                      <TabsContent value="hash" className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="tx-hash">{t('deposit.tx_hash')}</Label>
                          <div className="flex gap-2">
                            <Input
                              id="tx-hash"
                              placeholder={t('deposit.tx_hash_placeholder')}
                              value={txHash}
                              onChange={(e) => {
                                setTxHash(e.target.value);
                                setVerifiedAmount(null);
                              }}
                              className="font-mono"
                            />
                            <Button
                              variant="outline"
                              onClick={handleVerifyTransaction}
                              disabled={!txHash || isVerifying}
                            >
                              {isVerifying ? t('common.loading') : t('deposit.verify_button')}
                            </Button>
                          </div>
                          {verifiedAmount !== null && (
                            <Alert className="mt-2">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                <div className="font-medium text-green-600">
                                  {t('deposit.verify_success')}{verifiedAmount} {selectedCoin}
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {t('deposit.tx_hash_hint')}
                          </p>
                        </div>

                        <Button 
                          className="w-full" 
                          onClick={handleSubmitHashDeposit}
                          disabled={!txHash || isSubmittingDeposit}
                        >
                          {isSubmittingDeposit ? t('common.submitting') : t('deposit.submit_deposit')}
                        </Button>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('deposit.withdraw_request')}</CardTitle>
                <CardDescription>
                  {t('deposit.withdraw_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('deposit.select_coin')}</Label>
                    <Select value={selectedCoin} onValueChange={setSelectedCoin}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {coins.map((coin) => (
                          <SelectItem key={coin.symbol} value={coin.symbol}>
                            {coin.symbol} - {coin.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('deposit.select_network')}</Label>
                    <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {coins.find(c => c.symbol === selectedCoin)?.networks.map((network) => (
                          <SelectItem key={network} value={network}>
                            {network}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="saved-addresses">{t('deposit.saved_addresses')}</Label>
                  <Select 
                    value={selectedWithdrawalAddressId} 
                    onValueChange={(value) => {
                      setSelectedWithdrawalAddressId(value);
                      const addr = userWithdrawalAddresses.find(a => a.id === value);
                      if (addr) {
                        setWithdrawAddress(addr.address);
                        setSelectedCoin(addr.coin_symbol);
                        setSelectedNetwork(addr.network);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('deposit.select_saved_address')} />
                    </SelectTrigger>
                    <SelectContent>
                      {userWithdrawalAddresses
                        .filter(addr => addr.coin_symbol === selectedCoin && addr.network === selectedNetwork)
                        .map((addr) => (
                          <SelectItem key={addr.id} value={addr.id}>
                            {addr.label || `${addr.coin_symbol} ${t('deposit.address')}`} - {addr.address.slice(0, 8)}...{addr.address.slice(-6)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t('deposit.manage_addresses_hint')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="withdraw-address">{t('deposit.withdraw_address')}</Label>
                  <Input
                    id="withdraw-address"
                    placeholder={t('deposit.withdraw_address_placeholder')}
                    value={withdrawAddress}
                    onChange={(e) => {
                      setWithdrawAddress(e.target.value);
                      setSelectedWithdrawalAddressId(""); // Clear selection when manually editing
                    }}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="withdraw-amount">{t('deposit.withdraw_amount')}</Label>
                    <span className="text-sm text-muted-foreground">
                      {t('deposit.available')}: {availableBalance.toFixed(8)} {selectedCoin}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="withdraw-amount"
                      type="number"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                    <Button variant="outline" onClick={() => {
                      // Calculate max amount considering 2% fee: Amount + 0.02*Amount = Available
                      // Amount = Available / 1.02
                      // Use floor to ensure we don't exceed balance due to rounding
                      const rawAmount = availableBalance / 1.02;
                      const maxAmount = Math.floor(rawAmount * 100000000) / 100000000;
                      setWithdrawAmount(maxAmount.toFixed(8));
                    }}>
                      {t('deposit.all')}
                    </Button>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>{t('deposit.min_withdraw')}</span>
                        <span className="font-medium">0.001 {selectedCoin}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('deposit.fee')}</span>
                        <span className="font-medium">2%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('deposit.estimated_time')}</span>
                        <span className="font-medium">{t('deposit.arrival_minutes')}</span>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleSubmitWithdraw}
                  disabled={!withdrawAddress || !withdrawAmount || isSubmittingWithdraw}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isSubmittingWithdraw ? t('common.submitting') : t('deposit.submit_withdraw')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <TransactionHistory />
      </div>
    </AppLayout>
  );
};

export default DepositWithdraw;
