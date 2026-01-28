import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { adminApi } from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Settings, Smartphone, Upload, Link, FileText, Loader2, Key, Shield, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AppDownloadConfig {
  android_url: string;
  ios_url: string;
  apk_file_url: string;
  version: string;
  update_note: string;
}

export function AdminSystemSettings() {
  const { t } = useTranslation();
  const { admin } = useAdminAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [appConfig, setAppConfig] = useState<AppDownloadConfig>({
    android_url: '',
    ios_url: '',
    apk_file_url: '',
    version: '1.0.0',
    update_note: ''
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // TOTP state
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [totpQrCode, setTotpQrCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [settingUpTotp, setSettingUpTotp] = useState(false);
  const [verifyingTotp, setVerifyingTotp] = useState(false);
  const [disablingTotp, setDisablingTotp] = useState(false);

  useEffect(() => {
    loadSettings();
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    if (!admin) return;
    try {
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { action: 'get_security_settings', admin_id: admin.id }
      });
      if (!error && data) {
        setTotpEnabled(data.totp_enabled || false);
      }
    } catch (error) {
      console.error('載入安全設定失敗:', error);
    }
  };

  const handleChangePassword = async () => {
    if (!admin) return;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('請填寫所有密碼欄位');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('新密碼與確認密碼不一致');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('新密碼長度至少6位');
      return;
    }

    setChangingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { 
          action: 'change_password', 
          admin_id: admin.id,
          current_password: currentPassword,
          new_password: newPassword
        }
      });

      if (error || !data?.success) {
        toast.error(data?.error || '密碼修改失敗');
        return;
      }

      toast.success('密碼修改成功');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('密碼修改失敗:', error);
      toast.error('密碼修改失敗');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSetupTotp = async () => {
    if (!admin) return;
    
    setSettingUpTotp(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { action: 'setup_totp', admin_id: admin.id }
      });

      if (error || !data?.success) {
        toast.error(data?.error || '設置失敗');
        return;
      }

      setTotpSecret(data.secret);
      setTotpQrCode(data.qr_code);
    } catch (error) {
      console.error('設置 TOTP 失敗:', error);
      toast.error('設置失敗');
    } finally {
      setSettingUpTotp(false);
    }
  };

  const handleVerifyTotp = async () => {
    if (!admin || !totpCode) return;
    
    if (totpCode.length !== 6) {
      toast.error('請輸入6位數驗證碼');
      return;
    }

    setVerifyingTotp(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { 
          action: 'verify_totp_setup', 
          admin_id: admin.id,
          totp_code: totpCode,
          totp_secret: totpSecret
        }
      });

      if (error || !data?.success) {
        toast.error(data?.error || '驗證失敗');
        return;
      }

      toast.success('Google Authenticator 綁定成功');
      setTotpEnabled(true);
      setTotpSecret('');
      setTotpQrCode('');
      setTotpCode('');
    } catch (error) {
      console.error('驗證 TOTP 失敗:', error);
      toast.error('驗證失敗');
    } finally {
      setVerifyingTotp(false);
    }
  };

  const handleDisableTotp = async () => {
    if (!admin) return;
    
    if (!confirm('確定要關閉二次驗證嗎？這將降低帳戶安全性。')) {
      return;
    }

    setDisablingTotp(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { action: 'disable_totp', admin_id: admin.id }
      });

      if (error || !data?.success) {
        toast.error(data?.error || '關閉失敗');
        return;
      }

      toast.success('二次驗證已關閉');
      setTotpEnabled(false);
    } catch (error) {
      console.error('關閉 TOTP 失敗:', error);
      toast.error('關閉失敗');
    } finally {
      setDisablingTotp(false);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await adminApi.select('system_configs', {
        filters: { config_key: 'app_download' }
      });

      if (error) throw error;
      
      const dataArray = data as { config_value: unknown }[] | null;
      if (dataArray && dataArray.length > 0 && typeof dataArray[0].config_value === 'object') {
        setAppConfig(dataArray[0].config_value as unknown as AppDownloadConfig);
      }
    } catch (error) {
      console.error('載入設定失敗:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAppConfig = async () => {
    setSaving(true);
    try {
      const { error } = await adminApi.upsert('system_configs', [{
        config_key: 'app_download',
        config_value: appConfig,
        description: 'App download configuration'
      }]);

      if (error) throw error;
      toast.success('保存成功');
    } catch (error) {
      console.error('保存設定失敗:', error);
      toast.error('保存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.apk')) {
      toast.error('請選擇有效的 APK 檔案');
      return;
    }

    // Validate file size (max 200MB)
    if (file.size > 200 * 1024 * 1024) {
      toast.error('檔案大小不能超過 200MB');
      return;
    }

    setUploading(true);
    try {
      const fileName = `app-${Date.now()}.apk`;
      
      const { error: uploadError } = await supabase.storage
        .from('app-downloads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('app-downloads')
        .getPublicUrl(fileName);

      setAppConfig(prev => ({ ...prev, apk_file_url: publicUrl }));
      toast.success('APK 上傳成功');
    } catch (error) {
      console.error('APK 上傳失敗:', error);
      toast.error('APK 上傳失敗');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">系統設定</h2>
      </div>

      <Tabs defaultValue="security" className="w-full">
        <TabsList>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            安全設定
          </TabsTrigger>
          <TabsTrigger value="app-download" className="gap-2">
            <Smartphone className="w-4 h-4" />
            APP 下載
          </TabsTrigger>
        </TabsList>

        {/* Security Settings Tab */}
        <TabsContent value="security" className="mt-6 space-y-6">
          {/* Password Change Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                修改密碼
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>當前密碼</Label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="請輸入當前密碼"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>新密碼</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="請輸入新密碼（至少6位）"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>確認新密碼</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="請再次輸入新密碼"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleChangePassword} disabled={changingPassword}>
                  {changingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      修改中...
                    </>
                  ) : (
                    '修改密碼'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Google Authenticator Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Google Authenticator 二次驗證
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {totpEnabled ? (
                <div className="space-y-4">
                  <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-700 dark:text-green-300">
                      二次驗證已啟用，您的帳戶受到額外保護
                    </AlertDescription>
                  </Alert>
                  <div className="flex justify-end">
                    <Button 
                      variant="destructive" 
                      onClick={handleDisableTotp}
                      disabled={disablingTotp}
                    >
                      {disablingTotp ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          關閉中...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          關閉二次驗證
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : totpQrCode ? (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      請使用 Google Authenticator 或其他驗證器 APP 掃描下方 QR Code，然後輸入6位數驗證碼完成綁定。
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex flex-col items-center gap-4">
                    <img 
                      src={totpQrCode} 
                      alt="TOTP QR Code" 
                      className="w-48 h-48 border rounded-lg"
                    />
                    <div className="text-sm text-muted-foreground text-center">
                      <p>如無法掃描，請手動輸入密鑰：</p>
                      <code className="bg-muted px-2 py-1 rounded text-xs break-all">{totpSecret}</code>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>驗證碼</Label>
                    <Input
                      type="text"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="請輸入6位數驗證碼"
                      maxLength={6}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setTotpQrCode('');
                        setTotpSecret('');
                        setTotpCode('');
                      }}
                    >
                      取消
                    </Button>
                    <Button onClick={handleVerifyTotp} disabled={verifyingTotp || totpCode.length !== 6}>
                      {verifyingTotp ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          驗證中...
                        </>
                      ) : (
                        '確認綁定'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      啟用二次驗證後，每次登入管理後台時需要輸入 Google Authenticator 生成的驗證碼，大幅提升帳戶安全性。
                    </AlertDescription>
                  </Alert>
                  <div className="flex justify-end">
                    <Button onClick={handleSetupTotp} disabled={settingUpTotp}>
                      {settingUpTotp ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          設置中...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          啟用二次驗證
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="app-download" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                APP 下載設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Version */}
              <div className="space-y-2">
                <Label>APP 版本</Label>
                <Input
                  value={appConfig.version}
                  onChange={(e) => setAppConfig(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="1.0.0"
                />
              </div>

              {/* APK Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  上傳 APK 檔案
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept=".apk"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="flex-1"
                  />
                  {uploading && <Loader2 className="w-5 h-5 animate-spin" />}
                </div>
                {appConfig.apk_file_url && (
                  <p className="text-sm text-muted-foreground truncate">
                    當前 APK: {appConfig.apk_file_url}
                  </p>
                )}
              </div>

              {/* Android URL */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Google Play 連結
                </Label>
                <Input
                  value={appConfig.android_url}
                  onChange={(e) => setAppConfig(prev => ({ ...prev, android_url: e.target.value }))}
                  placeholder="https://play.google.com/store/apps/details?id=..."
                />
              </div>

              {/* iOS URL */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  App Store 連結
                </Label>
                <Input
                  value={appConfig.ios_url}
                  onChange={(e) => setAppConfig(prev => ({ ...prev, ios_url: e.target.value }))}
                  placeholder="https://apps.apple.com/app/..."
                />
              </div>

              {/* Update Notes */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  更新說明
                </Label>
                <Textarea
                  value={appConfig.update_note}
                  onChange={(e) => setAppConfig(prev => ({ ...prev, update_note: e.target.value }))}
                  placeholder="請輸入更新說明..."
                  rows={4}
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button onClick={handleSaveAppConfig} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    '保存'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
