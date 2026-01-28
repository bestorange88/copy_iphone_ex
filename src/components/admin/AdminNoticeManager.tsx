import { useState, useEffect } from "react";
import { adminApi } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Volume2, Link, Calendar } from "lucide-react";
import { createAuditLog, AuditActions, ResourceTypes } from "@/services/auditLog";

interface Notice {
  id: string;
  content: string;
  link_url: string | null;
  priority: number;
  is_active: boolean;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string;
}

export const AdminNoticeManager = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    content: "",
    link_url: "",
    priority: 0,
    is_active: true,
    start_time: "",
    end_time: ""
  });

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    setLoading(true);
    const { data, error } = await adminApi.select<Notice[]>('platform_notices', {
      order: { column: 'priority', ascending: false }
    });

    if (error) {
      toast.error("加載公告失敗");
      console.error(error);
    } else {
      setNotices(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.content.trim()) {
      toast.error("請輸入公告內容");
      return;
    }

    const noticeData = {
      content: formData.content.trim(),
      link_url: formData.link_url.trim() || null,
      priority: formData.priority,
      is_active: formData.is_active,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null
    };

    if (editingId) {
      const { error } = await adminApi.update('platform_notices', noticeData, { id: editingId });

      if (error) {
        toast.error("更新公告失敗");
        console.error(error);
        return;
      }

      await createAuditLog({
        action: 'admin_update_notice',
        resource_type: ResourceTypes.SYSTEM_CONFIG,
        resource_id: editingId,
        details: noticeData
      });

      toast.success("公告已更新");
    } else {
      const { error } = await adminApi.insert('platform_notices', noticeData);

      if (error) {
        toast.error("創建公告失敗");
        console.error(error);
        return;
      }

      await createAuditLog({
        action: 'admin_create_notice',
        resource_type: ResourceTypes.SYSTEM_CONFIG,
        resource_id: 'new',
        details: noticeData
      });

      toast.success("公告已發布");
    }

    handleCloseDialog();
    fetchNotices();
  };

  const handleEdit = (notice: Notice) => {
    setEditingId(notice.id);
    setFormData({
      content: notice.content,
      link_url: notice.link_url || "",
      priority: notice.priority,
      is_active: notice.is_active,
      start_time: notice.start_time ? notice.start_time.slice(0, 16) : "",
      end_time: notice.end_time ? notice.end_time.slice(0, 16) : ""
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除這條公告嗎？")) return;

    const { error } = await adminApi.delete('platform_notices', { id });

    if (error) {
      toast.error("刪除失敗");
      console.error(error);
      return;
    }

    await createAuditLog({
      action: 'admin_delete_notice',
      resource_type: ResourceTypes.SYSTEM_CONFIG,
      resource_id: id,
      details: {}
    });

    toast.success("公告已刪除");
    fetchNotices();
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await adminApi.update('platform_notices', { is_active: !currentStatus }, { id });

    if (error) {
      toast.error("更新失敗");
      console.error(error);
      return;
    }

    toast.success(currentStatus ? "公告已停用" : "公告已啟用");
    fetchNotices();
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingId(null);
    setFormData({
      content: "",
      link_url: "",
      priority: 0,
      is_active: true,
      start_time: "",
      end_time: ""
    });
  };

  const isNoticeActive = (notice: Notice) => {
    if (!notice.is_active) return false;
    
    const now = new Date();
    if (notice.start_time && new Date(notice.start_time) > now) return false;
    if (notice.end_time && new Date(notice.end_time) < now) return false;
    
    return true;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              站內公告管理（跑馬燈）
            </CardTitle>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新增公告
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : notices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暫無公告</div>
          ) : (
            <div className="space-y-3">
              {notices.map((notice) => (
                <div 
                  key={notice.id} 
                  className="p-4 border rounded-lg space-y-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-2">
                      {/* 狀態標籤 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={isNoticeActive(notice) ? "default" : "secondary"}>
                          {isNoticeActive(notice) ? "顯示中" : "未顯示"}
                        </Badge>
                        <Badge variant="outline">優先級: {notice.priority}</Badge>
                        {notice.link_url && (
                          <Badge variant="outline" className="gap-1">
                            <Link className="h-3 w-3" />
                            有連結
                          </Badge>
                        )}
                      </div>

                      {/* 公告內容 */}
                      <p className="text-sm">{notice.content}</p>

                      {/* 時間資訊 */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {notice.start_time && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            開始: {new Date(notice.start_time).toLocaleString('zh-TW')}
                          </span>
                        )}
                        {notice.end_time && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            結束: {new Date(notice.end_time).toLocaleString('zh-TW')}
                          </span>
                        )}
                        <span>
                          創建: {new Date(notice.created_at).toLocaleString('zh-TW')}
                        </span>
                      </div>
                    </div>

                    {/* 操作按鈕 */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(notice.id, notice.is_active)}
                      >
                        {notice.is_active ? "停用" : "啟用"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(notice)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(notice.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 編輯/新增對話框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "編輯公告" : "新增公告"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>公告內容 *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="請輸入公告內容，將在行情頁頂部滾動顯示"
                rows={3}
              />
            </div>

            <div>
              <Label>跳轉連結（可選）</Label>
              <Input
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                placeholder="https://example.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                用戶點擊公告時將跳轉到此連結
              </p>
            </div>

            <div>
              <Label>優先級</Label>
              <Input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                數字越大優先級越高，將優先顯示
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>開始時間（可選）</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label>結束時間（可選）</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>立即啟用</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleCloseDialog} className="flex-1">
                取消
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                {editingId ? "更新" : "發布"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
