import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createAdminAuditLog, AdminAuditActions, AdminResourceTypes } from '@/services/adminAuditLog';

interface AdminUser {
  id: string;
  username: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; requiresTotp?: boolean; adminId?: string }>;
  loginWithTotp: (adminId: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ADMIN_TOKEN_KEY = 'binarycent_admin_token';

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Logout
  const performLogout = useCallback(async () => {
    const currentAdmin = admin;
    
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdmin(null);

    // Log the logout action
    if (currentAdmin) {
      try {
        await createAdminAuditLog({
          adminId: currentAdmin.id,
          adminUsername: currentAdmin.username,
          action: AdminAuditActions.LOGOUT,
          resourceType: AdminResourceTypes.ADMIN_SESSION,
          details: { reason: 'manual' }
        });
      } catch (err) {
        console.error('Failed to log admin logout:', err);
      }
    }
  }, [admin]);

  // Check for existing admin token on mount
  useEffect(() => {
    const checkAdminAuth = async () => {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('admin-login', {
          body: { action: 'verify', token }
        });

        if (error || !data?.valid) {
          localStorage.removeItem(ADMIN_TOKEN_KEY);
          setAdmin(null);
        } else {
          setAdmin(data.admin);
        }
      } catch (err) {
        console.error('Admin auth check failed:', err);
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setAdmin(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAuth();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string; requiresTotp?: boolean; adminId?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { action: 'login', username, password }
      });

      if (error) {
        return { success: false, error: 'Authentication failed' };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Invalid credentials' };
      }

      // Check if TOTP is required
      if (data.requiresTotp) {
        return { success: true, requiresTotp: true, adminId: data.adminId };
      }

      // Store token and set admin state
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setAdmin(data.admin);

      // Log the login action
      try {
        await createAdminAuditLog({
          adminId: data.admin.id,
          adminUsername: data.admin.username,
          action: AdminAuditActions.LOGIN,
          resourceType: AdminResourceTypes.ADMIN_SESSION,
          details: { 
            loginTime: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        });
      } catch (err) {
        console.error('Failed to log admin login:', err);
      }
      
      return { success: true };
    } catch (err) {
      console.error('Admin login error:', err);
      return { success: false, error: 'Network error' };
    }
  };

  const loginWithTotp = async (adminId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { action: 'complete_totp_login', admin_id: adminId }
      });

      if (error || !data?.success) {
        return { success: false, error: data?.error || 'Login failed' };
      }

      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setAdmin(data.admin);

      return { success: true };
    } catch (err) {
      console.error('TOTP login error:', err);
      return { success: false, error: 'Network error' };
    }
  };

  const logout = useCallback(() => {
    performLogout();
  }, [performLogout]);

  return (
    <AdminAuthContext.Provider value={{
      admin,
      isLoading,
      isAuthenticated: !!admin,
      login,
      loginWithTotp,
      logout
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
