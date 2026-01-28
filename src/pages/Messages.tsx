import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, XCircle, DollarSign, Shield, TrendingUp, TrendingDown, Loader2, CheckCheck } from "lucide-react";
import { getUserMessages, markAsRead, markAllAsRead, SystemMessage } from "@/services/systemMessageService";
import { toast } from "sonner";
import { format } from "date-fns";

const getMessageIcon = (type: string) => {
  switch (type) {
    case "contract_win":
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    case "contract_lose":
      return <TrendingDown className="h-5 w-5 text-red-500" />;
    case "deposit_approved":
      return <DollarSign className="h-5 w-5 text-green-500" />;
    case "deposit_rejected":
      return <DollarSign className="h-5 w-5 text-red-500" />;
    case "withdraw_approved":
      return <DollarSign className="h-5 w-5 text-blue-500" />;
    case "withdraw_rejected":
      return <DollarSign className="h-5 w-5 text-red-500" />;
    case "kyc_basic_approved":
    case "kyc_advanced_approved":
      return <Shield className="h-5 w-5 text-green-500" />;
    case "kyc_basic_rejected":
    case "kyc_advanced_rejected":
      return <Shield className="h-5 w-5 text-red-500" />;
    default:
      return <Bell className="h-5 w-5 text-primary" />;
  }
};

const getMessageBadge = (type: string) => {
  const isSuccess = type.includes("approved") || type.includes("win");
  const isError = type.includes("rejected") || type.includes("lose");
  
  if (isSuccess) {
    return <Badge variant="default" className="bg-green-500">成功</Badge>;
  }
  if (isError) {
    return <Badge variant="destructive">失敗</Badge>;
  }
  return <Badge variant="outline">通知</Badge>;
};

const Messages = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserMessages(user.id);
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error("加載消息失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    await markAsRead(messageId);
    setMessages(messages.map(m => 
      m.id === messageId ? { ...m, is_read: true } : m
    ));
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    await markAllAsRead(user.id);
    setMessages(messages.map(m => ({ ...m, is_read: true })));
    toast.success("已全部標記為已讀");
  };

  if (authLoading || !user) {
    return null;
  }

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <AppLayout>
      <div className="space-y-6 mb-20 lg:mb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">系統消息</h1>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} 條未讀消息` : '暫無未讀消息'}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-1" />
              全部已讀
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">消息列表</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暫無系統消息</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                      message.is_read 
                        ? 'bg-background border-border' 
                        : 'bg-primary/5 border-primary/20'
                    }`}
                    onClick={() => !message.is_read && handleMarkAsRead(message.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getMessageIcon(message.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{message.title}</span>
                          {getMessageBadge(message.type)}
                          {!message.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {message.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(message.created_at), 'yyyy-MM-dd HH:mm:ss')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Messages;
