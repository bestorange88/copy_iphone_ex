import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AnnouncementDialog } from "@/components/home/AnnouncementDialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Shield, Zap, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import arxLogo from "@/assets/arx-logo-text.png";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && user) {
      navigate("/trade");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return null;
  }

  return (
    <>
      <AnnouncementDialog />
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Animated Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* Flowing gradient orbs - using viewport-relative sizes */}
          <div className="absolute top-1/4 -left-1/4 w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-primary/20 rounded-full blur-[120px] animate-glow-drift" />
          <div className="absolute top-3/4 -right-1/4 w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-primary/15 rounded-full blur-[100px] animate-glow-drift" style={{ animationDelay: '-5s' }} />
          <div className="absolute -top-1/4 right-1/3 w-[35vw] h-[35vw] max-w-[400px] max-h-[400px] bg-accent/20 rounded-full blur-[80px] animate-glow-pulse" />
          
          {/* Floating particles */}
          <div className="absolute top-[10%] left-[15%] w-2 h-2 bg-primary/40 rounded-full animate-float" style={{ animationDelay: '0s' }} />
          <div className="absolute top-[20%] right-[25%] w-1.5 h-1.5 bg-primary/30 rounded-full animate-float" style={{ animationDelay: '-2s' }} />
          <div className="absolute top-[60%] left-[10%] w-1 h-1 bg-primary/50 rounded-full animate-float" style={{ animationDelay: '-4s' }} />
          <div className="absolute top-[40%] right-[15%] w-2.5 h-2.5 bg-accent/40 rounded-full animate-float" style={{ animationDelay: '-1s' }} />
          <div className="absolute top-[70%] right-[35%] w-1.5 h-1.5 bg-primary/35 rounded-full animate-float" style={{ animationDelay: '-3s' }} />
          <div className="absolute top-[85%] left-[25%] w-2 h-2 bg-accent/30 rounded-full animate-float" style={{ animationDelay: '-5s' }} />
          <div className="absolute top-[30%] left-[45%] w-1 h-1 bg-primary/45 rounded-full animate-float" style={{ animationDelay: '-6s' }} />
          <div className="absolute top-[50%] right-[45%] w-1.5 h-1.5 bg-accent/35 rounded-full animate-float" style={{ animationDelay: '-7s' }} />
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>
        {/* Header */}
        <header className="border-b-0 after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-primary/50 after:to-transparent backdrop-blur-xl bg-background/80 sticky top-0 z-50 relative">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={arxLogo} alt="ARX" className="h-10 object-contain" />
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <Button variant="ghost" onClick={() => navigate("/auth")}>
                {t('common.login')}
              </Button>
              <Button onClick={() => navigate("/auth")}>
                {t('common.signup')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center relative z-10">
          <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                {t('home.hero_title')}
              </span>
              <br />
              <span className="text-foreground">
                {t('home.hero_subtitle')}
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('home.hero_description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
                {t('home.start_trading')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/markets")} className="text-lg px-8">
                {t('home.browse_markets')}
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-20 relative z-10">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="p-6 rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('home.feature_security_title')}</h3>
              <p className="text-muted-foreground">
                {t('home.feature_security_desc')}
              </p>
            </div>

            <div className="p-6 rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('home.feature_speed_title')}</h3>
              <p className="text-muted-foreground">
                {t('home.feature_speed_desc')}
              </p>
            </div>

            <div className="p-6 rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('home.feature_quant_title')}</h3>
              <p className="text-muted-foreground">
                {t('home.feature_quant_desc')}
              </p>
            </div>

            <div className="p-6 rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('home.feature_tools_title')}</h3>
              <p className="text-muted-foreground">
                {t('home.feature_tools_desc')}
              </p>
            </div>

            <div className="p-6 rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('home.feature_global_title')}</h3>
              <p className="text-muted-foreground">
                {t('home.feature_global_desc')}
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center p-12 rounded-2xl border border-border/40 bg-gradient-to-br from-primary/5 via-background to-accent/5 backdrop-blur-sm">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('home.cta_title')}
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              {t('home.cta_description')}
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-12">
              {t('home.cta_button')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t-0 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-primary/50 before:to-transparent bg-card/30 backdrop-blur-sm mt-20 relative z-10">
          <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
            <p>{t('home.footer_copyright')}</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Index;
