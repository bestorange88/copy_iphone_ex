import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";

export const AdminSessionIndicator = () => {
  const { admin, logout, isAuthenticated } = useAdminAuth();

  if (!isAuthenticated || !admin) return null;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="flex items-center gap-1.5 px-2 py-1">
        <Clock className="h-3 w-3" />
        <span className="text-xs">{admin.username}</span>
      </Badge>
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={logout}
        className="h-7 px-2"
      >
        <LogOut className="h-3 w-3 mr-1" />
        登出
      </Button>
    </div>
  );
};
