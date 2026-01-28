import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
// 移除离线指示器以避免网速慢时显示离线状态
// import { OfflineIndicator } from "@/components/OfflineIndicator";
import { usePWAInstallation } from "@/hooks/usePWAInstallation";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AppDownloadBanner } from "@/components/layout/AppDownloadBanner";
import arxLogo from "@/assets/arx-logo-text.png";
import { 
  Menu, 
  TrendingUp, 
  Wallet, 
  BarChart3, 
  Newspaper,
  Settings,
  LogOut,
  Coins,
  Repeat,
  CreditCard,
  Landmark,
  Pickaxe,
  Percent,
  Zap,
  Activity,
  MessageCircle,
  ChevronDown,
  UserCheck,
  HelpCircle,
  Download,
  Crown,
  Bell
} from "lucide-react";
import { getUnreadCount } from "@/services/systemMessageService";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
                const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
                const [otcEnabled, setOtcEnabled] = useState(false);
                const [userNumber, setUserNumber] = useState<number | null>(null);
                const [isVip, setIsVip] = useState(false);
                const [vipLevel, setVipLevel] = useState<number>(0);
                const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  
  // Initialize PWA tracking
  usePWAInstallation();

  // 使用統一 LOGO
  const currentLogo = arxLogo;

        // 获取用户编号和VIP状态
        useEffect(() => {
          const fetchUserProfile = async () => {
            if (!user) return;
      
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_number, is_vip, vip_level')
              .eq('id', user.id)
              .single();
      
            if (profile?.user_number) {
              setUserNumber(profile.user_number);
            }
            if (profile?.is_vip) {
              setIsVip(true);
            }
            if (profile?.vip_level) {
              setVipLevel(profile.vip_level);
            }
          };

                  fetchUserProfile();
                }, [user]);

                // 获取未读消息数量
                useEffect(() => {
                  const fetchUnreadCount = async () => {
                    if (!user) {
                      setUnreadMessageCount(0);
                      return;
                    }
                    const count = await getUnreadCount(user.id);
                    setUnreadMessageCount(count);
                  };

                  fetchUnreadCount();
                  // 每30秒刷新一次未读消息数量
                  const interval = setInterval(fetchUnreadCount, 30000);
                  return () => clearInterval(interval);
                }, [user]);

  // 获取OTC开关状态
  useEffect(() => {
    const fetchOTCStatus = async () => {
      const { data } = await supabase
        .from('system_configs')
        .select('config_value')
        .eq('config_key', 'otc_enabled')
        .maybeSingle();
      
      if (data?.config_value && typeof data.config_value === 'object') {
        setOtcEnabled((data.config_value as { enabled?: boolean }).enabled === true);
      } else {
        setOtcEnabled(false);
      }
    };

    fetchOTCStatus();
  }, []);

  // 主菜单项 - 只保留加密货币相关
  const mainNavigationItems = [
    { label: t('nav.kyc'), path: "/kyc", icon: UserCheck },
    { label: t('nav.deposit'), path: "/deposit-withdraw", icon: CreditCard },
    { label: t('nav.assets'), path: "/assets", icon: Wallet },
    { label: t('nav.swap'), path: "/swap", icon: Repeat },
    { label: t('nav.quant'), path: "/quant", icon: Zap },
    { label: t('nav.contracts'), path: "/contracts", icon: BarChart3 },
    { label: t('nav.markets'), path: "/markets", icon: TrendingUp },
    { label: t('nav.news'), path: "/news", icon: Newspaper },
    { label: t('nav.help'), path: "/help", icon: HelpCircle },
    { label: t('nav.earn'), path: "/earn", icon: Percent },
    { label: t('nav.mining'), path: "/mining", icon: Pickaxe },
    { label: t('nav.trade'), path: "/trade", icon: Activity },
      { label: t('nav.app_download'), path: "/app-download", icon: Download },
      { label: t('nav.messages'), path: "/messages", icon: Bell },
    ];

  // 理财子菜单 (用于桌面端下拉菜单)
  const earnSubMenu = [
    { label: t('nav.earn'), path: "/earn", icon: Percent },
    { label: t('nav.mining'), path: "/mining", icon: Pickaxe },
  ];

  // OTC菜单项（仅当启用时显示）
  const otcMenuItem = otcEnabled ? [{ label: t('nav.otc'), path: "/otc", icon: Landmark }] : [];

  // 移动端所有菜单项 (mainNavigationItems已包含理财项目)
  const allNavigationItems = [
    ...mainNavigationItems,
    ...otcMenuItem,
  ];

  const isActive = (path: string) => location.pathname === path;
  
  const isGroupActive = (items: typeof mainNavigationItems) => 
    items.some(item => isActive(item.path));

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 移除离线指示器 */}
      
      {/* App Download Banner */}
      <AppDownloadBanner />
      
      {/* Header - 毛玻璃效果和底部蓝色渐变边框 */}
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b-0 after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-primary/50 after:to-transparent">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo - 高度與標題欄一致，無留白 */}
          <div className="flex items-center cursor-pointer group h-14" onClick={() => navigate("/trade")}>
            <img src={currentLogo} alt="ARX" className="h-14 object-contain transition-transform group-hover:scale-105" />
          </div>

          {/* Desktop Navigation - 與手機端側邊欄菜單內容同步 */}
          <nav className="hidden lg:flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
            {allNavigationItems.map((item) => (
              <Button
                key={item.path}
                variant={isActive(item.path) ? "default" : "ghost"}
                size="sm"
                onClick={() => handleNavigation(item.path)}
                className={`gap-1.5 px-2.5 h-8 text-xs whitespace-nowrap ${isActive(item.path) ? "" : "text-muted-foreground hover:text-foreground"}`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Button>
            ))}
          </nav>

                    {/* User Actions */}
                    <div className="flex items-center gap-2">
                      <LanguageSwitcher />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate("/messages")}
                        className="relative hidden md:flex gap-2 border-border/50 text-muted-foreground hover:text-primary hover:border-primary"
                      >
                        <Bell className="h-4 w-4" />
                        {unreadMessageCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                            {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                          </span>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate("/customer-service")}
                        className="hidden md:flex gap-2 border-border/50 text-muted-foreground hover:text-primary hover:border-primary"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {t('nav.customer_service')}
                      </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/settings")}
              className="hidden md:flex gap-2 border-border/50 text-muted-foreground hover:text-primary hover:border-primary"
            >
              <Settings className="h-4 w-4" />
              {t('nav.settings')}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={signOut}
              className="hidden md:flex gap-2 border-border/50 text-muted-foreground hover:text-primary hover:border-primary"
            >
              <LogOut className="h-4 w-4" />
              {t('common.logout')}
            </Button>

            {/* Mobile Settings Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/settings")}
              className="lg:hidden border-border/50 text-muted-foreground hover:text-primary hover:border-primary"
            >
              <Settings className="h-5 w-5" />
            </Button>

            {/* Mobile Menu Sheet (triggered from bottom nav) */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="hidden">
                <Button variant="outline" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px] p-0 flex flex-col bg-card/80 backdrop-blur-2xl border-l-0 before:content-[''] before:absolute before:top-0 before:left-0 before:bottom-0 before:w-[1px] before:bg-gradient-to-b before:from-transparent before:via-primary/50 before:to-transparent shadow-[-20px_0_40px_-10px_hsl(var(--primary)/0.15)]">
                <VisuallyHidden>
                  <SheetTitle>Navigation Menu</SheetTitle>
                  <SheetDescription>Access all pages and settings</SheetDescription>
                </VisuallyHidden>
                
                {/* Logo header - 與頁面標題欄一致的背景色，logo放大無留白 */}
                <div className="flex items-center justify-center border-b border-border/30 h-14 bg-background">
                  <img src={currentLogo} alt="ARX" className="h-14 object-contain" />
                </div>
                
                {/* Navigation items - scrollable */}
                <nav className="flex-1 overflow-y-auto p-3">
                  <div className="flex flex-col gap-1">
                    {allNavigationItems.map((item) => (
                      <Button
                        key={item.path}
                        variant={isActive(item.path) ? "default" : "ghost"}
                        className={`justify-start gap-2 h-9 text-sm ${isActive(item.path) ? "" : "text-muted-foreground hover:text-foreground"}`}
                        onClick={() => handleNavigation(item.path)}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </nav>

                {/* Bottom actions */}
                <div className="p-3 border-t border-border/30 space-y-1">
                                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-1">
                                                                          <span>{userNumber ? `ID: ${userNumber}` : (user?.email?.split('@')[0] || 'User')}</span>
                                                                          {isVip && vipLevel > 0 && (
                                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gradient-to-r from-yellow-500 to-amber-500 text-white">
                                                                              <Crown className="h-3 w-3" />
                                                                              VIP{vipLevel}
                                                                            </span>
                                                                          )}
                                                                        </div>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 h-9 text-sm border-border/50 text-muted-foreground hover:text-primary hover:border-primary"
                    onClick={() => {
                      navigate("/customer-service");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t('nav.customer_service')}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 h-9 text-sm border-border/50 text-muted-foreground hover:text-primary hover:border-primary"
                    onClick={() => {
                      navigate("/settings");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Settings className="h-4 w-4" />
                    {t('nav.settings')}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 h-9 text-sm border-border/50 text-muted-foreground hover:text-primary hover:border-primary"
                    onClick={signOut}
                  >
                    <LogOut className="h-4 w-4" />
                    {t('common.logout')}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t-0 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-primary/50 before:to-transparent">
        <div className="grid grid-cols-5 gap-1 p-2">
          <Button
            variant={isActive("/markets") ? "default" : "ghost"}
            size="sm"
            onClick={() => handleNavigation("/markets")}
            className={`flex flex-col gap-1 h-auto py-2 ${isActive("/markets") ? "" : "text-muted-foreground"}`}
          >
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs">{t('nav.markets')}</span>
          </Button>
          <Button
            variant={isActive("/trade") ? "default" : "ghost"}
            size="sm"
            onClick={() => handleNavigation("/trade")}
            className={`flex flex-col gap-1 h-auto py-2 ${isActive("/trade") ? "" : "text-muted-foreground"}`}
          >
            <Activity className="h-5 w-5" />
            <span className="text-xs">{t('nav.trade')}</span>
          </Button>
          <Button
            variant={isActive("/contracts") ? "default" : "ghost"}
            size="sm"
            onClick={() => handleNavigation("/contracts")}
            className={`flex flex-col gap-1 h-auto py-2 ${isActive("/contracts") ? "" : "text-muted-foreground"}`}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs">{t('nav.contracts')}</span>
          </Button>
          <Button
            variant={isActive("/assets") ? "default" : "ghost"}
            size="sm"
            onClick={() => handleNavigation("/assets")}
            className={`flex flex-col gap-1 h-auto py-2 ${isActive("/assets") ? "" : "text-muted-foreground"}`}
          >
            <Wallet className="h-5 w-5" />
            <span className="text-xs">{t('nav.assets')}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col gap-1 h-auto py-2 text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
            <span className="text-xs">{t('common.search')}</span>
          </Button>
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
