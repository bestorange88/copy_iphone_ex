import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminApi } from "@/hooks/useAdminData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Newspaper, RefreshCw, Loader2, Trash2, Edit, ExternalLink, Clock, Globe } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  created_at: string;
}

export const AdminNewsManager = () => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      setLoading(true);
      const { data, error } = await adminApi.select<NewsItem[]>('crypto_news', {
        order: { column: 'published_at', ascending: false }
      });

      if (error) throw new Error(error);
      setNewsItems(data || []);
    } catch (error: unknown) {
      console.error('Error loading news:', error);
      toast.error("加载新闻失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestNews = async () => {
    try {
      setFetching(true);
      const { data, error } = await supabase.functions.invoke('fetch-crypto-news');
      
      if (error) throw error;
      
      toast.success(data.message || "新闻采集成功");
      await loadNews();
    } catch (error: any) {
      console.error('Error fetching news:', error);
      toast.error("采集新闻失败");
    } finally {
      setFetching(false);
    }
  };

  const deleteNews = async (id: string) => {
    try {
      const { error } = await adminApi.delete('crypto_news', { id });

      if (error) throw new Error(error);
      
      toast.success("删除成功");
      await loadNews();
    } catch (error: unknown) {
      console.error('Error deleting news:', error);
      toast.error("删除失败");
    }
    setDeleteId(null);
  };

  const toggleHot = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await adminApi.update('crypto_news', { is_hot: !currentStatus }, { id });

      if (error) throw new Error(error);
      
      toast.success(currentStatus ? "已取消热门" : "已设为热门");
      await loadNews();
    } catch (error: unknown) {
      console.error('Error toggling hot status:', error);
      toast.error("操作失败");
    }
  };

  const getTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN });
  };

  const getCategoryName = (category: string) => {
    const categoryMap: Record<string, string> = {
      'market': '市场',
      'tech': '技术',
      'policy': '政策',
      'defi': 'DeFi',
      'general': '综合'
    };
    return categoryMap[category] || category;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5" />
                新闻管理
              </CardTitle>
              <CardDescription>
                管理平台新闻资讯，采集最新加密货币新闻
              </CardDescription>
            </div>
            <Button
              onClick={fetchLatestNews}
              disabled={fetching}
              className="gap-2"
            >
              {fetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              采集最新新闻
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : newsItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无新闻，点击"采集最新新闻"获取最新资讯
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>标题</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead>来源</TableHead>
                    <TableHead>发布时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newsItems.map((news) => (
                    <TableRow key={news.id}>
                      <TableCell className="max-w-md">
                        <div className="flex items-start gap-3">
                          {news.image_url && (
                            <img 
                              src={news.image_url} 
                              alt={news.title}
                              className="w-16 h-16 object-cover rounded flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium line-clamp-2">{news.title}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {news.summary}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getCategoryName(news.category)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Globe className="h-3 w-3" />
                          {news.source}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {getTimeAgo(news.published_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {news.is_hot && (
                          <Badge variant="destructive" className="text-xs">热门</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {news.source_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(news.source_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleHot(news.id, news.is_hot)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(news.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条新闻吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteNews(deleteId)}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};