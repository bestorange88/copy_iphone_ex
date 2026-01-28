import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
}

export const AnnouncementDialog = () => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    checkForAnnouncements();
  }, []);

  const checkForAnnouncements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 获取用户未读的公告
      const { data: announcements, error: announcementsError } = await supabase
        .from('user_announcements')
        .select('id, title, content')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (announcementsError) throw announcementsError;

      if (!announcements || announcements.length === 0) return;

      // 获取用户已读的公告ID
      const { data: reads, error: readsError } = await supabase
        .from('user_announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id);

      if (readsError) throw readsError;

      const readIds = new Set(reads?.map(r => r.announcement_id) || []);

      // 找到第一个未读的公告
      const unreadAnnouncement = announcements.find(a => !readIds.has(a.id));

      if (unreadAnnouncement) {
        setAnnouncement(unreadAnnouncement);
        setShowDialog(true);
      }
    } catch (error) {
      console.error('Error checking announcements:', error);
    }
  };

  const handleClose = async () => {
    if (!announcement) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 标记为已读
      await supabase
        .from('user_announcement_reads')
        .insert({
          announcement_id: announcement.id,
          user_id: user.id
        });

      setShowDialog(false);
      setAnnouncement(null);

      // 检查是否还有其他未读公告
      setTimeout(() => {
        checkForAnnouncements();
      }, 500);
    } catch (error) {
      console.error('Error marking announcement as read:', error);
      setShowDialog(false);
    }
  };

  if (!announcement) return null;

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <DialogTitle>{announcement.title}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {announcement.content}
          </p>
          <Button onClick={handleClose} className="w-full">
            我知道了
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
