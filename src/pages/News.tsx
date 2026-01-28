import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Newspaper, Zap, Globe, Clock, Loader2, ExternalLink, RefreshCw, TrendingUp, Shield, Cpu, Coins } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { zhCN, zhTW, enUS, ja, ko, de, fr, es, ar } from "date-fns/locale";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  source: string;
  source_url: string;
  image_url: string;
  category: string;
  published_at: string;
  is_hot: boolean;
  language: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_important: boolean;
  published_at: string;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  market: TrendingUp,
  tech: Cpu,
  policy: Shield,
  defi: Coins,
  general: Globe
};

const News = () => {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadNews();
      loadAnnouncements();
    }
  }, [user]);

  const loadNews = async () => {
    try {
      setLoadingNews(true);
      
      // Get current language for filtering
      const currentLang = i18n.language;
      const langFilter = currentLang.startsWith('zh') ? 'zh' : 
                        currentLang.startsWith('ja') ? 'ja' : 
                        currentLang.startsWith('ko') ? 'ko' : 'en';
      
      // First try to get news for current language
      const { data, error } = await supabase
        .from('crypto_news')
        .select('*')
        .eq('language', langFilter)
        .order('published_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // If no news in current language, get all news
      let newsData = data;
      if (!newsData || newsData.length === 0) {
        const result = await supabase
          .from('crypto_news')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(50);
        
        if (result.error) throw result.error;
        newsData = result.data;
      }
      
      setNewsItems(newsData || []);
    } catch (error: any) {
      console.error('Error loading news:', error);
      toast.error(t('common.error'));
    } finally {
      setLoadingNews(false);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_announcements')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error: any) {
      console.error('Error loading announcements:', error);
    }
  };

  const refreshNews = useCallback(async () => {
    try {
      setRefreshing(true);
      
      // Get language parameter based on current locale
      const currentLang = i18n.language;
      const langParam = currentLang.startsWith('zh') ? 'zh' : 
                       currentLang.startsWith('ja') ? 'ja' : 
                       currentLang.startsWith('ko') ? 'ko' : 'en';
      
      // Call the edge function to fetch fresh news
      const { data, error } = await supabase.functions.invoke('fetch-crypto-news', {
        body: { language: langParam }
      });
      
      if (error) {
        console.error('Refresh error:', error);
        toast.error(t('news.refresh_failed'));
        return;
      }
      
      if (data?.success) {
        toast.success(t('news.refresh_success', { count: data.count || 0 }));
        // Reload news from database
        await loadNews();
      } else {
        toast.error(data?.error || t('news.refresh_failed'));
      }
    } catch (error: any) {
      console.error('Error refreshing news:', error);
      toast.error(t('news.refresh_failed'));
    } finally {
      setRefreshing(false);
    }
  }, [i18n.language, t]);

  const getDateLocale = () => {
    const lang = i18n.language;
    if (lang === 'zh-CN') return zhCN;
    if (lang === 'zh-TW') return zhTW;
    if (lang === 'ja') return ja;
    if (lang === 'ko') return ko;
    if (lang === 'de') return de;
    if (lang === 'fr') return fr;
    if (lang === 'es') return es;
    if (lang === 'ar') return ar;
    return enUS;
  };

  const getTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: getDateLocale() });
  };

  const getCategoryName = (category: string) => {
    const categoryMap: Record<string, string> = {
      'market': t('news.market'),
      'tech': t('news.tech'),
      'policy': t('news.policy'),
      'defi': 'DeFi',
      'general': t('news.general')
    };
    return categoryMap[category] || category;
  };

  const filterNewsByCategory = (category: string) => {
    if (category === 'all') return newsItems;
    return newsItems.filter(item => item.category === category);
  };

  const getCategoryCount = (category: string) => {
    if (category === 'all') return newsItems.length;
    return newsItems.filter(item => item.category === category).length;
  };

  const renderNewsCard = (news: NewsItem) => {
    const CategoryIcon = categoryIcons[news.category] || Globe;
    
    return (
      <Card 
        key={news.id} 
        className="hover:border-primary/50 transition-all cursor-pointer group bg-gradient-to-br from-card to-card/50"
        onClick={() => setSelectedNews(news)}
      >
        <CardContent className="p-4 lg:p-6">
          <div className="flex gap-4">
            {news.image_url ? (
              <img 
                src={news.image_url} 
                alt={news.title}
                className="w-20 h-20 lg:w-24 lg:h-24 object-cover rounded-lg flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-lg flex-shrink-0 bg-primary/10 flex items-center justify-center">
                <CategoryIcon className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm lg:text-base group-hover:text-primary transition-colors line-clamp-2">
                  {news.title}
                  {news.is_hot && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      {t('news.hot')}
                    </Badge>
                  )}
                </h3>
              </div>
              <p className="text-xs lg:text-sm text-muted-foreground line-clamp-2">
                {news.summary}
              </p>
              <div className="flex items-center gap-2 lg:gap-4 text-xs text-muted-foreground flex-wrap">
                <Badge variant="outline" className="text-xs">
                  <CategoryIcon className="h-3 w-3 mr-1" />
                  {getCategoryName(news.category)}
                </Badge>
                <span className="flex items-center gap-1 truncate">
                  <Globe className="h-3 w-3 flex-shrink-0" />
                  {news.source}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  {getTimeAgo(news.published_at)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <div className="text-center py-12 space-y-4">
      <Newspaper className="h-16 w-16 mx-auto text-muted-foreground/50" />
      <div className="space-y-2">
        <p className="text-muted-foreground">{t('news.no_news')}</p>
        <Button onClick={refreshNews} disabled={refreshing} variant="outline">
          {refreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {t('news.fetch_news')}
        </Button>
      </div>
    </div>
  );

  if (loading || !user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6 mb-20 lg:mb-0 px-2 lg:px-0">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="text-center lg:text-left space-y-1">
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center justify-center lg:justify-start gap-3">
              <Newspaper className="h-7 w-7 lg:h-8 lg:w-8 text-primary" />
              {t('news.title')}
            </h1>
            <p className="text-sm lg:text-base text-muted-foreground">{t('news.subtitle')}</p>
          </div>
          <Button 
            onClick={refreshNews} 
            disabled={refreshing}
            variant="outline"
            className="self-center lg:self-auto"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {t('news.refresh')}
          </Button>
        </div>

        {/* Platform Announcements */}
        {announcements.length > 0 && (
          <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <CardContent className="p-4 lg:p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                {t('news.announcements')}
              </h2>
              <div className="space-y-2">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {announcement.is_important && (
                        <Badge variant="destructive" className="text-xs flex-shrink-0">
                          {t('news.important')}
                        </Badge>
                      )}
                      <span className="font-medium truncate group-hover:text-primary transition-colors">
                        {announcement.title}
                      </span>
                    </div>
                    <span className="text-xs lg:text-sm text-muted-foreground flex items-center gap-1 flex-shrink-0 ml-4">
                      <Clock className="h-3 w-3" />
                      {getTimeAgo(announcement.published_at)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-[600px] h-auto p-1">
            <TabsTrigger value="all" className="text-xs lg:text-sm py-2">
              {t('news.all')} ({getCategoryCount('all')})
            </TabsTrigger>
            <TabsTrigger value="market" className="text-xs lg:text-sm py-2">
              {t('news.market')} ({getCategoryCount('market')})
            </TabsTrigger>
            <TabsTrigger value="tech" className="text-xs lg:text-sm py-2">
              {t('news.tech')} ({getCategoryCount('tech')})
            </TabsTrigger>
            <TabsTrigger value="policy" className="text-xs lg:text-sm py-2">
              {t('news.policy')} ({getCategoryCount('policy')})
            </TabsTrigger>
            <TabsTrigger value="defi" className="text-xs lg:text-sm py-2">
              DeFi ({getCategoryCount('defi')})
            </TabsTrigger>
          </TabsList>

          {loadingNews ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : newsItems.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              {['all', 'market', 'tech', 'policy', 'defi'].map(category => (
                <TabsContent key={category} value={category} className="space-y-4 mt-6">
                  {filterNewsByCategory(category).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t('news.no_category_news')}
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {filterNewsByCategory(category).map(renderNewsCard)}
                    </div>
                  )}
                </TabsContent>
              ))}
            </>
          )}
        </Tabs>

        {/* News Detail Modal */}
        {selectedNews && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedNews(null)}
          >
            <Card 
              className="max-w-3xl w-full max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <CardContent className="p-4 lg:p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedNews.is_hot && (
                        <Badge variant="destructive">
                          {t('news.hot')}
                        </Badge>
                      )}
                      <Badge variant="outline">{getCategoryName(selectedNews.category)}</Badge>
                      <Badge variant="secondary">{selectedNews.language.toUpperCase()}</Badge>
                    </div>
                    <h2 className="text-xl lg:text-2xl font-bold">{selectedNews.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {selectedNews.source}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {getTimeAgo(selectedNews.published_at)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNews(null)}
                    className="text-muted-foreground hover:text-foreground text-2xl leading-none ml-4 p-2"
                  >
                    ×
                  </button>
                </div>
                
                {selectedNews.image_url && (
                  <img 
                    src={selectedNews.image_url} 
                    alt={selectedNews.title}
                    className="w-full max-h-80 object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="text-base lg:text-lg font-medium text-muted-foreground mb-4">
                    {selectedNews.summary}
                  </p>
                  {selectedNews.content && selectedNews.content !== selectedNews.summary && (
                    <div className="whitespace-pre-wrap text-sm lg:text-base leading-relaxed">
                      {selectedNews.content}
                    </div>
                  )}
                </div>
                
                {selectedNews.source_url && (
                  <div className="pt-4 border-t">
                    <a 
                      href={selectedNews.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {t('news.view_original')}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default News;
