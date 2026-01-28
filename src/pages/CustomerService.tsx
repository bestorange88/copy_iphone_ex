import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { connectSseStream } from "@/lib/sse";
import { ArrowLeft, Send, Image, Loader2, Bot, Headset, X, Check, CheckCheck } from "lucide-react";
import RatingDialog from "@/components/cs/RatingDialog";
import { useCsImageUpload } from "@/hooks/useCsImageUpload";

interface Message {
  id: string;
  sender_type: string;
  content: string;
  message_type: string;
  image_url: string | null;
  created_at: string;
  read_at?: string | null;
  is_read?: boolean;
}

interface Conversation {
  id: string;
  status: string;
  is_ai_mode: boolean;
}

const CustomerService = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [conversationToRate, setConversationToRate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, uploading } = useCsImageUpload();

    // Check auth - allow guest access
    useEffect(() => {
      const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
        } else {
          // 允许游客访问，创建临时游客身份
          const guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          setUser({ id: guestId, email: null, isGuest: true });
        }
        setLoading(false);
      };
      checkAuth();
    }, []);

  // Start or get conversation
  useEffect(() => {
    if (!user) return;

    const startConversation = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('cs-user-chat', {
          body: { 
            action: 'start_conversation',
            guest_id: user.isGuest ? user.id : undefined
          }
        });

        if (error) throw error;
        if (data?.data) {
          setConversation(data.data);
          // If switched to human, reload messages to show the system message
          if (data?.switched_to_human) {
            // Trigger message reload
            setTimeout(() => {
              loadMessages();
            }, 500);
          }
        }
      } catch (error: any) {
        console.error('Failed to start conversation:', error);
        toast({
          title: "連接失敗",
          description: "無法連接客服系統，請稍後重試",
          variant: "destructive"
        });
      }
    };

    startConversation();
  }, [user, toast]);

  // Load messages
  const loadMessages = async () => {
    if (!conversation || !user) return;

    try {
      const { data, error } = await supabase.functions.invoke('cs-user-chat', {
        body: { 
          action: 'get_messages', 
          conversation_id: conversation.id,
          guest_id: user.isGuest ? user.id : undefined
        }
      });

      if (error) throw error;
      if (data?.data) {
        setMessages(data.data);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // Mark messages as read when viewing
  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    try {
      await supabase.functions.invoke('cs-user-chat', {
        body: { 
          action: 'mark_messages_read', 
          conversation_id: conversationId,
          guest_id: user?.isGuest ? user.id : undefined
        }
      });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, [user]);

  // Track if SSE has been initialized for current conversation
  const sseInitializedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!conversation) return;

    loadMessages();
    // Mark messages as read when opening conversation
    markMessagesAsRead(conversation.id);

    // Prevent duplicate SSE connections for the same conversation
    if (sseInitializedRef.current === conversation.id) {
      return;
    }
    sseInitializedRef.current = conversation.id;

    const abortController = new AbortController();

    const run = async () => {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

      // 兼容：如果拿不到关键信息则不启动
      if (!baseUrl || !apikey) {
        console.error('Missing Supabase URL or API key for SSE');
        return;
      }

      while (!abortController.signal.aborted) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token;
          
          // 游客用户跳过 SSE 连接，使用轮询代替
          if (!accessToken && user?.isGuest) {
            // 游客使用轮询方式获取消息
            const pollMessages = async () => {
              while (!abortController.signal.aborted) {
                await loadMessages();
                await new Promise(r => setTimeout(r, 3000)); // 每3秒轮询一次
              }
            };
            pollMessages();
            return;
          }
          
          if (!accessToken) {
            console.log('No access token, waiting...');
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }

          console.log('Connecting to SSE for conversation:', conversation.id);
          const url = new URL(`${baseUrl}/functions/v1/cs-sse`);
          url.searchParams.set('topic', 'messages');
          url.searchParams.set('conversation_id', conversation.id);
          // 取最近一段时间，避免启动窗口内漏消息；靠 id 去重
          url.searchParams.set('since', new Date(Date.now() - 30_000).toISOString());
          url.searchParams.set('since_read', new Date(Date.now() - 5 * 60_000).toISOString());

          await connectSseStream({
            url: url.toString(),
            headers: {
              apikey,
              Authorization: `Bearer ${accessToken}`,
            },
            signal: abortController.signal,
            onEvent: (evt) => {
              if (evt.event === 'message') {
                try {
                  const msg = JSON.parse(evt.data) as Message;
                  setMessages((prev) => {
                    // Check for duplicates by ID or by matching temp ID pattern
                    if (prev.some((m) => m.id === msg.id)) return prev;
                    // Also filter out temp messages that match by content and sender
                    const filtered = prev.filter(m => {
                      if (!m.id.startsWith('temp-')) return true;
                      // Remove temp message if real message has same content and sender
                      return !(m.content === msg.content && m.sender_type === msg.sender_type);
                    });
                    return [...filtered, msg];
                  });

                  // 用户端在查看页面时，收到对方消息立即标记已读
                  if (msg.sender_type !== 'user') {
                    markMessagesAsRead(conversation.id);
                  }
                } catch {
                  // ignore parse errors
                }
              }

              if (evt.event === 'message_update') {
                try {
                  const msg = JSON.parse(evt.data) as Message;
                  setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)));
                } catch {
                  // ignore parse errors
                }
              }
            },
          });
        } catch {
          // 断线/超时：短暂等待后重连
          if (abortController.signal.aborted) return;
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    };

    run();

    return () => {
      abortController.abort();
      sseInitializedRef.current = null;
    };
  }, [conversation?.id, markMessagesAsRead]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation || sending) return;

    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    setNewMessage("");
    setSending(true);

    // Optimistically add the message to UI immediately
    const optimisticMessage: Message = {
      id: tempId,
      sender_type: 'user',
      content: messageContent,
      message_type: 'text',
      image_url: null,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const { data, error } = await supabase.functions.invoke('cs-user-chat', {
        body: {
          action: 'send_message',
          conversation_id: conversation.id,
          content: messageContent,
          guest_id: user?.isGuest ? user.id : undefined
        }
      });

      if (error) throw error;
      
      // Replace optimistic message with real message to prevent duplicates from realtime
      if (data?.data?.id) {
        setMessages(prev => prev.map(m => 
          m.id === tempId ? { ...data.data } : m
        ));
      }
    } catch (error: any) {
      toast({
        title: "發送失敗",
        description: error.message,
        variant: "destructive"
      });
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversation || !user) return;

    const imageUrl = await uploadImage(file, user.id);
    if (imageUrl) {
      const tempId = `temp-img-${Date.now()}`;
      // Optimistically add the image message
      const optimisticMessage: Message = {
        id: tempId,
        sender_type: 'user',
        content: '[圖片]',
        message_type: 'image',
        image_url: imageUrl,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, optimisticMessage]);

      try {
        const { data } = await supabase.functions.invoke('cs-user-chat', {
          body: {
            action: 'send_message',
            conversation_id: conversation.id,
            content: '[圖片]',
            message_type: 'image',
            image_url: imageUrl,
            guest_id: user?.isGuest ? user.id : undefined
          }
        });
        
        // Replace optimistic message with real message
        if (data?.data?.id) {
          setMessages(prev => prev.map(m => 
            m.id === tempId ? { ...data.data } : m
          ));
        }
      } catch (error: any) {
        toast({
          title: "發送失敗",
          description: error.message,
          variant: "destructive"
        });
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEndConversation = async () => {
    if (!conversation) return;

    try {
      const { data } = await supabase.functions.invoke('cs-user-chat', {
        body: { 
          action: 'end_conversation', 
          conversation_id: conversation.id,
          guest_id: user?.isGuest ? user.id : undefined
        }
      });
      
      if (data?.needs_rating) {
        setConversationToRate(conversation.id);
        setShowRatingDialog(true);
      } else {
        toast({ title: "對話已結束" });
        navigate(-1);
      }
    } catch (error: any) {
      toast({
        title: "錯誤",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSubmitRating = async (rating: number, comment: string) => {
    if (!conversationToRate) return;

    try {
      await supabase.functions.invoke('cs-user-chat', {
        body: {
          action: 'submit_rating',
          conversation_id: conversationToRate,
          rating,
          comment,
          guest_id: user?.isGuest ? user.id : undefined
        }
      });
      toast({ title: "感謝您的評價！" });
    } catch (error: any) {
      console.error('Rating submission error:', error);
    } finally {
      navigate(-1);
    }
  };

  const handleRatingDialogClose = (open: boolean) => {
    setShowRatingDialog(open);
    if (!open) {
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background z-10">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t('common.back') || '返回'}</span>
            </Button>
            <div className="flex items-center gap-2 ml-2">
              {conversation?.is_ai_mode ? (
                <Bot className="h-5 w-5 text-blue-500" />
              ) : (
                <Headset className="h-5 w-5 text-green-500" />
              )}
              <span className="font-medium">
                {conversation?.is_ai_mode ? 'AI智能客服' : '線上客服'}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleEndConversation}>
            <X className="h-4 w-4 mr-1" />
            結束對話
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender_type === 'system' ? (
                <div className="text-center w-full">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {msg.content}
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2 max-w-[80%]">
                  {msg.sender_type !== 'user' && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={msg.sender_type === 'ai' ? 'bg-blue-500' : 'bg-green-500'}>
                        {msg.sender_type === 'ai' ? <Bot className="h-4 w-4 text-white" /> : <Headset className="h-4 w-4 text-white" />}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-lg p-3 ${
                      msg.sender_type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : msg.sender_type === 'ai'
                        ? 'bg-blue-500/10 border border-blue-500/20'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.message_type === 'image' && msg.image_url ? (
                      <img src={msg.image_url} alt="圖片" className="max-w-full rounded" />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs opacity-70">
                        {new Date(msg.created_at).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {msg.sender_type === 'user' && (
                        msg.read_at ? (
                          <CheckCheck className="h-3 w-3 text-blue-400" />
                        ) : (
                          <Check className="h-3 w-3 opacity-50" />
                        )
                      )}
                    </div>
                  </div>
                  {msg.sender_type === 'user' && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback>{user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {sending && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border p-4 bg-background">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending}
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Image className="h-5 w-5" />}
          </Button>
          <Input
            placeholder="輸入您的問題..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={sending || uploading}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sending || uploading}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Rating Dialog */}
      <RatingDialog
        open={showRatingDialog}
        onOpenChange={handleRatingDialogClose}
        onSubmit={handleSubmitRating}
      />
    </div>
  );
};

export default CustomerService;
