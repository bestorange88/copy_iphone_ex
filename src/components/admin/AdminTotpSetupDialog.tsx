import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Loader2, Copy, CheckCircle } from "lucide-react";

interface AdminTotpSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminId: string;
  onSuccess: () => void;
}

export function AdminTotpSetupDialog({ open, onOpenChange, adminId, onSuccess }: AdminTotpSetupDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'generate' | 'verify'>('generate');
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState('');
  const [otpAuthUrl, setOtpAuthUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('generate');
      setSecret('');
      setOtpAuthUrl('');
      setVerificationCode('');
      generateSecret();
    }
  }, [open]);

  const generateSecret = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-totp', {
        body: { action: 'generate', admin_id: adminId }
      });

      if (error) throw error;
      
      setSecret(data.secret);
      setOtpAuthUrl(data.otpAuthUrl);
      setStep('verify');
    } catch (error) {
      console.error('Failed to generate TOTP:', error);
      toast.error(t('admin.totp.generate_failed', 'Failed to generate verification code'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error(t('admin.totp.invalid_code', 'Please enter a 6-digit verification code'));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-totp', {
        body: { action: 'enable', admin_id: adminId, token: verificationCode }
      });

      if (error) throw error;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(t('admin.totp.enabled', 'Google Authenticator enabled successfully'));
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to enable TOTP:', error);
      toast.error(t('admin.totp.verify_failed', 'Verification failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(t('common.copied', 'Copied'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t('admin.totp.setup_title', 'Setup Google Authenticator')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.totp.setup_desc', 'Scan the QR code with Google Authenticator app to enable two-factor authentication')}
          </DialogDescription>
        </DialogHeader>

        {loading && step === 'generate' ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-xl">
                {otpAuthUrl && <QRCodeSVG value={otpAuthUrl} size={180} />}
              </div>
            </div>

            {/* Secret Key */}
            <div className="space-y-2">
              <Label>{t('admin.totp.secret_key', 'Secret Key')}</Label>
              <div className="flex gap-2">
                <Input 
                  value={secret} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopySecret}
                >
                  {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('admin.totp.secret_hint', 'Save this key in a safe place. You can use it to restore access.')}
              </p>
            </div>

            {/* Verification Code Input */}
            <div className="space-y-2">
              <Label>{t('admin.totp.enter_code', 'Enter Verification Code')}</Label>
              <Input
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-widest font-mono"
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground">
                {t('admin.totp.enter_code_hint', 'Enter the 6-digit code from your authenticator app')}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleVerify} disabled={loading || verificationCode.length !== 6}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t('admin.totp.verify_enable', 'Verify & Enable')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
