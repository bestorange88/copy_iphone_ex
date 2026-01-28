import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { 
  Loader2, Shield, LogOut, 
  LayoutDashboard, Users, Wallet, TrendingUp, 
  ArrowDownToLine, ArrowUpFromLine, FileCheck, 
  MapPin, Store, Clock, Coins, 
  Gauge, Timer, Newspaper, Bell, 
  Star, Smartphone, MessageSquare, FileText,
  BarChart3, ChevronDown, ChevronRight,
  Headphones, Settings, HardDrive, Download, Volume2
} from "lucide-react";
import { toast } from "sonner";
import { DepositAddressManager } from "@/components/admin/DepositAddressManager";
import { AdminKYCManager } from "@/components/admin/AdminKYCManager";
import { AdminUsersManager } from "@/components/admin/AdminUsersManager";
import { AdminWithdrawManager } from "@/components/admin/AdminWithdrawManager";
import { AdminAuditLogs } from "@/components/admin/AdminAuditLogs";
import { AdminStats } from "@/components/admin/AdminStats";
import { AdminBalanceManager } from "@/components/admin/AdminBalanceManager";
import { AdminTradeManager } from "@/components/admin/AdminTradeManager";
import { AdminOrderManager } from "@/components/admin/AdminOrderManager";
import { AdminDepositRecords } from "@/components/admin/AdminDepositRecords";
import { AdminTimeContractManager } from "@/components/admin/AdminTimeContractManager";
import { AdminPerpetualControl } from "@/components/admin/AdminPerpetualControl";
import { AdminSecondContractControl } from "@/components/admin/AdminSecondContractControl";
import { AdminOTCManager } from "@/components/admin/AdminOTCManager";
import AdminEarnManager from "@/components/admin/AdminEarnManager";
import { AdminNewsManager } from "@/components/admin/AdminNewsManager";
import { AdminAnnouncementManager } from "@/components/admin/AdminAnnouncementManager";
import { AdminOTPMonitor } from "@/components/admin/AdminOTPMonitor";
import { AdminFeedbackManager } from "@/components/admin/AdminFeedbackManager";
import { AdminShowcaseManager } from "@/components/admin/AdminShowcaseManager";
import { AdminSystemSettings } from "@/components/admin/AdminSystemSettings";
import AdminCustomerServiceManager from "@/components/admin/AdminCustomerServiceManager";
import AdminMiningManager from "@/components/admin/AdminMiningManager";
import AdminPWAStats from "@/components/admin/AdminPWAStats";
import { AdminNoticeManager } from "@/components/admin/AdminNoticeManager";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    id: "overview",
    label: "概覽",
    icon: LayoutDashboard,
    items: [
      { id: "dashboard", label: "總覽", icon: BarChart3 },
    ]
  },
  {
    id: "users",
    label: "用戶管理",
    icon: Users,
    items: [
      { id: "users", label: "用戶列表", icon: Users },
      { id: "kyc", label: "KYC審核", icon: FileCheck },
      { id: "feedback", label: "用戶反饋", icon: MessageSquare },
      { id: "otp-monitor", label: "OTP監控", icon: Smartphone },
      { id: "customer-service", label: "客服管理", icon: Headphones },
    ]
  },
  {
    id: "finance",
    label: "財務管理",
    icon: Wallet,
    items: [
      { id: "balances", label: "用戶財務", icon: Wallet },
      { id: "deposit-records", label: "充值記錄", icon: ArrowDownToLine },
      { id: "withdraw", label: "提現審核", icon: ArrowUpFromLine },
      { id: "deposit", label: "充值地址", icon: MapPin },
    ]
  },
  {
    id: "trading",
    label: "交易管理",
    icon: TrendingUp,
    items: [
      { id: "orders", label: "訂單管理", icon: TrendingUp },
      { id: "trades", label: "交易統計", icon: TrendingUp },
      { id: "otc", label: "OTC商戶", icon: Store },
    ]
  },
  {
    id: "contracts",
    label: "合約控盤",
    icon: Gauge,
    items: [
      { id: "time-contract", label: "時間合約", icon: Clock },
      { id: "perpetual-control", label: "永續控盤", icon: Gauge },
      { id: "second-control", label: "秒合約控盤", icon: Timer },
    ]
  },
  {
    id: "products",
    label: "產品管理",
    icon: Coins,
    items: [
      { id: "earn", label: "理財產品", icon: Coins },
      { id: "mining", label: "礦機產品", icon: HardDrive },
      { id: "showcases", label: "大神曬單", icon: Star },
    ]
  },
  {
    id: "content",
    label: "內容管理",
    icon: Newspaper,
    items: [
      { id: "news", label: "新聞管理", icon: Newspaper },
      { id: "notices", label: "站內公告", icon: Volume2 },
      { id: "announcements", label: "用戶公告", icon: Bell },
    ]
  },
  {
    id: "system",
    label: "系統管理",
    icon: FileText,
    items: [
      { id: "system-settings", label: "系統設置", icon: Settings },
      { id: "pwa-stats", label: "PWA 統計", icon: Download },
      { id: "audit", label: "審計日誌", icon: FileText },
    ]
  }
];

