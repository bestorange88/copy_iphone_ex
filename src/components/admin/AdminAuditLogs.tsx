import { useEffect, useState } from "react";
import { adminApi } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Search, 
  RefreshCw, 
  User, 
  Clock, 
  FileText, 
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Plus,
  Trash,
  LogIn,
  LogOut,
  Timer
} from "lucide-react";
import { ActionLabels, ResourceTypeLabels, AdminAuditActions } from "@/services/adminAuditLog";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin_username: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const actionIconMap: Record<string, React.ReactNode> = {
  [AdminAuditActions.LOGIN]: <LogIn className="h-4 w-4 text-green-500" />,
  [AdminAuditActions.LOGOUT]: <LogOut className="h-4 w-4 text-gray-500" />,
  [AdminAuditActions.SESSION_TIMEOUT]: <Timer className="h-4 w-4 text-orange-500" />,
};

const getActionIcon = (action: string): React.ReactNode => {
  if (actionIconMap[action]) return actionIconMap[action];
  if (action.includes('view') || action.includes('list')) return <Eye className="h-4 w-4 text-blue-500" />;
  if (action.includes('create')) return <Plus className="h-4 w-4 text-green-500" />;
  if (action.includes('update') || action.includes('adjust') || action.includes('set')) return <Edit className="h-4 w-4 text-yellow-500" />;
  if (action.includes('delete')) return <Trash className="h-4 w-4 text-red-500" />;
  if (action.includes('approve') || action.includes('confirm')) return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (action.includes('reject')) return <XCircle className="h-4 w-4 text-red-500" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
};

const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
  if (action.includes('delete') || action.includes('reject')) return "destructive";
  if (action.includes('approve') || action.includes('create') || action.includes('login')) return "default";
  if (action.includes('view') || action.includes('list')) return "outline";
  return "secondary";
};

export const AdminAuditLogs = () => {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [adminFilter, setAdminFilter] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [admins, setAdmins] = useState<string[]>([]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await adminApi.select<AdminAuditLog[]>('admin_audit_logs', {
        order: { column: 'created_at', ascending: false },
        limit: 500
      });

      if (error) {
        toast.error("加载管理员操作日志失败");
        return;
      }
      
      const logsData = data || [];
      setLogs(logsData);
      
      // Extract unique admin usernames
      const uniqueAdmins = [...new Set(logsData.map(log => log.admin_username))];
      setAdmins(uniqueAdmins);
    } catch (err) {
      console.error('Failed to fetch admin audit logs:', err);
      toast.error("加载管理员操作日志失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.admin_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ActionLabels[log.action] || log.action).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ResourceTypeLabels[log.resource_type] || log.resource_type).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.resource_id && log.resource_id.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesAdmin = adminFilter === "all" || log.admin_username === adminFilter;
    
    return matchesSearch && matchesAction && matchesAdmin;
  });

  // Get unique actions for filter
  const uniqueActions = [...new Set(logs.map(log => log.action))];

  const toggleExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            管理员操作日志
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchLogs}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索管理员、操作、资源..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={adminFilter} onValueChange={setAdminFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <User className="h-4 w-4 mr-2" />
              <SelectValue placeholder="管理员" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部管理员</SelectItem>
              {admins.map(admin => (
                <SelectItem key={admin} value={admin}>{admin}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="操作类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部操作</SelectItem>
              {uniqueActions.map(action => (
                <SelectItem key={action} value={action}>
                  {ActionLabels[action] || action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{logs.length}</div>
            <div className="text-xs text-muted-foreground">总记录</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {logs.filter(l => l.action === AdminAuditActions.LOGIN).length}
            </div>
            <div className="text-xs text-muted-foreground">登录次数</div>
          </div>
          <div className="bg-orange-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {logs.filter(l => l.action === AdminAuditActions.SESSION_TIMEOUT).length}
            </div>
            <div className="text-xs text-muted-foreground">超时次数</div>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{admins.length}</div>
            <div className="text-xs text-muted-foreground">活跃管理员</div>
          </div>
        </div>

        {/* Logs list */}
        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-3" />
              <p>暂无操作日志</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="border rounded-lg overflow-hidden transition-all hover:border-primary/50"
                >
                  <div 
                    className="flex items-center gap-3 p-3 cursor-pointer"
                    onClick={() => toggleExpand(log.id)}
                  >
                    <div className="flex-shrink-0">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getActionBadgeVariant(log.action)} className="text-xs">
                          {ActionLabels[log.action] || log.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {ResourceTypeLabels[log.resource_type] || log.resource_type}
                        </span>
                        {log.resource_id && (
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[120px]">
                            {log.resource_id}
                          </code>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-sm font-medium flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.admin_username}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(log.created_at), 'MM-dd HH:mm:ss', { locale: zhCN })}
                        </div>
                      </div>
                      {expandedLogId === log.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded details */}
                  {expandedLogId === log.id && (
                    <div className="px-3 pb-3 pt-0 border-t bg-muted/30">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">管理员ID:</span>
                          <code className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">
                            {log.admin_id}
                          </code>
                        </div>
                        <div className="sm:hidden">
                          <span className="text-muted-foreground">操作时间:</span>
                          <span className="ml-2">
                            {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                          </span>
                        </div>
                        {log.resource_id && (
                          <div>
                            <span className="text-muted-foreground">资源ID:</span>
                            <code className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded break-all">
                              {log.resource_id}
                            </code>
                          </div>
                        )}
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-3">
                          <span className="text-muted-foreground text-sm">详细信息:</span>
                          <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer with count */}
        <div className="mt-4 text-sm text-muted-foreground text-center">
          显示 {filteredLogs.length} / {logs.length} 条记录
        </div>
      </CardContent>
    </Card>
  );
};
