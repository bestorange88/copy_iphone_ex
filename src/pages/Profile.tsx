import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Loader2, 
  Save, 
  ShieldCheck, 
  CheckCircle,
  Key,
  Smartphone,
  History,
  Bell,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Shield,
  LogOut,
  Crown
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

interface ProfileData {
  username: string;
  email: string;
  avatar_url?: string;
  is_vip?: boolean;
  vip_level?: number;
}

interface KYCStatus {
  status?: string;
  real_name?: string;
}

interface LoginHistory {
  id: string;
  created_at: string;
  ip_address: string;
  action: string;
}

export default function Profile() {
  const { t } = useTranslation();
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [profile, setProfile] = useState<ProfileData>({
    username: '',
    email: '',
    avatar_url: ''
  });
  
  // Security settings states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Login history
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [showLoginHistory, setShowLoginHistory] = useState(false);
  
  // Notification settings - load from localStorage
  const loadNotificationSettings = () => {
    const saved = localStorage.getItem("notificationSettings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { login: true, withdrawal: true, trade: false };
      }
    }
    return { login: true, withdrawal: true, trade: false };
  };
  
  const savedSettings = loadNotificationSettings();
  const [loginNotification, setLoginNotification] = useState(savedSettings.login);
  const [withdrawalNotification, setWithdrawalNotification] = useState(savedSettings.withdrawal);
  const [tradeNotification, setTradeNotification] = useState(savedSettings.trade);

  // Save notification settings when they change
  useEffect(() => {
    const settings = {
      login: loginNotification,
      withdrawal: withdrawalNotification,
      trade: tradeNotification,
    };
    localStorage.setItem("notificationSettings", JSON.stringify(settings));
  }, [loginNotification, withdrawalNotification, tradeNotification]);

  // Password validation schema
  const passwordSchema = z.string()
    .min(6, t('auth.validation.password_min'))
    .max(8, t('auth.validation.password_max'))
    .regex(/[A-Z]/, t('auth.validation.password_uppercase'))
    .regex(/[a-z]/, t('auth.validation.password_lowercase'));

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

                                if (profileData) {
                                  setProfile({
                                    username: profileData.username || '',
                                    email: profileData.email || '',
                                    avatar_url: profileData.avatar_url || '',
                                    is_vip: profileData.is_vip || false,
                                    vip_level: profileData.vip_level || 0
                                  });
                                }

        const { data: kycData, error: kycError } = await supabase
          .from('kyc_verifications')
          .select('status, real_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (kycError && kycError.code !== 'PGRST116') {
          console.error('Failed to load KYC status:', kycError);
        } else if (kycData) {
          setKycStatus(kycData);
        }

        // Load login history from audit_logs
        const { data: historyData } = await supabase
          .from('audit_logs')
          .select('id, created_at, ip_address, action')
          .eq('user_id', user.id)
          .eq('resource_type', 'auth')
          .order('created_at', { ascending: false })
          .limit(10);

        if (historyData) {
          setLoginHistory(historyData.map(h => ({
            id: h.id,
            created_at: h.created_at,
            ip_address: String(h.ip_address || 'Unknown'),
            action: h.action
          })));
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        toast.error(t('common.error'));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, t]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: profile.username,
          avatar_url: profile.avatar_url
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(t('common.success'));
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    // Validate new password
    const passwordValidation = passwordSchema.safeParse(newPassword);
    if (!passwordValidation.success) {
      toast.error(passwordValidation.error.errors[0].message);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error(t('auth.validation.password_mismatch'));
      return;
    }

    setPasswordChanging(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success(t('profile.password_changed'));
      setShowPasswordDialog(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      console.error('Failed to change password:', error);
      toast.error(error.message || t('common.error'));
    } finally {
      setPasswordChanging(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      toast.success(t('profile.logged_out_all'));
      navigate('/auth');
    } catch (error) {
      console.error('Failed to logout all devices:', error);
      toast.error(t('common.error'));
    }
  };

  if (authLoading || loading || !user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 mb-20 lg:mb-0 px-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t('settings.account')}</h1>
            <p className="text-muted-foreground text-sm">{t('common.welcome')}</p>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {t('profile.title')}
            </CardTitle>
            <CardDescription>{t('profile.basic_info_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-2 border-primary/20">
                <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                  {profile.username.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-lg">{profile.username || user.email}</p>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                                                                <div className="flex items-center gap-2 mt-2">
                                                                  {profile.is_vip && profile.vip_level && profile.vip_level > 0 && (
                                                                    <Badge variant="default" className="text-xs bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0">
                                                                      <Crown className="h-3 w-3 mr-1" />
                                                                      VIP{profile.vip_level}
                                                                    </Badge>
                                                                  )}
                                                                  {kycStatus?.status === 'approved' && (
                                                                    <Badge variant="default" className="text-xs">
                                                                      <CheckCircle className="h-3 w-3 mr-1" />
                                                                      {t('common.verified')}
                                                                    </Badge>
                                                                  )}
                                                                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">{t('auth.username')}</Label>
                <Input
                  id="username"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  placeholder={t('profile.username_placeholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-2" />
                  {t('auth.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  {t('profile.email_readonly')}
                </p>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {t('common.save')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Identity Verification Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {t('profile.identity_verification')}
            </CardTitle>
            <CardDescription>{t('profile.identity_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{t('profile.kyc_title')}</p>
                  {kycStatus?.status === 'approved' && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {t('common.verified')}
                    </Badge>
                  )}
                  {kycStatus?.status === 'pending' && (
                    <Badge variant="secondary">{t('common.under_review')}</Badge>
                  )}
                  {kycStatus?.status === 'rejected' && (
                    <Badge variant="destructive">{t('common.failed')}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {kycStatus?.status === 'approved' 
                    ? `${t('profile.kyc_verified')} (${kycStatus.real_name})`
                    : t('profile.kyc_enhance')}
                </p>
              </div>
              <Button 
                variant={kycStatus?.status === 'approved' ? 'ghost' : 'default'}
                onClick={() => navigate('/kyc-verification')}
                disabled={kycStatus?.status === 'approved'}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                {kycStatus?.status === 'approved' ? t('common.verified') : 
                 kycStatus?.status === 'pending' ? t('common.view_progress') : t('common.go_verify')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {t('profile.account_security')}
            </CardTitle>
            <CardDescription>{t('profile.security_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {/* Change Password */}
            <div className="flex items-center justify-between py-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Key className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t('profile.change_password')}</p>
                  <p className="text-sm text-muted-foreground">{t('profile.change_password_desc')}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
                {t('common.modify')}
              </Button>
            </div>

            {/* Two-Factor Authentication */}
            <div className="flex items-center justify-between py-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Smartphone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t('profile.two_factor')}</p>
                  <p className="text-sm text-muted-foreground">{t('profile.two_factor_desc')}</p>
                </div>
              </div>
              <Badge variant="secondary">{t('profile.coming_soon')}</Badge>
            </div>

            {/* Login History */}
            <div className="flex items-center justify-between py-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <History className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t('profile.login_history')}</p>
                  <p className="text-sm text-muted-foreground">{t('profile.login_history_desc')}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowLoginHistory(true)}>
                {t('common.view')}
              </Button>
            </div>

            {/* Logout All Devices */}
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <LogOut className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">{t('profile.logout_all_devices')}</p>
                  <p className="text-sm text-muted-foreground">{t('profile.logout_all_desc')}</p>
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={handleLogoutAllDevices}>
                {t('profile.logout_all')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              {t('profile.notification_settings')}
            </CardTitle>
            <CardDescription>{t('profile.notification_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {/* Login Notification */}
            <div className="flex items-center justify-between py-4 border-b border-border/50">
              <div>
                <p className="font-medium">{t('profile.login_notification')}</p>
                <p className="text-sm text-muted-foreground">{t('profile.login_notification_desc')}</p>
              </div>
              <Switch 
                checked={loginNotification} 
                onCheckedChange={setLoginNotification}
              />
            </div>

            {/* Withdrawal Notification */}
            <div className="flex items-center justify-between py-4 border-b border-border/50">
              <div>
                <p className="font-medium">{t('profile.withdrawal_notification')}</p>
                <p className="text-sm text-muted-foreground">{t('profile.withdrawal_notification_desc')}</p>
              </div>
              <Switch 
                checked={withdrawalNotification} 
                onCheckedChange={setWithdrawalNotification}
              />
            </div>

            {/* Trade Notification */}
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{t('profile.trade_notification')}</p>
                <p className="text-sm text-muted-foreground">{t('profile.trade_notification_desc')}</p>
              </div>
              <Switch 
                checked={tradeNotification} 
                onCheckedChange={setTradeNotification}
              />
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t('profile.danger_zone')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('profile.delete_account')}</p>
                <p className="text-sm text-muted-foreground">{t('profile.delete_account_desc')}</p>
              </div>
              <Button variant="destructive" size="sm" disabled>
                {t('profile.delete')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              {t('profile.change_password')}
            </DialogTitle>
            <DialogDescription>
              {t('profile.change_password_dialog_desc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('profile.new_password')}</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('auth.password_requirements')}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>{t('auth.confirm_password')}</Label>
              <Input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleChangePassword} disabled={passwordChanging}>
              {passwordChanging && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Login History Dialog */}
      <Dialog open={showLoginHistory} onOpenChange={setShowLoginHistory}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              {t('profile.login_history')}
            </DialogTitle>
            <DialogDescription>
              {t('profile.login_history_dialog_desc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {loginHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t('profile.no_login_history')}
              </p>
            ) : (
              loginHistory.map((history) => (
                <div 
                  key={history.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">{history.action}</p>
                    <p className="text-xs text-muted-foreground">
                      IP: {history.ip_address}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(history.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoginHistory(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