const Admin = () => {
  const navigate = useNavigate();
  const { admin, isAuthenticated, isLoading, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["overview"]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error("請先登錄管理後台");
      navigate("/admin/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogout = () => {
    logout();
    toast.success("已登出管理後台");
    navigate("/admin/login");
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleItemClick = (itemId: string, groupId: string) => {
    setActiveTab(itemId);
    // 确保当前分组是展开的
    if (!expandedGroups.includes(groupId)) {
      setExpandedGroups(prev => [...prev, groupId]);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminStats />;
      case "users":
        return <AdminUsersManager />;
      case "balances":
        return <AdminBalanceManager />;
      case "orders":
        return <AdminOrderManager />;
      case "trades":
        return <AdminTradeManager />;
      case "deposit-records":
        return <AdminDepositRecords />;
      case "withdraw":
        return <AdminWithdrawManager />;
      case "kyc":
        return <AdminKYCManager />;
      case "deposit":
        return <DepositAddressManager />;
      case "otc":
        return <AdminOTCManager />;
      case "time-contract":
        return <AdminTimeContractManager />;
      case "earn":
        return <AdminEarnManager />;
      case "mining":
        return <AdminMiningManager />;
      case "perpetual-control":
        return <AdminPerpetualControl />;
      case "second-control":
        return <AdminSecondContractControl />;
      case "news":
        return <AdminNewsManager />;
      case "notices":
        return <AdminNoticeManager />;
      case "announcements":
        return <AdminAnnouncementManager />;
      case "showcases":
        return <AdminShowcaseManager />;
      case "otp-monitor":
        return <AdminOTPMonitor />;
      case "feedback":
        return <AdminFeedbackManager />;
      case "customer-service":
        return <AdminCustomerServiceManager />;
      case "audit":
        return <AdminAuditLogs />;
      case "system-settings":
        return <AdminSystemSettings />;
      case "pwa-stats":
        return <AdminPWAStats />;
      default:
        return <AdminStats />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-lg font-bold">管理後台</h1>
              <p className="text-xs text-muted-foreground">{admin?.username}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {menuGroups.map((group) => (
              <div key={group.id}>
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    "hover:bg-muted/50",
                    expandedGroups.includes(group.id) && "bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <group.icon className="h-4 w-4" />
                    <span>{group.label}</span>
                  </div>
                  {expandedGroups.includes(group.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {/* Group Items */}
                {expandedGroups.includes(group.id) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item.id, group.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                          activeTab === item.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t">
          <Button variant="outline" onClick={handleLogout} className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            登出
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-14 border-b px-6 flex items-center justify-between bg-card">
          <h2 className="text-lg font-semibold">
            {menuGroups
              .flatMap(g => g.items)
              .find(i => i.id === activeTab)?.label || "總覽"}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground hidden sm:block">
              系統管理與數據監控
            </div>
          </div>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {renderContent()}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Admin;
