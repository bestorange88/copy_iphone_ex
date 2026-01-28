import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useKycStatus } from "@/hooks/useKycStatus";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, ShieldCheck, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { ReactNode } from "react";

interface KycRequiredGuardProps {
  children: ReactNode;
  requiredLevel?: 'basic' | 'advanced';
  amount?: number; // Amount in USDT to check against limits
  showInline?: boolean; // Show inline warning instead of blocking
}

export const KycRequiredGuard = ({ 
  children, 
  requiredLevel = 'basic',
  amount,
  showInline = false 
}: KycRequiredGuardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasBasicKyc, hasAdvancedKyc, tradingLimit, loading, kycStatus } = useKycStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Check if amount exceeds limits
  const exceedsLimit = amount && amount > tradingLimit;
  const needsAdvancedForAmount = amount && amount > 50000 && !hasAdvancedKyc;

  // Check if KYC is required
  const needsKyc = (
    (requiredLevel === 'basic' && !hasBasicKyc) ||
    (requiredLevel === 'advanced' && !hasAdvancedKyc)
  );

  // If user meets requirements and amount doesn't exceed limit, show children
  if (!needsKyc && !exceedsLimit) {
    return <>{children}</>;
  }

  // If showing inline warning
  if (showInline && needsAdvancedForAmount) {
    return (
      <>
        {children}
        <Alert className="mt-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-yellow-800 dark:text-yellow-200">
              {t('kyc.amount_exceeds_limit', { limit: '50,000 USDT' })}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/kyc')}
              className="ml-2"
            >
              {t('kyc.upgrade_to_advanced')}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </AlertDescription>
        </Alert>
      </>
    );
  }

  // Show blocking KYC requirement
  return (
    <Card className="max-w-md mx-auto my-8">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
          {requiredLevel === 'advanced' || needsAdvancedForAmount ? (
            <ShieldCheck className="h-12 w-12 text-primary" />
          ) : (
            <Shield className="h-12 w-12 text-primary" />
          )}
        </div>
        <CardTitle>{t('kyc.verification_required')}</CardTitle>
        <CardDescription>
          {needsAdvancedForAmount 
            ? t('kyc.advanced_required_for_amount')
            : requiredLevel === 'advanced' 
              ? t('kyc.advanced_required_desc')
              : t('kyc.basic_required_desc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Shield className={`h-5 w-5 ${hasBasicKyc ? 'text-green-500' : 'text-muted-foreground'}`} />
            <div className="flex-1">
              <p className="font-medium">{t('kyc.basic_verification')}</p>
              <p className="text-sm text-muted-foreground">{t('kyc.basic_required_for_trading')}</p>
            </div>
            {hasBasicKyc && <span className="text-green-500 text-sm">✓ {t('kyc.status_approved')}</span>}
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <ShieldCheck className={`h-5 w-5 ${hasAdvancedKyc ? 'text-green-500' : 'text-muted-foreground'}`} />
            <div className="flex-1">
              <p className="font-medium">{t('kyc.advanced_verification')}</p>
              <p className="text-sm text-muted-foreground">{t('kyc.advanced_benefits')}</p>
            </div>
            {hasAdvancedKyc && <span className="text-green-500 text-sm">✓ {t('kyc.status_approved')}</span>}
          </div>
        </div>

        {kycStatus === 'pending' && (
          <Alert>
            <AlertDescription>
              {t('kyc.verification_pending_desc')}
            </AlertDescription>
          </Alert>
        )}

        <Button 
          className="w-full" 
          size="lg"
          onClick={() => navigate('/kyc')}
        >
          {kycStatus === 'pending' ? t('kyc.view_status') : t('kyc.go_verify')}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};
