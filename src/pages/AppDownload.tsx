import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, Apple, Download, Share, Plus, MoreVertical, Check, Star } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useNavigate } from "react-router-dom";
import arxLogo from "@/assets/arx-logo-text.png";
import { Progress } from "@/components/ui/progress";

interface AppDownloadConfig {
  android_url: string;
  ios_url: string;
  apk_file_url: string;
  version: string;
  update_note: string;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function AppDownload() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [config, setConfig] = useState<AppDownloadConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [installState, setInstallState] = useState<'idle' | 'downloading' | 'installing' | 'success'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    loadConfig();
    detectPlatform();
    setupPWAPrompt();
  }, []);

  const detectPlatform = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // 检测是否已安装 PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPWAInstalled(true);
    }
  };

  const setupPWAPrompt = () => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  };

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_configs')
        .select('config_value')
        .eq('config_key', 'app_download')
        .single();

      if (error) throw error;
      if (data?.config_value && typeof data.config_value === 'object') {
        setConfig(data.config_value as unknown as AppDownloadConfig);
      }
    } catch (error) {
      console.error('Failed to load app download config:', error);
    } finally {
      setLoading(false);
    }
  };

  const simulateDownloadProgress = useCallback(() => {
    return new Promise<void>((resolve) => {
      setInstallState('downloading');
      setDownloadProgress(0);
      
      const interval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            resolve();
            return 100;
          }
          return prev + Math.random() * 15 + 5;
        });
      }, 150);
    });
  }, []);

  const handlePWAInstall = async () => {
    if (deferredPrompt) {
      // Start simulated download animation
      await simulateDownloadProgress();
      
      // Show installing state
      setInstallState('installing');
      
      // Trigger actual PWA install prompt
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setInstallState('success');
        setIsPWAInstalled(true);
        // Track installation
        try {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('pwa_installations').insert({
            user_id: user?.id || null,
            device_type: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop',
            browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other',
            os_version: 'unknown'
          });
        } catch (e) {
          console.error('Failed to track installation:', e);
        }
      } else {
        setInstallState('idle');
      }
      setDeferredPrompt(null);
    }
  };

  // 获取当前页面 URL 用于 QR 码
  const currentUrl = window.location.origin;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate('/')}
          >
                        <img src={arxLogo} alt="ARX" className="h-8 w-8" />
                        <span className="font-bold text-lg">ARX</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 lg:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
              <Smartphone className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-4">
              {t('appDownload.title', '下載應用')}
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              {t('appDownload.subtitle', '隨時隨地使用我們的移動應用進行交易')}
            </p>
            {config?.version && (
              <p className="text-sm text-muted-foreground mt-2">
                {t('appDownload.version', '版本')}: {config.version}
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* App Store Style Card */}
              <Card className="overflow-hidden mb-8">
                <CardContent className="p-6 lg:p-8">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* App Icon */}
                    <div className="relative">
                      <div className="w-28 h-28 md:w-32 md:h-32 rounded-[28px] overflow-hidden shadow-xl bg-white flex items-center justify-center">
                        <img 
                          src="/pwa-512x512.png" 
                          alt="ARX" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {installState === 'success' && (
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                    
                    {/* App Info */}
                    <div className="flex-1 text-center md:text-left">
                      <h2 className="text-2xl font-bold mb-1">ARX</h2>
                      <p className="text-muted-foreground mb-2">ARX Trading Platform</p>
                      <div className="flex items-center justify-center md:justify-start gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                        <span className="text-sm text-muted-foreground ml-2">5.0</span>
                      </div>
                      <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                        <span>{config?.version || '1.0.0'}</span>
                        <span>|</span>
                        <span>2.5 MB</span>
                        <span>|</span>
                        <span>Finance</span>
                      </div>
                    </div>
                    
                    {/* Install Button */}
                    <div className="w-full md:w-auto">
                      {isPWAInstalled || installState === 'success' ? (
                        <Button 
                          className="w-full md:w-40 h-12 text-lg"
                          variant="outline"
                          onClick={() => navigate('/')}
                        >
                          <Check className="w-5 h-5 mr-2" />
                          {t('appDownload.open', '打開')}
                        </Button>
                      ) : installState === 'downloading' || installState === 'installing' ? (
                        <div className="w-full md:w-40 space-y-2">
                          <Progress value={Math.min(downloadProgress, 100)} className="h-2" />
                          <p className="text-center text-sm text-muted-foreground">
                            {installState === 'downloading' 
                              ? `${Math.min(Math.round(downloadProgress), 100)}%` 
                              : t('appDownload.installing', '安裝中...')}
                          </p>
                        </div>
                      ) : deferredPrompt ? (
                        <Button 
                          className="w-full md:w-40 h-12 text-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                          onClick={handlePWAInstall}
                        >
                          <Download className="w-5 h-5 mr-2" />
                          {t('appDownload.install', '安裝')}
                        </Button>
                      ) : (
                        <Button 
                          className="w-full md:w-40 h-12 text-lg"
                          variant="outline"
                          onClick={() => {
                            const el = document.getElementById('install-guide');
                            el?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          <Download className="w-5 h-5 mr-2" />
                          {t('appDownload.howToInstall', '如何安裝')}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Screenshots Preview */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">{t('appDownload.preview', '應用預覽')}</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                  {[
                    { title: '交易', desc: '專業交易界面' },
                    { title: '資產', desc: '資產管理' },
                    { title: '行情', desc: '即時行情' },
                  ].map((item, index) => (
                    <div 
                      key={index}
                      className="flex-shrink-0 w-48 h-80 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex flex-col items-center justify-center snap-start"
                    >
                      <Smartphone className="w-16 h-16 text-primary/50 mb-4" />
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Installation Guide */}
              <div id="install-guide" className="grid md:grid-cols-2 gap-6 lg:gap-8">
                {/* Android Guide */}
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 lg:p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <Smartphone className="w-7 h-7 text-green-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Android</h3>
                        <p className="text-sm text-muted-foreground">
                          {t('appDownload.forAndroid', '適用於安卓設備')}
                        </p>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex justify-center mb-6">
                      <div className="p-4 bg-white rounded-xl">
                        <QRCodeSVG value={currentUrl} size={140} />
                      </div>
                    </div>

                    <p className="text-center text-sm text-muted-foreground mb-4">
                      {t('appDownload.scanQR', '掃描二維碼訪問並安裝')}
                    </p>

                    <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium text-center mb-3">{t('appDownload.steps', '安裝步驟')}：</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">1</span>
                          <span>{t('appDownload.androidStep1', '使用 Chrome 瀏覽器打開此頁面')}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">2</span>
                          <div className="flex items-center gap-1">
                            <span>{t('appDownload.androidStep2', '點擊右上角')}</span>
                            <MoreVertical className="w-4 h-4" />
                            <span>{t('appDownload.menuButton', '選單按鈕')}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">3</span>
                          <span>{t('appDownload.androidStep3', '選擇「新增至主畫面」或「安裝應用程式」')}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* iOS Guide */}
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 lg:p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Apple className="w-7 h-7 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">iOS</h3>
                        <p className="text-sm text-muted-foreground">
                          {t('appDownload.forIOS', '適用於 iPhone 和 iPad')}
                        </p>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex justify-center mb-6">
                      <div className="p-4 bg-white rounded-xl">
                        <QRCodeSVG value={currentUrl} size={140} />
                      </div>
                    </div>

                    <p className="text-center text-sm text-muted-foreground mb-4">
                      {t('appDownload.scanQR', '掃描二維碼訪問並安裝')}
                    </p>

                    <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium text-center mb-3">{t('appDownload.steps', '安裝步驟')}：</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">1</span>
                          <span>{t('appDownload.iosStep1', '使用 Safari 瀏覽器打開此頁面')}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">2</span>
                          <div className="flex items-center gap-1">
                            <span>{t('appDownload.iosStep2', '點擊底部')}</span>
                            <Share className="w-4 h-4" />
                            <span>{t('appDownload.shareButton', '分享按鈕')}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">3</span>
                          <div className="flex items-center gap-1">
                            <span>{t('appDownload.iosStep3', '選擇')}</span>
                            <Plus className="w-4 h-4" />
                            <span>{t('appDownload.addToHome', '「加入主畫面」')}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">4</span>
                          <span>{t('appDownload.iosStep4', '點擊右上角「新增」確認')}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Update Notes */}
          {config?.update_note && (
            <Card className="mt-8">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3">
                  更新說明
                </h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {config.update_note}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Features */}
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: '🔒', label: '安全交易' },
              { icon: '⚡', label: '快速執行' },
              { icon: '📊', label: '即時數據' },
              { icon: '🌍', label: '多語言支援' },
            ].map((feature, index) => (
              <div 
                key={index}
                className="text-center p-4 rounded-xl bg-muted/50"
              >
                <div className="text-2xl mb-2">{feature.icon}</div>
                <p className="text-sm font-medium">{feature.label}</p>
              </div>
            ))}
          </div>

          {/* PWA Benefits */}
          <Card className="mt-8">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 text-center">PWA 應用優勢</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-xl mb-2">🚀</div>
                  <p className="font-medium">無需下載</p>
                  <p className="text-muted-foreground text-xs mt-1">直接從瀏覽器安裝，無需應用商店</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-xl mb-2">💾</div>
                  <p className="font-medium">節省空間</p>
                  <p className="text-muted-foreground text-xs mt-1">佔用極少存儲空間</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-xl mb-2">🔄</div>
                  <p className="font-medium">自動更新</p>
                  <p className="text-muted-foreground text-xs mt-1">始終使用最新版本</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
