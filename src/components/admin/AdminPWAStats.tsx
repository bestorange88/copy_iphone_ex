import { useEffect, useState } from "react";
import { adminApi } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Smartphone, 
  Apple, 
  Monitor, 
  TrendingUp, 
  Users,
  RefreshCw,
  Download,
  Calendar
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { zhTW } from "date-fns/locale";

interface PWAInstallation {
  id: string;
  user_id: string | null;
  device_type: string;
  browser: string;
  os_version: string;
  installed_at: string;
  last_opened_at: string;
  open_count: number;
  is_active: boolean;
}

interface Stats {
  total: number;
  ios: number;
  android: number;
  desktop: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export const AdminPWAStats = () => {
  const [installations, setInstallations] = useState<PWAInstallation[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    ios: 0,
    android: 0,
    desktop: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await adminApi.select<PWAInstallation[]>(
        'pwa_installations',
        {
          select: '*',
          order: { column: 'installed_at', ascending: false }
        }
      );

      if (error) {
        console.error('Error fetching PWA stats:', error);
        return;
      }

      if (data) {
        setInstallations(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error('Error fetching PWA stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: PWAInstallation[]) => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfDay(subDays(now, 7));
    const monthStart = startOfDay(subDays(now, 30));

    const newStats: Stats = {
      total: data.length,
      ios: data.filter(d => d.device_type === 'ios').length,
      android: data.filter(d => d.device_type === 'android').length,
      desktop: data.filter(d => !['ios', 'android'].includes(d.device_type)).length,
      today: data.filter(d => new Date(d.installed_at) >= todayStart).length,
      thisWeek: data.filter(d => new Date(d.installed_at) >= weekStart).length,
      thisMonth: data.filter(d => new Date(d.installed_at) >= monthStart).length
    };

    setStats(newStats);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'ios':
        return <Apple className="h-4 w-4" />;
      case 'android':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getDeviceBadge = (deviceType: string) => {
    const colors: Record<string, string> = {
      ios: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      android: 'bg-green-500/10 text-green-500 border-green-500/20',
      windows: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      macos: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
      desktop: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    };

    return (
      <Badge variant="outline" className={colors[deviceType] || colors.desktop}>
        <span className="flex items-center gap-1">
          {getDeviceIcon(deviceType)}
          {deviceType.toUpperCase()}
        </span>
      </Badge>
    );
  };

  const statCards = [
    { 
      title: "總安裝數", 
      value: stats.total, 
      icon: Download, 
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    { 
      title: "iOS 用戶", 
      value: stats.ios, 
      icon: Apple, 
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    { 
      title: "Android 用戶", 
      value: stats.android, 
      icon: Smartphone, 
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    { 
      title: "桌面用戶", 
      value: stats.desktop, 
      icon: Monitor, 
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    { 
      title: "今日安裝", 
      value: stats.today, 
      icon: Calendar, 
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
    { 
      title: "本週安裝", 
      value: stats.thisWeek, 
      icon: TrendingUp, 
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10"
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">PWA 安裝統計</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Device Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            設備分佈
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            {stats.total > 0 && (
              <>
                <div className="flex-1">
                  <div className="flex h-4 rounded-full overflow-hidden bg-muted">
                    <div 
                      className="bg-blue-500 transition-all duration-500"
                      style={{ width: `${(stats.ios / stats.total) * 100}%` }}
                    />
                    <div 
                      className="bg-green-500 transition-all duration-500"
                      style={{ width: `${(stats.android / stats.total) * 100}%` }}
                    />
                    <div 
                      className="bg-purple-500 transition-all duration-500"
                      style={{ width: `${(stats.desktop / stats.total) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    iOS {((stats.ios / stats.total) * 100).toFixed(1)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    Android {((stats.android / stats.total) * 100).toFixed(1)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    桌面 {((stats.desktop / stats.total) * 100).toFixed(1)}%
                  </span>
                </div>
              </>
            )}
            {stats.total === 0 && (
              <div className="text-muted-foreground text-center py-4 w-full">
                暫無安裝數據
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Installation Records */}
      <Card>
        <CardHeader>
          <CardTitle>安裝記錄</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>設備類型</TableHead>
                <TableHead>瀏覽器</TableHead>
                <TableHead>系統版本</TableHead>
                <TableHead>安裝時間</TableHead>
                <TableHead>最後打開</TableHead>
                <TableHead>打開次數</TableHead>
                <TableHead>狀態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    暫無安裝記錄
                  </TableCell>
                </TableRow>
              ) : (
                installations.slice(0, 50).map((installation) => (
                  <TableRow key={installation.id}>
                    <TableCell>{getDeviceBadge(installation.device_type)}</TableCell>
                    <TableCell>{installation.browser}</TableCell>
                    <TableCell>{installation.os_version}</TableCell>
                    <TableCell>
                      {format(new Date(installation.installed_at), 'MM/dd HH:mm', { locale: zhTW })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(installation.last_opened_at), 'MM/dd HH:mm', { locale: zhTW })}
                    </TableCell>
                    <TableCell>{installation.open_count}</TableCell>
                    <TableCell>
                      <Badge variant={installation.is_active ? "default" : "secondary"}>
                        {installation.is_active ? '活躍' : '非活躍'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPWAStats;
