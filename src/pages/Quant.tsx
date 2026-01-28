import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import { StrategyList } from "@/components/strategy/StrategyList";
import { CreateStrategyDialog } from "@/components/strategy/CreateStrategyDialog";
import { ExpertStrategies } from "@/components/quant/ExpertStrategies";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, 
  TrendingUp, 
  Shield, 
  Zap, 
  Clock, 
  LineChart, 
  Settings2, 
  BarChart3,
  Cpu,
  Target,
  Crown,
  Sparkles
} from "lucide-react";

export default function Quant() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return null;
  }

  const features = [
    {
      icon: Bot,
      titleKey: "quant.intro.feature1Title",
      descKey: "quant.intro.feature1Desc"
    },
    {
      icon: TrendingUp,
      titleKey: "quant.intro.feature2Title",
      descKey: "quant.intro.feature2Desc"
    },
    {
      icon: Shield,
      titleKey: "quant.intro.feature3Title",
      descKey: "quant.intro.feature3Desc"
    },
    {
      icon: Clock,
      titleKey: "quant.intro.feature4Title",
      descKey: "quant.intro.feature4Desc"
    }
  ];

  const strategyTypes = [
    {
      icon: BarChart3,
      titleKey: "quant.strategyTypes.gridTitle",
      descKey: "quant.strategyTypes.gridDesc"
    },
    {
      icon: Target,
      titleKey: "quant.strategyTypes.dcaTitle",
      descKey: "quant.strategyTypes.dcaDesc"
    },
    {
      icon: Zap,
      titleKey: "quant.strategyTypes.arbitrageTitle",
      descKey: "quant.strategyTypes.arbitrageDesc"
    },
    {
      icon: Cpu,
      titleKey: "quant.strategyTypes.customTitle",
      descKey: "quant.strategyTypes.customDesc"
    }
  ];

  return (
    <AppLayout>
      <div className="space-y-6 lg:space-y-8 mb-20 lg:mb-0 px-2 lg:px-0">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">{t("quant.title")}</h1>
          <p className="text-sm lg:text-base text-muted-foreground">{t("quant.description")}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 lg:gap-4 grid-cols-2 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs lg:text-sm text-muted-foreground">{t("quant.activeStrategies")}</div>
                  <div className="text-lg lg:text-2xl font-bold">0</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <div className="text-xs lg:text-sm text-muted-foreground">{t("quant.todayProfit")}</div>
                  <div className="text-lg lg:text-2xl font-bold text-green-500">+0.00%</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <LineChart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs lg:text-sm text-muted-foreground">{t("quant.totalProfit")}</div>
                  <div className="text-lg lg:text-2xl font-bold">0.00 USDT</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Settings2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs lg:text-sm text-muted-foreground">{t("quant.totalTrades")}</div>
                  <div className="text-lg lg:text-2xl font-bold">0</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Strategies Section with Tabs */}
        <Tabs defaultValue="expert" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto bg-muted/30 p-1 mb-4">
            <TabsTrigger value="expert" className="gap-2 data-[state=active]:bg-background">
              <Crown className="h-4 w-4" />
              <span>{t("quant.expertStrategies", "大神策略")}</span>
            </TabsTrigger>
            <TabsTrigger value="my" className="gap-2 data-[state=active]:bg-background">
              <Sparkles className="h-4 w-4" />
              <span>{t("quant.myStrategies", "我的策略")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expert" className="mt-0">
            <ExpertStrategies />
          </TabsContent>

          <TabsContent value="my" className="mt-0 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg lg:text-xl font-semibold">{t("quant.myStrategies")}</h2>
              <CreateStrategyDialog onStrategyCreated={() => setRefreshKey(prev => prev + 1)} />
            </div>
            <StrategyList key={refreshKey} />
          </TabsContent>
        </Tabs>

        {/* Strategy Types Section */}
        <div className="mt-8">
          <h2 className="text-lg lg:text-xl font-semibold mb-4">{t("quant.intro.strategyTypesTitle")}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {strategyTypes.map((type, index) => {
              const Icon = type.icon;
              return (
                <Card key={index} className="bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/50 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex flex-col items-center text-center">
                      <div className="p-3 rounded-xl bg-primary/10 mb-4">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2">{t(type.titleKey)}</h3>
                      <p className="text-sm text-muted-foreground">{t(type.descKey)}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* About Quantitative Trading Section */}
        <Card className="mt-8 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              {t("quant.intro.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground leading-relaxed">
              {t("quant.intro.description")}
            </p>

            {/* Features Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex flex-col items-center text-center p-4 rounded-lg bg-card/50 border border-border/50">
                    <div className="p-3 rounded-full bg-primary/10 mb-3">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="font-medium mb-1">{t(feature.titleKey)}</h4>
                    <p className="text-sm text-muted-foreground">{t(feature.descKey)}</p>
                  </div>
                );
              })}
            </div>

            {/* How It Works */}
            <div className="mt-6">
              <h3 className="font-semibold mb-4">{t("quant.intro.howItWorksTitle")}</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border/50">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">1</div>
                  <div>
                    <h4 className="font-medium">{t("quant.intro.step1Title")}</h4>
                    <p className="text-sm text-muted-foreground">{t("quant.intro.step1Desc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border/50">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">2</div>
                  <div>
                    <h4 className="font-medium">{t("quant.intro.step2Title")}</h4>
                    <p className="text-sm text-muted-foreground">{t("quant.intro.step2Desc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border/50">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">3</div>
                  <div>
                    <h4 className="font-medium">{t("quant.intro.step3Title")}</h4>
                    <p className="text-sm text-muted-foreground">{t("quant.intro.step3Desc")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Warning */}
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-destructive">{t("quant.intro.riskTitle")}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{t("quant.intro.riskDesc")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
