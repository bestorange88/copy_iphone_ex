import { useState, useEffect } from "react";
import { adminApi } from "@/hooks/useAdminData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquare, RefreshCw, Eye, Reply, Trash2, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Feedback {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export const AdminFeedbackManager = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const filters: Record<string, unknown> = {};
      if (statusFilter !== "all") {
        filters.status = statusFilter;
      }

      const { data, error } = await adminApi.select<Feedback[]>('user_feedback', {
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        order: { column: 'created_at', ascending: false }
      });

      if (error) throw new Error(error);
      setFeedbacks(data || []);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      toast.error("載入反饋失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [statusFilter]);

  const handleReply = async () => {
    if (!selectedFeedback || !replyText.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await adminApi.update('user_feedback', {
        admin_reply: replyText.trim(),
        replied_at: new Date().toISOString(),
        status: 'replied'
      }, { id: selectedFeedback.id });

      if (error) throw new Error(error);

      toast.success("回覆成功");
      setReplyDialogOpen(false);
      setReplyText("");
      setSelectedFeedback(null);
      fetchFeedbacks();
    } catch (error) {
      console.error('Error replying:', error);
      toast.error("回覆失敗");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const { error } = await adminApi.update('user_feedback', { status }, { id });

      if (error) throw new Error(error);
      toast.success("狀態已更新");
      fetchFeedbacks();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error("更新失敗");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此反饋嗎？")) return;

    try {
      const { error } = await adminApi.delete('user_feedback', { id });

      if (error) throw new Error(error);
      toast.success("已刪除");
      fetchFeedbacks();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error("刪除失敗");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">待處理</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-500">處理中</Badge>;
      case 'replied':
        return <Badge className="bg-green-500">已回覆</Badge>;
      case 'closed':
        return <Badge variant="outline">已關閉</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      general: "一般問題",
      bug: "Bug 回報",
      feature: "功能建議",
      account: "帳戶問題",
      trading: "交易問題",
      other: "其他"
    };
    return labels[category] || category;
  };

  const filteredFeedbacks = feedbacks.filter(f => 
    f.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              用戶反饋管理
            </CardTitle>
            <CardDescription>查看和回覆用戶提交的意見反饋</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchFeedbacks}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索主題、郵箱或姓名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="篩選狀態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="pending">待處理</SelectItem>
              <SelectItem value="processing">處理中</SelectItem>
              <SelectItem value="replied">已回覆</SelectItem>
              <SelectItem value="closed">已關閉</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            暫無反饋記錄
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>提交時間</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>郵箱</TableHead>
                  <TableHead>類別</TableHead>
                  <TableHead>主題</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedbacks.map((feedback) => (
                  <TableRow key={feedback.id}>
                    <TableCell className="text-sm">
                      {format(new Date(feedback.created_at), 'MM-dd HH:mm')}
                    </TableCell>
                    <TableCell>{feedback.name}</TableCell>
                    <TableCell className="text-sm">{feedback.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryLabel(feedback.category)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {feedback.subject}
                    </TableCell>
                    <TableCell>{getStatusBadge(feedback.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedFeedback(feedback);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedFeedback(feedback);
                            setReplyText(feedback.admin_reply || "");
                            setReplyDialogOpen(true);
                          }}
                        >
                          <Reply className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(feedback.id)}
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

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>反饋詳情</DialogTitle>
              <DialogDescription>查看用戶提交的反饋內容</DialogDescription>
            </DialogHeader>
            {selectedFeedback && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">姓名：</span>
                    <span className="ml-2">{selectedFeedback.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">郵箱：</span>
                    <span className="ml-2">{selectedFeedback.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">類別：</span>
                    <span className="ml-2">{getCategoryLabel(selectedFeedback.category)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">狀態：</span>
                    <span className="ml-2">{getStatusBadge(selectedFeedback.status)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">提交時間：</span>
                    <span className="ml-2">{format(new Date(selectedFeedback.created_at), 'yyyy-MM-dd HH:mm:ss')}</span>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground text-sm mb-1">主題</p>
                  <p className="font-medium">{selectedFeedback.subject}</p>
                </div>

                <div>
                  <p className="text-muted-foreground text-sm mb-1">內容</p>
                  <div className="p-3 bg-muted/50 rounded-lg whitespace-pre-wrap">
                    {selectedFeedback.message}
                  </div>
                </div>

                {selectedFeedback.admin_reply && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">管理員回覆</p>
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg whitespace-pre-wrap">
                      {selectedFeedback.admin_reply}
                    </div>
                    {selectedFeedback.replied_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        回覆時間：{format(new Date(selectedFeedback.replied_at), 'yyyy-MM-dd HH:mm:ss')}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Select
                    value={selectedFeedback.status}
                    onValueChange={(value) => {
                      handleUpdateStatus(selectedFeedback.id, value);
                      setSelectedFeedback({ ...selectedFeedback, status: value });
                    }}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">待處理</SelectItem>
                      <SelectItem value="processing">處理中</SelectItem>
                      <SelectItem value="replied">已回覆</SelectItem>
                      <SelectItem value="closed">已關閉</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reply Dialog */}
        <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>回覆反饋</DialogTitle>
              <DialogDescription>
                {selectedFeedback?.subject}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">用戶訊息：</p>
                <div className="p-3 bg-muted/50 rounded-lg text-sm max-h-32 overflow-y-auto">
                  {selectedFeedback?.message}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">回覆內容：</p>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="輸入回覆內容..."
                  rows={5}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleReply} disabled={submitting || !replyText.trim()}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    發送中...
                  </>
                ) : (
                  "發送回覆"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
