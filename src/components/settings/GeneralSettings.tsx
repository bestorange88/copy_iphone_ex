import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { User, Moon, Sun, Monitor, Type, Shield, Phone } from "lucide-react";

export function GeneralSettings() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [userNumber, setUserNumber] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState("medium");
  const [showBalance, setShowBalance] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      setDisplayName(profile.username || "");
      setUserNumber(profile.user_number || null);
    }

    // Load preferences from localStorage
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) setFontSize(savedFontSize);
    
    const savedShowBalance = localStorage.getItem('showBalance');
    if (savedShowBalance !== null) setShowBalance(savedShowBalance === 'true');
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: displayName })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('settings.profile_updated'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('settings.update_failed'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    localStorage.setItem('fontSize', size);
    
    // Apply font size to root element
    const root = document.documentElement;
    switch(size) {
      case 'small':
        root.style.fontSize = '14px';
        break;
      case 'large':
        root.style.fontSize = '18px';
        break;
      default:
        root.style.fontSize = '16px';
    }
  };

  const handleShowBalanceToggle = (checked: boolean) => {
    setShowBalance(checked);
    localStorage.setItem('showBalance', checked.toString());
  };

  return (
    <div className="space-y-6">
      {/* Personal Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('settings.personal_profile')}
          </CardTitle>
          <CardDescription>{t('settings.personal_profile_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userId">{t('settings.user_id')}</Label>
            <Input
              id="userId"
              value={userNumber ? String(userNumber) : '-'}
              disabled
              className="bg-muted font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">{t('settings.display_name')}</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('settings.display_name_placeholder')}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">{t('settings.email')}</Label>
            <Input
              id="email"
              value={user?.email || ""}
              disabled
              className="bg-muted"
            />
          </div>

          <Button onClick={handleSaveProfile} disabled={loading}>
            {loading ? t('common.submitting') : t('common.save')}
          </Button>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            {t('settings.theme_settings')}
          </CardTitle>
          <CardDescription>{t('settings.theme_settings_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('settings.theme')}</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                className="w-full"
                onClick={() => setTheme("light")}
              >
                <Sun className="h-4 w-4 mr-2" />
                {t('settings.light_mode')}
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                className="w-full"
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-4 w-4 mr-2" />
                {t('settings.dark_mode')}
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                className="w-full"
                onClick={() => setTheme("system")}
              >
                <Monitor className="h-4 w-4 mr-2" />
                {t('settings.system')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            {t('settings.display_settings')}
          </CardTitle>
          <CardDescription>{t('settings.display_settings_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('settings.font_size')}</Label>
            <Select value={fontSize} onValueChange={handleFontSizeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">{t('settings.font_small')}</SelectItem>
                <SelectItem value="medium">{t('settings.font_medium')}</SelectItem>
                <SelectItem value="large">{t('settings.font_large')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('settings.privacy_settings')}
          </CardTitle>
          <CardDescription>{t('settings.privacy_settings_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('settings.show_balance')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.show_balance_desc')}
              </p>
            </div>
            <Switch
              checked={showBalance}
              onCheckedChange={handleShowBalanceToggle}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('settings.two_factor_auth')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.two_factor_auth_desc')}
              </p>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={setTwoFactorEnabled}
              disabled
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
