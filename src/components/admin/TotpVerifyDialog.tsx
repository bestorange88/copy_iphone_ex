import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Loader2 } from "lucide-react";

interface TotpVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminId: string;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function TotpVerifyDialog({ 
  open, 
  onOpenChange, 
  adminId, 
  onSuccess,
  title,
  description
}: TotpVerifyDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error(t('admin.totp.invalid_code', 'Please enter a 6-digit verification code'));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-totp', {
        body: { action: 'verify', admin_id: adminId, token: verificationCode }
      });

      if (error) throw error;
      
      if (!data.valid) {
        toast.error(t('admin.totp.invalid_code', 'Invalid verification code'));
        return;
      }

      onSuccess();
      onOpenChange(false);
      setVerificationCode('');
    } catch (error) {
      console.error('Failed to verify TOTP:', error);
      toast.error(t('admin.totp.verify_failed', 'Verification failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {title || t('admin.totp.verify_title', 'Two-Factor Verification')}
          </DialogTitle>
          <DialogDescription>
            {description || t('admin.totp.verify_desc', 'Enter the verification code from your authenticator app')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('admin.totp.enter_code', 'Enter Verification Code')}</Label>
            <Input
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="text-center text-2xl tracking-widest font-mono"
              maxLength={6}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleVerify} disabled={loading || verificationCode.length !== 6}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
