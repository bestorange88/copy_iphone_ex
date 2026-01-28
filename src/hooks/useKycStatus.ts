import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface KycStatus {
  hasBasicKyc: boolean;
  hasAdvancedKyc: boolean;
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  tradingLimit: number;
  withdrawalLimit: number;
  basicKyc: {
    status: string;
    kyc_level: string;
    real_name?: string;
  } | null;
  advancedKyc: {
    status: string;
    kyc_level: string;
  } | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export const useKycStatus = (): KycStatus => {
  const { user } = useAuth();
  const [hasBasicKyc, setHasBasicKyc] = useState(false);
  const [hasAdvancedKyc, setHasAdvancedKyc] = useState(false);
  const [kycStatus, setKycStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [tradingLimit, setTradingLimit] = useState(0);
  const [withdrawalLimit, setWithdrawalLimit] = useState(0);
  const [basicKyc, setBasicKyc] = useState<KycStatus['basicKyc']>(null);
  const [advancedKyc, setAdvancedKyc] = useState<KycStatus['advancedKyc']>(null);
  const [loading, setLoading] = useState(true);

  const fetchKycStatus = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Get all KYC verifications for this user
      const { data: kycRecords, error } = await supabase
        .from('kyc_verifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const basicRecord = kycRecords?.find(r => r.kyc_level === 'basic');
      const advancedRecord = kycRecords?.find(r => r.kyc_level === 'advanced');

      const hasApprovedBasic = basicRecord?.status === 'approved';
      const hasApprovedAdvanced = advancedRecord?.status === 'approved';

      setBasicKyc(basicRecord || null);
      setAdvancedKyc(advancedRecord || null);
      setHasBasicKyc(hasApprovedBasic);
      setHasAdvancedKyc(hasApprovedAdvanced);

      // Determine overall status - prioritize pending/rejected states
      if (hasApprovedAdvanced) {
        setKycStatus('approved');
        setTradingLimit(999999999999);
        setWithdrawalLimit(999999999999);
      } else if (hasApprovedBasic) {
        // 基礎KYC通過後，不限制交易和提現金額
        setKycStatus('approved');
        setTradingLimit(999999999999);
        setWithdrawalLimit(999999999999);
      } else if (basicRecord?.status === 'pending' || advancedRecord?.status === 'pending') {
        setKycStatus('pending');
        setTradingLimit(0);
        setWithdrawalLimit(0);
      } else if (basicRecord?.status === 'rejected') {
        setKycStatus('rejected');
        setTradingLimit(0);
        setWithdrawalLimit(0);
      } else {
        setKycStatus('none');
        setTradingLimit(0);
        setWithdrawalLimit(0);
      }
    } catch (error) {
      console.error('Failed to fetch KYC status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKycStatus();
  }, [user?.id]);

  return {
    hasBasicKyc,
    hasAdvancedKyc,
    kycStatus,
    tradingLimit,
    withdrawalLimit,
    basicKyc,
    advancedKyc,
    loading,
    refetch: fetchKycStatus,
  };
};
