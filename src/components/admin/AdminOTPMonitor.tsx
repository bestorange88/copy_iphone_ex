import { useState, useEffect } from "react";
import { adminApi } from "@/hooks/useAdminData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Phone, Mail, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface OTPAttempt {
  id: string;
  phone: string;
  success: boolean;
  created_at: string;
}

export const AdminOTPMonitor = () => {
  const [attempts, setAttempts] = useState<OTPAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAttempts: 0,
    successfulAttempts: 0,
    failedAttempts: 0,
    todayAttempts: 0,
  });

  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const { data, error } = await adminApi.select<OTPAttempt[]>('otp_attempts', {
        order: { column: 'created_at', ascending: false },
        limit: 100
      });

      if (error) throw new Error(error);

      setAttempts(data || []);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const totalAttempts = data?.length || 0;
      const successfulAttempts = data?.filter(a => a.success).length || 0;
      const failedAttempts = data?.filter(a => !a.success).length || 0;
      const todayAttempts = data?.filter(a => new Date(a.created_at) >= today).length || 0;

      setStats({
        totalAttempts,
        successfulAttempts,
        failedAttempts,
        todayAttempts,
      });
    } catch (error) {
      console.error('Error fetching OTP attempts:', error);
      toast.error('获取OTP记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总请求数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttempts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">成功验证</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.successfulAttempts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">失败验证</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.failedAttempts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">今日请求</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.todayAttempts}</div>
          </CardContent>
        </Card>
      </div>

      {/* OTP Attempts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                短信验证码记录
              </CardTitle>
              <CardDescription>短信OTP发送和验证记录</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAttempts} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>手机号</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    暂无记录
                  </TableCell>
                </TableRow>
              ) : (
                attempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-mono">{attempt.phone}</TableCell>
                    <TableCell>
                      {attempt.success ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          成功
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                          <XCircle className="h-3 w-3 mr-1" />
                          待验证
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(attempt.created_at), 'yyyy-MM-dd HH:mm:ss')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            邮箱验证码
          </CardTitle>
          <CardDescription>邮箱OTP使用临时存储，验证码有效期5分钟</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            邮箱验证码通过 privateemail SMTP 服务发送，使用内存临时存储，不保留持久化记录。
            短信验证码通过短信宝国际短信服务发送，记录保存在数据库中。
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
