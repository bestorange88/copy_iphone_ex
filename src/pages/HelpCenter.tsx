import { useState } from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FeedbackForm } from "@/components/help/FeedbackForm";
import { 
  HelpCircle, 
  Info, 
  Shield, 
  TrendingUp, 
  Wallet, 
  CreditCard, 
  Repeat, 
  Zap, 
  BarChart3, 
  Newspaper,
  Percent,
  Pickaxe,
  Landmark,
  UserCheck,
  Building2,
  Users,
  Globe,
  Award,
  Target,
  Lock,
  Mail,
  MessageSquarePlus
} from "lucide-react";

const HelpCenter = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("about");

  // 關於我們內容
  const aboutSections = [
    {
      icon: Building2,
      title: t('help.about.company.title'),
      content: t('help.about.company.content')
    },
    {
      icon: Target,
      title: t('help.about.mission.title'),
      content: t('help.about.mission.content')
    },
    {
      icon: Users,
      title: t('help.about.team.title'),
      content: t('help.about.team.content')
    },
    {
      icon: Globe,
      title: t('help.about.global.title'),
      content: t('help.about.global.content')
    },
    {
      icon: Award,
      title: t('help.about.advantage.title'),
      content: t('help.about.advantage.content')
    },
    {
      icon: Lock,
      title: t('help.about.security.title'),
      content: t('help.about.security.content')
    }
  ];

  // 功能介紹
  const featureGuides = [
    {
      category: "trading",
      icon: TrendingUp,
      title: t('help.features.trading.title'),
      description: t('help.features.trading.description'),
      faqs: [
        { q: t('help.features.trading.faq1.q'), a: t('help.features.trading.faq1.a') },
        { q: t('help.features.trading.faq2.q'), a: t('help.features.trading.faq2.a') },
        { q: t('help.features.trading.faq3.q'), a: t('help.features.trading.faq3.a') }
      ]
    },
    {
      category: "contracts",
      icon: BarChart3,
      title: t('help.features.contracts.title'),
      description: t('help.features.contracts.description'),
      faqs: [
        { q: t('help.features.contracts.faq1.q'), a: t('help.features.contracts.faq1.a') },
        { q: t('help.features.contracts.faq2.q'), a: t('help.features.contracts.faq2.a') },
        { q: t('help.features.contracts.faq3.q'), a: t('help.features.contracts.faq3.a') }
      ]
    },
    {
      category: "assets",
      icon: Wallet,
      title: t('help.features.assets.title'),
      description: t('help.features.assets.description'),
      faqs: [
        { q: t('help.features.assets.faq1.q'), a: t('help.features.assets.faq1.a') },
        { q: t('help.features.assets.faq2.q'), a: t('help.features.assets.faq2.a') }
      ]
    },
    {
      category: "deposit",
      icon: CreditCard,
      title: t('help.features.deposit.title'),
      description: t('help.features.deposit.description'),
      faqs: [
        { q: t('help.features.deposit.faq1.q'), a: t('help.features.deposit.faq1.a') },
        { q: t('help.features.deposit.faq2.q'), a: t('help.features.deposit.faq2.a') },
        { q: t('help.features.deposit.faq3.q'), a: t('help.features.deposit.faq3.a') }
      ]
    },
    {
      category: "swap",
      icon: Repeat,
      title: t('help.features.swap.title'),
      description: t('help.features.swap.description'),
      faqs: [
        { q: t('help.features.swap.faq1.q'), a: t('help.features.swap.faq1.a') },
        { q: t('help.features.swap.faq2.q'), a: t('help.features.swap.faq2.a') }
      ]
    },
    {
      category: "quant",
      icon: Zap,
      title: t('help.features.quant.title'),
      description: t('help.features.quant.description'),
      faqs: [
        { q: t('help.features.quant.faq1.q'), a: t('help.features.quant.faq1.a') },
        { q: t('help.features.quant.faq2.q'), a: t('help.features.quant.faq2.a') },
        { q: t('help.features.quant.faq3.q'), a: t('help.features.quant.faq3.a') }
      ]
    },
    {
      category: "earn",
      icon: Percent,
      title: t('help.features.earn.title'),
      description: t('help.features.earn.description'),
      faqs: [
        { q: t('help.features.earn.faq1.q'), a: t('help.features.earn.faq1.a') },
        { q: t('help.features.earn.faq2.q'), a: t('help.features.earn.faq2.a') }
      ]
    },
    {
      category: "kyc",
      icon: UserCheck,
      title: t('help.features.kyc.title'),
      description: t('help.features.kyc.description'),
      faqs: [
        { q: t('help.features.kyc.faq1.q'), a: t('help.features.kyc.faq1.a') },
        { q: t('help.features.kyc.faq2.q'), a: t('help.features.kyc.faq2.a') }
      ]
    }
  ];

  // 常見問題
  const generalFAQs = [
    { q: t('help.faq.account.q1'), a: t('help.faq.account.a1') },
    { q: t('help.faq.account.q2'), a: t('help.faq.account.a2') },
    { q: t('help.faq.security.q1'), a: t('help.faq.security.a1') },
    { q: t('help.faq.security.q2'), a: t('help.faq.security.a2') },
    { q: t('help.faq.trading.q1'), a: t('help.faq.trading.a1') },
    { q: t('help.faq.trading.q2'), a: t('help.faq.trading.a2') }
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <HelpCircle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">{t('help.title')}</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('help.subtitle')}
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-4">
            <TabsTrigger value="about" className="gap-2">
              <Info className="h-4 w-4" />
              {t('help.tabs.about')}
            </TabsTrigger>
            <TabsTrigger value="features" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('help.tabs.features')}
            </TabsTrigger>
            <TabsTrigger value="faq" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              {t('help.tabs.faq')}
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2">
              <MessageSquarePlus className="h-4 w-4" />
              {t('help.tabs.feedback')}
            </TabsTrigger>
          </TabsList>

          {/* 關於我們 */}
          <TabsContent value="about" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aboutSections.map((section, index) => (
                <Card key={index} className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <section.icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {section.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 聯繫我們 */}
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  {t('help.contact.title')}
                </CardTitle>
                <CardDescription>{t('help.contact.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">{t('help.contact.email')}:</span>{" "}
                  <span className="font-medium">support@arx.com</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">{t('help.contact.hours')}:</span>{" "}
                  <span className="font-medium">24/7</span>
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 功能介紹 */}
          <TabsContent value="features" className="space-y-4">
            {featureGuides.map((feature, index) => (
              <Card key={index} className="bg-card/50 border-border/50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <CardDescription className="mt-1">{feature.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {feature.faqs.map((faq, faqIndex) => (
                      <AccordionItem key={faqIndex} value={`${feature.category}-${faqIndex}`}>
                        <AccordionTrigger className="text-sm hover:text-primary">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground text-sm">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* 常見問題 */}
          <TabsContent value="faq" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  {t('help.faq.title')}
                </CardTitle>
                <CardDescription>{t('help.faq.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {generalFAQs.map((faq, index) => (
                    <AccordionItem key={index} value={`faq-${index}`}>
                      <AccordionTrigger className="text-sm hover:text-primary text-left">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-sm">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* 安全提示 */}
            <Card className="bg-destructive/5 border-destructive/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Shield className="h-5 w-5" />
                  {t('help.security.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• {t('help.security.tip1')}</p>
                <p>• {t('help.security.tip2')}</p>
                <p>• {t('help.security.tip3')}</p>
                <p>• {t('help.security.tip4')}</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 意見反饋 */}
          <TabsContent value="feedback">
            <FeedbackForm />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default HelpCenter;
