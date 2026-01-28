import { useState, useEffect } from "react";
import { adminApi } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Users, Globe } from "lucide-react";
import { createAuditLog, AuditActions, ResourceTypes } from "@/services/auditLog";

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_type: string;
  target_user_ids: string[];
  is_active: boolean;
  created_at: string;
}

interface User {
  id: string;
  username: string;
  email: string;
}

export const AdminAnnouncementManager = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    target_type: "all",
    target_user_ids: [] as string[]
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    fetchAnnouncements();
    fetchUsers();
  }, []);

  const fetchAnnouncements = async () => {
    const { data, error } = await adminApi.select<Announcement[]>('user_announcements', {
      order: { column: 'created_at', ascending: false }
    });

    if (error) {
      toast.error("加载公告失败");
      console.error(error);
      return;
    }

    setAnnouncements(data || []);
  };

  const fetchUsers = async () => {
    const { data, error } = await adminApi.select<User[]>('profiles', {
      select: 'id, username, email',
      order: { column: 'username', ascending: true }
    });

    if (error) {
      toast.error("加载用户列表失败");
      console.error(error);
      return;
    }

    setUsers(data || []);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      toast.error("请填写标题和内容");
      return;
    }

    if (formData.target_type === 'specific' && selectedUsers.length === 0) {
      toast.error("请选择至少一个接收用户");
      return;
    }

    const announcementData = {
      title: formData.title,
      content: formData.content,
      target_type: formData.target_type,
      target_user_ids: formData.target_type === 'all' ? [] : selectedUsers
    };

    if (editingId) {
      const { error } = await adminApi.update('user_announcements', announcementData, { id: editingId });

      if (error) {
        toast.error("更新公告失败");
        console.error(error);
        return;
      }

      await createAuditLog({
        action: 'admin_update_announcement',
        resource_type: ResourceTypes.SYSTEM_CONFIG,
        resource_id: editingId,
        details: announcementData
      });

      toast.success("公告已更新");
    } else {
      const { error } = await adminApi.insert('user_announcements', announcementData);

      if (error) {
        toast.error("创建公告失败");
        console.error(error);
        return;
      }

      await createAuditLog({
        action: 'admin_create_announcement',
        resource_type: ResourceTypes.SYSTEM_CONFIG,
        resource_id: 'new',
        details: announcementData
      });

      toast.success("公告已发布");
    }

    handleCloseDialog();
    fetchAnnouncements();
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      target_type: announcement.target_type,
      target_user_ids: announcement.target_user_ids
    });
    setSelectedUsers(announcement.target_user_ids || []);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个公告吗？")) return;

    const { error } = await adminApi.delete('user_announcements', { id });

    if (error) {
      toast.error("删除失败");
      console.error(error);
      return;
    }

    await createAuditLog({
      action: 'admin_delete_announcement',
      resource_type: ResourceTypes.SYSTEM_CONFIG,
      resource_id: id,
      details: {}
    });

    toast.success("公告已删除");
    fetchAnnouncements();
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await adminApi.update('user_announcements', { is_active: !currentStatus }, { id });

    if (error) {
      toast.error("更新失败");
      console.error(error);
      return;
    }

    toast.success(currentStatus ? "公告已停用" : "公告已启用");
    fetchAnnouncements();
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingId(null);
    setFormData({
      title: "",
      content: "",
      target_type: "all",
      target_user_ids: []
    });
    setSelectedUsers([]);
  };

  const handleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>用户公告管理</CardTitle>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新建公告
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{announcement.title}</h3>
                      <Badge variant={announcement.is_active ? "default" : "secondary"}>
                        {announcement.is_active ? "启用" : "停用"}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        {announcement.target_type === 'all' ? (
                          <>
                            <Globe className="h-3 w-3" />
                            全员
                          </>
                        ) : (
                          <>
                            <Users className="h-3 w-3" />
                            {announcement.target_user_ids.length}人
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      发布时间: {new Date(announcement.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(announcement.id, announcement.is_active)}
                    >
                      {announcement.is_active ? "停用" : "启用"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(announcement)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(announcement.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {announcements.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                暂无公告
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑公告" : "新建公告"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>标题</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="请输入公告标题"
              />
            </div>

            <div>
              <Label>内容</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="请输入公告内容"
                rows={6}
              />
            </div>

            <div>
              <Label>发送对象</Label>
              <Select
                value={formData.target_type}
                onValueChange={(value) => {
                  setFormData({ ...formData, target_type: value });
                  if (value === 'all') setSelectedUsers([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全体用户</SelectItem>
                  <SelectItem value="specific">指定用户</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.target_type === 'specific' && (
              <div>
                <Label>选择用户 ({selectedUsers.length} 人已选)</Label>
                <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className={`p-2 rounded cursor-pointer transition-colors ${
                        selectedUsers.includes(user.id)
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => handleUserSelection(user.id)}
                    >
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm opacity-80">{user.email}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleCloseDialog} className="flex-1">
                取消
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                {editingId ? "更新" : "发布"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
