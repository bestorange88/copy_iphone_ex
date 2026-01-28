import { useEffect, useState } from "react";
import { adminApi } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileCheck, CreditCard, Database } from "lucide-react";

export const AdminStats = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingKYC: 0,
    pendingWithdraw: 0,
    activeDeposits: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await adminApi.getStats();
        if (error) {
          console.error('Error fetching stats:', error);
          return;
        }
        if (data) {
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: "总用户数", value: stats.totalUsers, icon: Users, color: "text-blue-600" },
    { title: "待审核KYC", value: stats.pendingKYC, icon: FileCheck, color: "text-orange-600" },
    { title: "待审核提现", value: stats.pendingWithdraw, icon: CreditCard, color: "text-purple-600" },
    { title: "活跃充值地址", value: stats.activeDeposits, icon: Database, color: "text-green-600" }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
