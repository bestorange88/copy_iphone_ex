import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { connectSseStream } from "@/lib/sse";
import { useBrowserNotification } from "@/hooks/useBrowserNotification";
import { useCsImageUpload } from "@/hooks/useCsImageUpload";
import QuickReplyPanel from "@/components/cs/QuickReplyPanel";
import {
  LogOut,
  MessageSquare,
  Users,
  Clock,
  CheckCircle,
  Circle,
  Send,
  Image,
  Zap,
  ArrowRightLeft,
  Bell,
  BellOff,
  Loader2,
  Check,
  CheckCheck,
  Bot,
  X,
  Star,
  AlertTriangle,
  Search,
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import arxLogo from "@/assets/arx-logo-text.png";

interface Agent {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  max_conversations: number;
}

interface Conversation {
  id: string;
  user_id: string;
  agent_id: string | null;
  status: string;
  is_ai_mode: boolean;
  priority: number | null;
  last_message_at: string;
  last_message_preview: string;
  created_at: string;
  unread_count?: number;
  profiles?: {
    username: string;
    email: string;
    avatar_url: string | null;
    user_number?: number;
  };
}

// Priority constants
const PRIORITY_LEVELS = {
  NORMAL: 0,
  URGENT: 1,
  VIP: 2
} as const;

const getPriorityInfo = (priority: number | null) => {
  switch (priority) {
    case PRIORITY_LEVELS.VIP:
      return { label: 'VIP', color: 'bg-amber-500 text-white', dotColor: 'bg-amber-500' };
    case PRIORITY_LEVELS.URGENT:
      return { label: '緊急', color: 'bg-red-500 text-white', dotColor: 'bg-red-500' };
    default:
      return { label: '普通', color: 'bg-muted text-muted-foreground', dotColor: '' };
  }
};

interface Message {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_id: string | null;
  content: string;
  message_type: string;
  image_url: string | null;
  created_at: string;
  read_at?: string | null;
  is_read?: boolean;
}

interface QuickReply {
  id: string;
  title: string;
  content: string;
  category: string;
}

const ServiceDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [onlineAgents, setOnlineAgents] = useState<Agent[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferReason, setTransferReason] = useState("");
  const [selectedTransferAgent, setSelectedTransferAgent] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [quickReplySearch, setQuickReplySearch] = useState("");
  const [selectedQuickReplyCategory, setSelectedQuickReplyCategory] = useState<string | null>(null);
  const [isQuickReplyPanelCollapsed, setIsQuickReplyPanelCollapsed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const previousWaitingCountRef = useRef(0);
  const previousMessagesRef = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { permission, requestPermission, sendNotification, isSupported } = useBrowserNotification();
  const { uploadImage, uploading } = useCsImageUpload();

  // Memoized quick reply categories and filtered list
  const quickReplyCategories = useMemo(() => {
    const cats = new Set<string>();
    quickReplies.forEach((reply) => {
      if (reply.category) {
        cats.add(reply.category);
      }
    });
    return Array.from(cats);
  }, [quickReplies]);

  const filteredQuickReplies = useMemo(() => {
    return quickReplies.filter((reply) => {
      const matchesSearch =
        !quickReplySearch ||
        reply.title.toLowerCase().includes(quickReplySearch.toLowerCase()) ||
        reply.content.toLowerCase().includes(quickReplySearch.toLowerCase());

      const matchesCategory = !selectedQuickReplyCategory || reply.category === selectedQuickReplyCategory;

      return matchesSearch && matchesCategory;
    });
  }, [quickReplies, quickReplySearch, selectedQuickReplyCategory]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      // Create audio context on demand
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      
      // Create a pleasant notification beep
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Two-tone notification sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.1); // C#6
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }, [soundEnabled]);

  const getAgentToken = () => localStorage.getItem('cs_agent_token');

  const csDataRequest = useCallback(async (action: string, data: any = {}) => {
    const token = getAgentToken();
    if (!token) {
      navigate('/service');
      return null;
    }

    const { data: result, error } = await supabase.functions.invoke('cs-data', {
      body: { action, ...data },
      headers: { 'x-agent-token': token }
    });

    if (error) {
      console.error('CS data request error:', error);
      throw error;
    }

    return result;
  }, [navigate]);

  // Initialize agent info
  useEffect(() => {
    const agentInfo = localStorage.getItem('cs_agent_info');
    if (!agentInfo) {
      navigate('/service');
      return;
    }
    setAgent(JSON.parse(agentInfo));
  }, [navigate]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const result = await csDataRequest('get_conversations');
      if (result?.data) {
        setConversations(result.data);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, [csDataRequest]);

  // Load quick replies
  const loadQuickReplies = useCallback(async () => {
    try {
      const result = await csDataRequest('get_quick_replies');
      if (result?.data) {
        setQuickReplies(result.data);
      }
    } catch (error) {
      console.error('Failed to load quick replies:', error);
    }
  }, [csDataRequest]);

  // Load online agents for transfer
  const loadOnlineAgents = useCallback(async () => {
    try {
      const result = await csDataRequest('get_online_agents');
      if (result?.data) {
        setOnlineAgents(result.data.filter((a: Agent) => a.id !== agent?.id));
      }
    } catch (error) {
      console.error('Failed to load online agents:', error);
    }
  }, [csDataRequest, agent?.id]);

  // Computed values - moved before useEffect that depends on them
  const waitingConversations = conversations.filter(c => c.status === 'waiting');
  // AI模式的会话（可接管）
  const aiModeConversations = conversations.filter(c => c.status === 'active' && c.is_ai_mode === true);

  // Request notification permission on mount
  useEffect(() => {
    if (isSupported && permission === 'default') {
      requestPermission();
    }
  }, [isSupported, permission, requestPermission]);

  // Watch for new waiting conversations and send notifications
  useEffect(() => {
    const currentWaitingCount = waitingConversations.length;
    if (currentWaitingCount > previousWaitingCountRef.current && previousWaitingCountRef.current !== 0) {
      const newConversation = waitingConversations[0];
      
      // Play notification sound
      playNotificationSound();
      
      if (notificationsEnabled) {
        sendNotification('新客戶諮詢', {
          body: `用戶 ${newConversation?.profiles?.username || '訪客'} 正在等待接入`,
          tag: 'new-conversation',
        });
      }
    }
    previousWaitingCountRef.current = currentWaitingCount;
  }, [waitingConversations.length, notificationsEnabled, sendNotification, playNotificationSound]);

  useEffect(() => {
    if (!agent) return;

    loadConversations();
    loadQuickReplies();
    loadOnlineAgents();

    // 轮询对话列表，更频繁地检查新消息
    const pollInterval = setInterval(loadConversations, 3000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [agent, loadConversations, loadQuickReplies, loadOnlineAgents]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const result = await csDataRequest('get_messages', { conversation_id: conversationId });
      if (result?.data) {
        setMessages(result.data);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [csDataRequest]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    try {
      await csDataRequest('mark_messages_read', {
        conversation_id: conversationId,
        reader_type: 'agent'
      });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, [csDataRequest]);

  useEffect(() => {
    if (!selectedConversation) return;

    loadMessages(selectedConversation.id);
    // Mark messages as read when opening conversation
    markMessagesAsRead(selectedConversation.id);

    const abortController = new AbortController();

    const run = async () => {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const agentToken = getAgentToken();

      if (!baseUrl || !apikey) {
        console.error('Missing Supabase URL or API key for SSE');
        return;
      }
      if (!agentToken) {
        console.log('No agent token, redirecting...');
        return;
      }

      while (!abortController.signal.aborted) {
        try {
          console.log('Connecting to SSE for conversation:', selectedConversation.id);
          const url = new URL(`${baseUrl}/functions/v1/cs-sse`);
          url.searchParams.set('topic', 'messages');
          url.searchParams.set('conversation_id', selectedConversation.id);
          url.searchParams.set('since', new Date(Date.now() - 30_000).toISOString());
          url.searchParams.set('since_read', new Date(Date.now() - 5 * 60_000).toISOString());

          await connectSseStream({
            url: url.toString(),
            headers: {
              apikey,
              'x-agent-token': agentToken,
            },
            signal: abortController.signal,
            onEvent: (evt) => {
              if (evt.event === 'message') {
                try {
                  const msg = JSON.parse(evt.data) as Message;
                  setMessages((prev) => {
                    if (prev.some((m) => m.id === msg.id)) return prev;
                    return [...prev, msg];
                  });

                  // 进入会话页面时，收到用户消息立即标记已读
                  if (msg.sender_type === 'user') {
                    markMessagesAsRead(selectedConversation.id);
                    
                    // Play notification sound for new user messages
                    playNotificationSound();

                    if (notificationsEnabled) {
                      sendNotification('新訊息', {
                        body: msg.content?.substring(0, 50) || '收到新訊息',
                        tag: `message-${selectedConversation.id}`,
                      });
                    }
                  }
                } catch {
                  // ignore
                }
              }

              if (evt.event === 'message_update') {
                try {
                  const msg = JSON.parse(evt.data) as Message;
                  setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)));
                } catch {
                  // ignore
                }
              }
            },
          });
        } catch {
          if (abortController.signal.aborted) return;
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    };

    run();

    return () => {
      abortController.abort();
    };
  }, [selectedConversation, loadMessages, markMessagesAsRead, notificationsEnabled, sendNotification, playNotificationSound]);

  const handleLogout = async () => {
    try {
      await csDataRequest('set_online_status', { is_online: false });
    } catch (error) {
      console.error('Failed to set offline status:', error);
    }
    localStorage.removeItem('cs_agent_token');
    localStorage.removeItem('cs_agent_info');
    navigate('/service');
  };

  const handleAcceptConversation = async (conv: Conversation, isTakeover = false) => {
    try {
      const result = await csDataRequest('accept_conversation', { conversation_id: conv.id });
      const wasAiMode = result?.is_takeover || isTakeover;
      toast({ 
        title: "成功", 
        description: wasAiMode ? "已接管AI對話，用戶已收到通知" : "已接入對話" 
      });
      loadConversations();
      setSelectedConversation({ ...conv, status: 'active', agent_id: agent?.id || null, is_ai_mode: false });
    } catch (error: any) {
      toast({ title: "錯誤", description: error.message, variant: "destructive" });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await csDataRequest('send_message', {
        conversation_id: selectedConversation.id,
        content: newMessage.trim()
      });
      setNewMessage("");
      loadMessages(selectedConversation.id);
    } catch (error: any) {
      toast({ title: "發送失敗", description: error.message, variant: "destructive" });
    }
  };

  const handleCloseConversation = async () => {
    if (!selectedConversation) return;

    try {
      await csDataRequest('close_conversation', { conversation_id: selectedConversation.id });
      toast({ title: "成功", description: "對話已關閉" });
      setSelectedConversation(null);
      loadConversations();
    } catch (error: any) {
      toast({ title: "錯誤", description: error.message, variant: "destructive" });
    }
  };

  const handleTransfer = async () => {
    if (!selectedConversation || !selectedTransferAgent) return;

    try {
      await csDataRequest('transfer_conversation', {
        conversation_id: selectedConversation.id,
        to_agent_id: selectedTransferAgent,
        reason: transferReason
      });
      toast({ title: "成功", description: "對話已轉接" });
      setShowTransfer(false);
      setSelectedConversation(null);
      loadConversations();
    } catch (error: any) {
      toast({ title: "轉接失敗", description: error.message, variant: "destructive" });
    }
  };

  const handleQuickReply = (content: string) => {
    setNewMessage(content);
    setShowQuickReplies(false);
  };

  const handleSetPriority = async (conversationId: string, priority: number) => {
    try {
      await csDataRequest('set_priority', { conversation_id: conversationId, priority });
      toast({ 
        title: "成功", 
        description: `已設置為${getPriorityInfo(priority).label}` 
      });
      loadConversations();
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation({ ...selectedConversation, priority });
      }
    } catch (error: any) {
      toast({ title: "設置失敗", description: error.message, variant: "destructive" });
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation || !agent) return;

    const imageUrl = await uploadImage(file, agent.id);
    if (imageUrl) {
      try {
        await csDataRequest('send_message', {
          conversation_id: selectedConversation.id,
          content: '[圖片]',
          message_type: 'image',
          image_url: imageUrl
        });
        loadMessages(selectedConversation.id);
      } catch (error: any) {
        toast({
          title: "發送失敗",
          description: error.message,
          variant: "destructive"
        });
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      await csDataRequest('set_online_status', { is_online: !isOnline });
      setIsOnline(!isOnline);
      toast({ title: isOnline ? "已離線" : "已上線" });
    } catch (error: any) {
      toast({ title: "錯誤", description: error.message, variant: "destructive" });
    }
  };

  // Sort active conversations by last_message_at (newest first) and priority
  const activeConversations = conversations
    .filter(c => c.status === 'active' && c.agent_id === agent?.id)
    .sort((a, b) => {
      // High priority first
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      if (priorityB !== priorityA) return priorityB - priorityA;
      
      // Then by last message time (newest first)
      const timeA = new Date(a.last_message_at || a.created_at).getTime();
      const timeB = new Date(b.last_message_at || b.created_at).getTime();
      return timeB - timeA;
    });

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <img src={arxLogo} alt="ARX" className="h-8" />
          <span className="font-semibold">客服工作台</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Sound Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? '關閉提示音' : '開啟提示音'}
          >
            {soundEnabled ? (
              <Volume2 className="h-5 w-5 text-primary" />
            ) : (
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
          {/* Notification Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (permission !== 'granted') {
                requestPermission();
              }
              setNotificationsEnabled(!notificationsEnabled);
            }}
            title={notificationsEnabled ? '關閉通知' : '開啟通知'}
          >
            {notificationsEnabled && permission === 'granted' ? (
              <Bell className="h-5 w-5 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant={isOnline ? "default" : "outline"}
            size="sm"
            onClick={toggleOnlineStatus}
          >
            <Circle className={`h-3 w-3 mr-2 ${isOnline ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'}`} />
            {isOnline ? '在線' : '離線'}
          </Button>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={agent?.avatar_url || ''} />
              <AvatarFallback>{agent?.display_name?.[0] || 'A'}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{agent?.display_name}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Conversation List */}
        <div className="w-80 border-r border-border flex flex-col overflow-hidden">
          {/* Waiting Queue */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              等待隊列
              {waitingConversations.length > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {waitingConversations.length}
                </Badge>
              )}
            </div>
            <ScrollArea className="max-h-40">
              {waitingConversations.map(conv => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={conv.profiles?.avatar_url || ''} />
                      <AvatarFallback>{conv.profiles?.username?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm">{conv.profiles?.username || '用戶'}</span>
                      {conv.profiles?.user_number && (
                        <span className="text-xs text-muted-foreground">ID: {conv.profiles.user_number}</span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleAcceptConversation(conv)}>
                    接入
                  </Button>
                </div>
              ))}
              {waitingConversations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">暫無等待對話</p>
              )}
            </ScrollArea>
          </div>

          {/* AI Mode Conversations - Takeover Section */}
          {aiModeConversations.length > 0 && (
            <div className="p-3 border-b border-border bg-blue-500/5">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-600 mb-2">
                <Bot className="h-4 w-4" />
                AI對話（可接管）
                <Badge variant="outline" className="ml-auto border-blue-500 text-blue-500">
                  {aiModeConversations.length}
                </Badge>
              </div>
              <ScrollArea className="max-h-40">
                {aiModeConversations.map(conv => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={conv.profiles?.avatar_url || ''} />
                        <AvatarFallback>{conv.profiles?.username?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <span className="text-sm">{conv.profiles?.username || '用戶'}</span>
                          {conv.profiles?.user_number && (
                            <span className="text-xs text-muted-foreground">({conv.profiles.user_number})</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {conv.last_message_preview || 'AI正在服務中'}
                        </span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-blue-500 text-blue-600 hover:bg-blue-500/10"
                      onClick={() => handleAcceptConversation(conv, true)}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      接管
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}

          {/* Active Conversations */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              我的對話
                <Badge variant="secondary" className="ml-auto">{activeConversations.length}</Badge>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-visible">
              {activeConversations.map(conv => {
                const priorityInfo = getPriorityInfo(conv.priority);
                const isHighPriority = conv.priority && conv.priority > 0;
                const unreadCount = conv.unread_count || 0;
                const hasUnread = unreadCount > 0 && selectedConversation?.id !== conv.id;
                return (
                  <div
                    key={conv.id}
                    className={`p-3 border-b border-border cursor-pointer hover:bg-muted relative ${
                      selectedConversation?.id === conv.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    {/* Priority indicator dot */}
                    {isHighPriority && !hasUnread && (
                      <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${priorityInfo.dotColor} animate-pulse`} />
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={conv.profiles?.avatar_url || ''} />
                          <AvatarFallback>{conv.profiles?.username?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        {/* Unread badge on avatar */}
                        {hasUnread && (
                          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`font-medium text-sm truncate ${hasUnread ? 'text-foreground' : ''}`}>
                              {conv.profiles?.username || '用戶'}
                            </span>
                            {conv.profiles?.user_number && (
                              <span className="text-xs text-muted-foreground">({conv.profiles.user_number})</span>
                            )}
                            {isHighPriority && (
                              <Badge className={`text-[10px] px-1.5 py-0 h-4 ${priorityInfo.color}`}>
                                {priorityInfo.label}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(conv.last_message_at || conv.created_at).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {conv.last_message_preview || '暫無訊息'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex">
          {/* Main Chat */}
          <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarImage src={selectedConversation.profiles?.avatar_url || ''} />
                    <AvatarFallback>
                      {selectedConversation.profiles?.username?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{selectedConversation.profiles?.username || '用戶'}</p>
                      {selectedConversation.profiles?.user_number && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">ID: {selectedConversation.profiles.user_number}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedConversation.profiles?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Priority Selector */}
                  <Select 
                    value={String(selectedConversation.priority ?? 0)}
                    onValueChange={(value) => handleSetPriority(selectedConversation.id, Number(value))}
                  >
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue>
                        {(() => {
                          const info = getPriorityInfo(selectedConversation.priority);
                          return (
                            <span className="flex items-center gap-1">
                              {selectedConversation.priority === PRIORITY_LEVELS.VIP && <Star className="h-3 w-3" />}
                              {selectedConversation.priority === PRIORITY_LEVELS.URGENT && <AlertTriangle className="h-3 w-3" />}
                              {info.label}
                            </span>
                          );
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">
                        <span className="flex items-center gap-1.5">普通</span>
                      </SelectItem>
                      <SelectItem value="1">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                          緊急
                        </span>
                      </SelectItem>
                      <SelectItem value="2">
                        <span className="flex items-center gap-1.5">
                          <Star className="h-3 w-3 text-amber-500" />
                          VIP
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => loadOnlineAgents()}>
                        <ArrowRightLeft className="h-4 w-4 mr-1" />
                        轉接
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>轉接對話</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">選擇客服</label>
                          <Select value={selectedTransferAgent} onValueChange={setSelectedTransferAgent}>
                            <SelectTrigger>
                              <SelectValue placeholder="選擇要轉接的客服" />
                            </SelectTrigger>
                            <SelectContent>
                              {onlineAgents.map(a => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.display_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">轉接原因</label>
                          <Textarea
                            placeholder="請輸入轉接原因（可選）"
                            value={transferReason}
                            onChange={(e) => setTransferReason(e.target.value)}
                          />
                        </div>
                        <Button className="w-full" onClick={handleTransfer}>
                          確認轉接
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="sm" onClick={handleCloseConversation}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    結束
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender_type === 'system' ? (
                        <div className="text-center w-full">
                          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            {msg.content}
                          </span>
                        </div>
                      ) : (
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.sender_type === 'agent'
                              ? 'bg-primary text-primary-foreground'
                              : msg.sender_type === 'ai'
                              ? 'bg-blue-500/10 text-foreground border border-blue-500/20'
                              : 'bg-muted'
                          }`}
                        >
                          {msg.sender_type === 'ai' && (
                            <div className="flex items-center gap-1 text-xs text-blue-500 mb-1">
                              <Zap className="h-3 w-3" />
                              AI助手
                            </div>
                          )}
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
                            {msg.sender_type === 'agent' && (
                              msg.read_at ? (
                                <CheckCheck className="h-3 w-3 text-blue-400" />
                              ) : (
                                <Check className="h-3 w-3 opacity-50" />
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-3 border-t border-border">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Image className="h-5 w-5" />}
                  </Button>
                  <Input
                    placeholder="輸入訊息..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    disabled={uploading}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim() || uploading}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>請從左側選擇一個對話</p>
              </div>
            </div>
          )}
          </div>

          {/* Quick Reply Sidebar - Right Side */}
          {selectedConversation && (
            <div 
              className={`border-l border-border flex flex-col bg-background transition-all duration-300 ease-in-out ${
                isQuickReplyPanelCollapsed ? 'w-10' : 'w-72'
              }`}
            >
              {/* Collapse Toggle Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 h-6 w-6 rounded-full bg-muted border border-border shadow-sm hover:bg-accent"
                onClick={() => setIsQuickReplyPanelCollapsed(!isQuickReplyPanelCollapsed)}
                style={{ right: isQuickReplyPanelCollapsed ? '4px' : '280px' }}
              >
                {isQuickReplyPanelCollapsed ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>

              {isQuickReplyPanelCollapsed ? (
                /* Collapsed State - Just show icon */
                <div className="flex flex-col items-center py-3 gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsQuickReplyPanelCollapsed(false)}
                    title="展開快捷回覆"
                  >
                    <Zap className="h-4 w-4 text-primary" />
                  </Button>
                </div>
              ) : (
                /* Expanded State - Full panel */
                <>
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">快捷回覆</span>
                      <Badge variant="secondary" className="text-xs">
                        {quickReplies.length}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setIsQuickReplyPanelCollapsed(true)}
                      title="收起面板"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Search */}
                  <div className="p-3 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="搜尋快捷回覆..."
                        value={quickReplySearch}
                        onChange={(e) => setQuickReplySearch(e.target.value)}
                        className="pl-9 h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div className="p-2 border-b border-border flex flex-wrap gap-1">
                    <Button
                      variant={selectedQuickReplyCategory === null ? "secondary" : "ghost"}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setSelectedQuickReplyCategory(null)}
                    >
                      全部
                    </Button>
                    {quickReplyCategories.map((category) => (
                      <Button
                        key={category}
                        variant={selectedQuickReplyCategory === category ? "secondary" : "ghost"}
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setSelectedQuickReplyCategory(category)}
                      >
                        {category}
                      </Button>
                    ))}
                  </div>

                  {/* Quick Reply List */}
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                      {filteredQuickReplies.length > 0 ? (
                        filteredQuickReplies.map((reply) => (
                          <div
                            key={reply.id}
                            className="group p-2 rounded-md hover:bg-muted cursor-pointer transition-colors border border-transparent hover:border-border"
                            onClick={() => handleQuickReply(reply.content)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-sm font-medium truncate">
                                    {reply.title}
                                  </span>
                                  {reply.category && (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                                      {reply.category}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {reply.content}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          {quickReplySearch || selectedQuickReplyCategory
                            ? "未找到匹配的快捷回覆"
                            : "暫無快捷回覆"}
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Tip */}
                  <div className="p-3 border-t border-border">
                    <p className="text-xs text-muted-foreground text-center">
                      💡 點擊快捷回覆即可填入輸入框
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceDashboard;
