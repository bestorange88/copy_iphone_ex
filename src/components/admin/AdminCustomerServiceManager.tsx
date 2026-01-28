import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { createAdminAuditLog, AdminAuditActions, AdminResourceTypes } from "@/services/adminAuditLog";
import {
  Headset,
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
  Users,
  Clock,
  CheckCircle,
  Circle,
  Loader2,
  Search,
  Zap,
  Eye,
  Star
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Agent {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_online: boolean;
  is_active: boolean;
  max_conversations: number;
  current_conversations: number;
  last_login_at: string | null;
  created_at: string;
}

interface Conversation {
  id: string;
  user_id: string;
  agent_id: string | null;
  status: string;
  is_ai_mode: boolean;
  last_message_at: string;
  last_message_preview: string;
  created_at: string;
  rating?: number | null;
  rating_comment?: string | null;
  rated_at?: string | null;
  profiles?: {
    username: string;
    email: string;
  };
  cs_agents?: {
    username: string;
    display_name: string;
  };
}

interface QuickReply {
  id: string;
  title: string;
  content: string;
  category: string;
  sort_order: number;
  is_active: boolean;
}

interface Message {
  id: string;
  sender_type: string;
  content: string;
  created_at: string;
}

const AdminCustomerServiceManager = () => {
  const { toast } = useToast();
  const { admin } = useAdminAuth();
  
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  
  // Form states
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [showQuickReplyDialog, setShowQuickReplyDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editingQuickReply, setEditingQuickReply] = useState<QuickReply | null>(null);
  
  const [agentForm, setAgentForm] = useState({
    username: '',
    password: '',
    display_name: '',
    max_conversations: 10
  });
  
  const [quickReplyForm, setQuickReplyForm] = useState({
    title: '',
    content: '',
    category: 'general',
    sort_order: 0
  });

  // Filters
  const [conversationFilter, setConversationFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const ADMIN_TOKEN_KEY = 'binarycent_admin_token';

  const getAdminToken = () =>
    localStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem('admin_token');

  const csDataRequest = async (action: string, data: any = {}) => {
    const token = getAdminToken();
    if (!token) {
      throw new Error('管理员登录已失效，请重新登录');
    }

    const { data: result, error } = await supabase.functions.invoke('cs-data', {
      body: { action, ...data },
      headers: { 'x-admin-token': token },
    });

    if (error) throw error;
    return result;
  };

  // Load data
  const loadAgents = async () => {
    try {
      const result = await csDataRequest('get_agents');
      if (result?.data) {
        setAgents(result.data);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const result = await csDataRequest('get_all_conversations', {
        status: conversationFilter !== 'all' ? conversationFilter : undefined,
        limit: 100
      });
      if (result?.data) {
        setConversations(result.data);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadQuickReplies = async () => {
    try {
      const result = await csDataRequest('get_quick_replies');
      if (result?.data) {
        setQuickReplies(result.data);
      }
    } catch (error) {
      console.error('Failed to load quick replies:', error);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const result = await csDataRequest('get_messages', { conversation_id: conversationId });
      if (result?.data) {
        setConversationMessages(result.data);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadAgents(), loadConversations(), loadQuickReplies()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  useEffect(() => {
    loadConversations();
  }, [conversationFilter]);

  useEffect(() => {
    if (selectedConversation) {
      loadConversationMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  // Agent CRUD
  const handleSaveAgent = async () => {
    try {
      if (editingAgent) {
        await csDataRequest('update_agent', {
          id: editingAgent.id,
          display_name: agentForm.display_name,
          max_conversations: agentForm.max_conversations
        });
        toast({ title: "成功", description: "客服信息已更新" });
      } else {
        await csDataRequest('create_agent', agentForm);
        toast({ title: "成功", description: "客服账号已创建" });
      }

      if (admin) {
        await createAdminAuditLog({
          adminId: admin.id,
          adminUsername: admin.username,
          action: editingAgent ? AdminAuditActions.CONFIG_UPDATE : AdminAuditActions.USER_CREATE,
          resourceType: AdminResourceTypes.SYSTEM_CONFIG,
          resourceId: editingAgent?.id,
          details: { operation: editingAgent ? 'update_agent' : 'create_agent', ...agentForm }
        });
      }

      setShowAgentDialog(false);
      setEditingAgent(null);
      setAgentForm({ username: '', password: '', display_name: '', max_conversations: 10 });
      loadAgents();
    } catch (error: any) {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteAgent = async (agent: Agent) => {
    if (!confirm(`确定要删除客服 ${agent.display_name} 吗？`)) return;

    try {
      await csDataRequest('delete_agent', { id: agent.id });
      toast({ title: "成功", description: "客服已删除" });

      if (admin) {
        await createAdminAuditLog({
          adminId: admin.id,
          adminUsername: admin.username,
          action: AdminAuditActions.CONFIG_UPDATE,
          resourceType: AdminResourceTypes.SYSTEM_CONFIG,
          resourceId: agent.id,
          details: { operation: 'delete_agent', agent_name: agent.display_name }
        });
      }

      loadAgents();
    } catch (error: any) {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleAgentStatus = async (agent: Agent) => {
    try {
      await csDataRequest('update_agent', {
        id: agent.id,
        is_active: !agent.is_active
      });
      toast({ title: "成功", description: agent.is_active ? "客服已禁用" : "客服已启用" });
      loadAgents();
    } catch (error: any) {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    }
  };

  // Quick Reply CRUD
  const handleSaveQuickReply = async () => {
    try {
      if (editingQuickReply) {
        await csDataRequest('manage_quick_replies', {
          operation: 'update',
          reply: { id: editingQuickReply.id, ...quickReplyForm }
        });
        toast({ title: "成功", description: "快捷回复已更新" });
      } else {
        await csDataRequest('manage_quick_replies', {
          operation: 'create',
          reply: quickReplyForm
        });
        toast({ title: "成功", description: "快捷回复已创建" });
      }

      setShowQuickReplyDialog(false);
      setEditingQuickReply(null);
      setQuickReplyForm({ title: '', content: '', category: 'general', sort_order: 0 });
      loadQuickReplies();
    } catch (error: any) {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteQuickReply = async (reply: QuickReply) => {
    if (!confirm(`确定要删除快捷回复 "${reply.title}" 吗？`)) return;

    try {
      await csDataRequest('manage_quick_replies', {
        operation: 'delete',
        reply: { id: reply.id }
      });
      toast({ title: "成功", description: "快捷回复已删除" });
      loadQuickReplies();
    } catch (error: any) {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">等待中</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500">进行中</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-500">已结束</Badge>;
      case 'transferred':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500">已转接</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const onlineAgents = agents.filter(a => a.is_online).length;
  const activeConversations = conversations.filter(c => c.status === 'active').length;
  const waitingConversations = conversations.filter(c => c.status === 'waiting').length;
  
  // Calculate average rating
  const ratedConversations = conversations.filter(c => c.rating && c.rating > 0);
  const averageRating = ratedConversations.length > 0
    ? (ratedConversations.reduce((sum, c) => sum + (c.rating || 0), 0) / ratedConversations.length).toFixed(1)
    : '暂无';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Headset className="h-6 w-6" />
            客服管理
          </h2>
          <p className="text-muted-foreground">管理客服坐席、查看对话记录</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">客服总数</p>
                <p className="text-2xl font-bold">{agents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Circle className="h-8 w-8 text-green-500 fill-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">在线客服</p>
                <p className="text-2xl font-bold">{onlineAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">进行中对话</p>
                <p className="text-2xl font-bold">{activeConversations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">等待队列</p>
                <p className="text-2xl font-bold">{waitingConversations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-yellow-400 fill-yellow-400" />
              <div>
                <p className="text-sm text-muted-foreground">平均评分</p>
                <p className="text-2xl font-bold">{averageRating}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents">客服坐席</TabsTrigger>
          <TabsTrigger value="conversations">对话记录</TabsTrigger>
          <TabsTrigger value="quick-replies">快捷回复</TabsTrigger>
        </TabsList>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAgentDialog} onOpenChange={setShowAgentDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingAgent(null);
                  setAgentForm({ username: '', password: '', display_name: '', max_conversations: 10 });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加客服
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingAgent ? '编辑客服' : '添加客服'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {!editingAgent && (
                    <>
                      <div className="space-y-2">
                        <Label>用户名</Label>
                        <Input
                          value={agentForm.username}
                          onChange={(e) => setAgentForm({ ...agentForm, username: e.target.value })}
                          placeholder="登录用户名"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>密码</Label>
                        <Input
                          type="password"
                          value={agentForm.password}
                          onChange={(e) => setAgentForm({ ...agentForm, password: e.target.value })}
                          placeholder="登录密码"
                        />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label>显示名称</Label>
                    <Input
                      value={agentForm.display_name}
                      onChange={(e) => setAgentForm({ ...agentForm, display_name: e.target.value })}
                      placeholder="客服显示名称"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>最大同时对话数</Label>
                    <Input
                      type="number"
                      value={agentForm.max_conversations}
                      onChange={(e) => setAgentForm({ ...agentForm, max_conversations: parseInt(e.target.value) || 10 })}
                    />
                  </div>
                  <Button className="w-full" onClick={handleSaveAgent}>
                    {editingAgent ? '保存修改' : '创建客服'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>客服</TableHead>
                <TableHead>用户名</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>当前对话</TableHead>
                <TableHead>最后登录</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map(agent => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={agent.avatar_url || ''} />
                        <AvatarFallback>{agent.display_name[0]}</AvatarFallback>
                      </Avatar>
                      <span>{agent.display_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{agent.username}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {agent.is_online ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500">
                          <Circle className="h-2 w-2 fill-current mr-1" />
                          在线
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-500/10 text-gray-500">
                          <Circle className="h-2 w-2 mr-1" />
                          离线
                        </Badge>
                      )}
                      {!agent.is_active && (
                        <Badge variant="destructive">已禁用</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {agent.current_conversations} / {agent.max_conversations}
                  </TableCell>
                  <TableCell>
                    {agent.last_login_at
                      ? new Date(agent.last_login_at).toLocaleString('zh-CN')
                      : '从未登录'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingAgent(agent);
                          setAgentForm({
                            username: agent.username,
                            password: '',
                            display_name: agent.display_name,
                            max_conversations: agent.max_conversations
                          });
                          setShowAgentDialog(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleAgentStatus(agent)}
                      >
                        {agent.is_active ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAgent(agent)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Conversations Tab */}
        <TabsContent value="conversations" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={conversationFilter} onValueChange={setConversationFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="waiting">等待中</SelectItem>
                <SelectItem value="active">进行中</SelectItem>
                <SelectItem value="closed">已结束</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Conversation List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">对话列表</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {conversations
                    .filter(c => !searchTerm || c.profiles?.username?.includes(searchTerm) || c.profiles?.email?.includes(searchTerm))
                    .map(conv => (
                      <div
                        key={conv.id}
                        className={`p-3 border-b cursor-pointer hover:bg-muted ${
                          selectedConversation?.id === conv.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => setSelectedConversation(conv)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{conv.profiles?.username || '用户'}</span>
                            {conv.is_ai_mode && (
                              <Badge variant="outline" className="text-xs">
                                <Zap className="h-3 w-3 mr-1" />
                                AI
                              </Badge>
                            )}
                          </div>
                          {getStatusBadge(conv.status)}
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span className="truncate flex-1">{conv.last_message_preview || '暂无消息'}</span>
                          <span className="ml-2 flex-shrink-0">
                            {new Date(conv.last_message_at || conv.created_at).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        {conv.cs_agents && (
                          <div className="text-xs text-muted-foreground mt-1">
                            客服: {conv.cs_agents.display_name}
                          </div>
                        )}
                        {conv.rating && (
                          <div className="flex items-center gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${
                                  star <= conv.rating!
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({conv.rating}分)
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Message Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  对话详情
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedConversation ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {conversationMessages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_type === 'user' ? 'justify-start' : 'justify-end'}`}
                        >
                          {msg.sender_type === 'system' ? (
                            <div className="text-center w-full">
                              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                {msg.content}
                              </span>
                            </div>
                          ) : (
                            <div
                              className={`max-w-[80%] rounded-lg p-3 ${
                                msg.sender_type === 'user'
                                  ? 'bg-muted'
                                  : msg.sender_type === 'ai'
                                  ? 'bg-blue-500/10 border border-blue-500/20'
                                  : 'bg-primary/10'
                              }`}
                            >
                              <div className="text-xs text-muted-foreground mb-1">
                                {msg.sender_type === 'user' ? '用户' : msg.sender_type === 'ai' ? 'AI助手' : '客服'}
                              </div>
                              <p className="text-sm">{msg.content}</p>
                              <span className="text-xs text-muted-foreground">
                                {new Date(msg.created_at).toLocaleTimeString('zh-CN')}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    请选择一个对话查看详情
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Quick Replies Tab */}
        <TabsContent value="quick-replies" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showQuickReplyDialog} onOpenChange={setShowQuickReplyDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingQuickReply(null);
                  setQuickReplyForm({ title: '', content: '', category: 'general', sort_order: 0 });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加快捷回复
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingQuickReply ? '编辑快捷回复' : '添加快捷回复'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>标题</Label>
                    <Input
                      value={quickReplyForm.title}
                      onChange={(e) => setQuickReplyForm({ ...quickReplyForm, title: e.target.value })}
                      placeholder="快捷回复标题"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>内容</Label>
                    <Textarea
                      value={quickReplyForm.content}
                      onChange={(e) => setQuickReplyForm({ ...quickReplyForm, content: e.target.value })}
                      placeholder="回复内容"
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>分类</Label>
                    <Select
                      value={quickReplyForm.category}
                      onValueChange={(v) => setQuickReplyForm({ ...quickReplyForm, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">通用</SelectItem>
                        <SelectItem value="greeting">问候</SelectItem>
                        <SelectItem value="trading">交易</SelectItem>
                        <SelectItem value="deposit">充值</SelectItem>
                        <SelectItem value="withdraw">提现</SelectItem>
                        <SelectItem value="other">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>排序</Label>
                    <Input
                      type="number"
                      value={quickReplyForm.sort_order}
                      onChange={(e) => setQuickReplyForm({ ...quickReplyForm, sort_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <Button className="w-full" onClick={handleSaveQuickReply}>
                    {editingQuickReply ? '保存修改' : '创建快捷回复'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>内容</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quickReplies.map(reply => (
                <TableRow key={reply.id}>
                  <TableCell className="font-medium">{reply.title}</TableCell>
                  <TableCell className="max-w-xs truncate">{reply.content}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{reply.category}</Badge>
                  </TableCell>
                  <TableCell>{reply.sort_order}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingQuickReply(reply);
                          setQuickReplyForm({
                            title: reply.title,
                            content: reply.content,
                            category: reply.category,
                            sort_order: reply.sort_order
                          });
                          setShowQuickReplyDialog(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteQuickReply(reply)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminCustomerServiceManager;
