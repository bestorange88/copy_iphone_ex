import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { adminApi } from "@/hooks/useAdminData";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye, Shield, ShieldCheck, Loader2, Image as ImageIcon, Video, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createAdminAuditLog, AdminAuditActions, AdminResourceTypes } from "@/services/adminAuditLog";
import { formatTaiwanDateTime } from "@/lib/timezone";
import { sendKycResultMessage } from "@/services/systemMessageService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface KYCVerification {
  id: string;
  user_id: string;
  real_name: string;
  id_type: string;
  id_number: string;
  status: string;
  submitted_at: string;
  id_front_url?: string;
  id_back_url?: string;
  selfie_url?: string;
  video_url?: string;
  address?: string;
  occupation?: string;
  nationality?: string;
  username?: string;
  email?: string;
  user_number?: number;
  kyc_level?: string;
  trading_limit?: number;
  withdrawal_limit?: number;
  reject_reason?: string;
}

export const AdminKYCManager = () => {
  const { t } = useTranslation();
  const { admin } = useAdminAuth();
  const [verifications, setVerifications] = useState<KYCVerification[]>([]);
  const [selectedKYC, setSelectedKYC] = useState<KYCVerification | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'basic' | 'advanced'>('all');
  const [signedUrls, setSignedUrls] = useState<{
    front?: string;
    back?: string;
    selfie?: string;
    video?: string;
  }>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    kyc: KYCVerification | null;
  }>({ open: false, kyc: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchVerifications = async () => {
    const { data, error } = await adminApi.getKycWithProfiles();
    if (error) {
      toast.error(t('admin.load_failed'));
      return;
    }
    
    let kycList = (data as KYCVerification[]) || [];

    // 检查是否存在缺失 user_number 的记录
    // Check if any record is missing user_number
    const missingUserNumber = kycList.some(k => !k.user_number);
    
    if (missingUserNumber) {
      console.log('Detected missing user_number in KYC list, attempting to backfill...');
      // Fallback: fetch all users to get user_number
      // 备用方案：如果 Edge Function 没有返回 user_number，则获取所有用户数据进行补充
      try {
        const { data: usersData } = await adminApi.getUsers();
        if (usersData) {
          const userMap = new Map(usersData.map(u => [u.id, u.user_number]));
          kycList = kycList.map(k => ({
            ...k,
            user_number: k.user_number || userMap.get(k.user_id)
          }));
        }
      } catch (e) {
        console.error("Failed to fetch users for backfill", e);
      }
    }

    setVerifications(kycList);
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const filteredVerifications = verifications.filter(kyc => {
    if (activeTab === 'all') return true;
    return kyc.kyc_level === activeTab;
  });

    const handleApprove = async (id: string) => {
      setLoading(true);
    
      const kyc = verifications.find(v => v.id === id);
      if (!kyc) return;
    
      const tableName = kyc.kyc_level === 'advanced' ? 'advanced_kyc_verifications' : 'kyc_verifications';
      const { error } = await adminApi.update(tableName, {
        status: 'approved',
        reviewed_at: new Date().toISOString()
      }, { id });

    if (error) {
      toast.error(t('admin.approve_failed'));
    } else {
      if (admin) {
        await createAdminAuditLog({
          adminId: admin.id,
          adminUsername: admin.username,
          action: AdminAuditActions.KYC_APPROVE,
          resourceType: AdminResourceTypes.KYC_VERIFICATION,
          resourceId: id,
          details: {
            user_id: kyc.user_id,
            username: kyc.username,
            real_name: kyc.real_name,
            id_type: kyc.id_type,
            id_number: kyc.id_number,
            kyc_level: kyc.kyc_level
          }
        });
      }
      
        // 发送系统消息通知用户
        await sendKycResultMessage(
          kyc.user_id,
          kyc.kyc_level === 'advanced' ? 'advanced' : 'basic',
          true
        );
      
        toast.success(t('admin.kyc.approved', { level: kyc.kyc_level === 'advanced' ? t('kyc.advanced_verification') : t('kyc.basic_verification') }));
        setSelectedKYC(null);
        fetchVerifications();
      }
      setLoading(false);
    };

      const handleReject = async (id: string) => {
      if (!rejectReason.trim()) {
        toast.error(t('admin.kyc.reject_reason_required'));
        return;
      }

      setLoading(true);
    
      const kyc = verifications.find(v => v.id === id);
      if (!kyc) return;
    
      const tableName = kyc.kyc_level === 'advanced' ? 'advanced_kyc_verifications' : 'kyc_verifications';
      const { error } = await adminApi.update(tableName, {
        status: 'rejected',
        reject_reason: rejectReason,
        reviewed_at: new Date().toISOString()
      }, { id });

    if (error) {
      toast.error(t('admin.reject_failed'));
    } else {
      if (admin) {
        await createAdminAuditLog({
          adminId: admin.id,
          adminUsername: admin.username,
          action: AdminAuditActions.KYC_REJECT,
          resourceType: AdminResourceTypes.KYC_VERIFICATION,
          resourceId: id,
          details: {
            user_id: kyc.user_id,
            username: kyc.username,
            real_name: kyc.real_name,
            id_type: kyc.id_type,
            id_number: kyc.id_number,
            kyc_level: kyc.kyc_level,
            reject_reason: rejectReason
          }
        });
      }
      
        // 发送系统消息通知用户
        await sendKycResultMessage(
          kyc.user_id,
          kyc.kyc_level === 'advanced' ? 'advanced' : 'basic',
          false,
          rejectReason
        );
      
        toast.success(t('admin.kyc.rejected'));
        setRejectReason("");
        setSelectedKYC(null);
        fetchVerifications();
      }
      setLoading(false);
    };

    const handleDeleteKYC = async () => {
    const kyc = deleteConfirm.kyc;
    if (!kyc) return;

    setIsDeleting(true);
    try {
      const tableName = kyc.kyc_level === 'advanced' ? 'advanced_kyc_verifications' : 'kyc_verifications';
      const { error } = await adminApi.delete(tableName, { id: kyc.id });

      if (error) throw error;

      if (admin) {
        await createAdminAuditLog({
          adminId: admin.id,
          adminUsername: admin.username,
          action: AdminAuditActions.KYC_REJECT,
          resourceType: AdminResourceTypes.KYC_VERIFICATION,
          resourceId: kyc.id,
          details: {
            action: 'delete',
            user_id: kyc.user_id,
            username: kyc.username,
            real_name: kyc.real_name,
            id_type: kyc.id_type,
            id_number: kyc.id_number,
            kyc_level: kyc.kyc_level,
            status: kyc.status
          }
        });
      }

      toast.success(t('admin.kyc.deleted') || '已删除');
      setDeleteConfirm({ open: false, kyc: null });
      fetchVerifications();
    } catch (err) {
      console.error('Failed to delete KYC:', err);
      toast.error(t('admin.delete_failed') || '删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  const loadSignedUrls = async (kyc: KYCVerification) => {
    setLoadingMedia(true);
    const urls: { front?: string; back?: string; selfie?: string; video?: string } = {};

    try {
      // Use adminApi.getSignedUrl to bypass RLS for private kyc-documents bucket
      if (kyc.id_front_url) {
        const { data, error } = await adminApi.getSignedUrl('kyc-documents', kyc.id_front_url);
        if (!error && data?.signedUrl) urls.front = data.signedUrl;
      }

      if (kyc.id_back_url) {
        const { data, error } = await adminApi.getSignedUrl('kyc-documents', kyc.id_back_url);
        if (!error && data?.signedUrl) urls.back = data.signedUrl;
      }

      if (kyc.selfie_url) {
        const { data, error } = await adminApi.getSignedUrl('kyc-documents', kyc.selfie_url);
        if (!error && data?.signedUrl) urls.selfie = data.signedUrl;
      }

      if (kyc.video_url) {
        const { data, error } = await adminApi.getSignedUrl('kyc-documents', kyc.video_url);
        if (!error && data?.signedUrl) urls.video = data.signedUrl;
      }

      setSignedUrls(urls);
    } catch (error) {
      console.error('Failed to load media:', error);
      toast.error(t('admin.kyc.load_media_failed'));
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleViewKYC = async (kyc: KYCVerification) => {
    setSelectedKYC(kyc);
    setSignedUrls({});
    await loadSignedUrls(kyc);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "outline", label: t('kyc.status_pending') },
      approved: { variant: "default", label: t('kyc.status_approved') },
      rejected: { variant: "destructive", label: t('kyc.status_rejected') }
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getLevelBadge = (level: string) => {
    if (level === 'advanced') {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          {t('kyc.advanced_verification')}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Shield className="h-3 w-3" />
        {t('kyc.basic_verification')}
      </Badge>
    );
  };

  const pendingBasicCount = verifications.filter(v => v.kyc_level === 'basic' && v.status === 'pending').length;
  const pendingAdvancedCount = verifications.filter(v => v.kyc_level === 'advanced' && v.status === 'pending').length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('admin.kyc.title')}</span>
            <div className="flex gap-2 text-sm font-normal">
              {pendingBasicCount > 0 && (
                <Badge variant="outline">{t('admin.kyc.basic_pending')}: {pendingBasicCount}</Badge>
              )}
              {pendingAdvancedCount > 0 && (
                <Badge variant="secondary">{t('admin.kyc.advanced_pending')}: {pendingAdvancedCount}</Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'basic' | 'advanced')}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">{t('common.all') || '全部'}</TabsTrigger>
              <TabsTrigger value="basic" className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                {t('kyc.basic_verification')}
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" />
                {t('kyc.advanced_verification')}
              </TabsTrigger>
            </TabsList>

            <div className="space-y-4">
              {filteredVerifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('admin.kyc.no_applications')}
                </div>
              ) : (
                filteredVerifications.map((kyc) => (
                  <div key={kyc.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{kyc.real_name}</span>
                        {getLevelBadge(kyc.kyc_level || 'basic')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {kyc.id_type} - {kyc.id_number}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ID: {kyc.user_number || '-'} | {t('admin.kyc.user')}: {kyc.username} | {t('admin.kyc.submit_time')}: {formatTaiwanDateTime(kyc.submitted_at)}
                      </div>
                      {kyc.kyc_level === 'basic' && (
                        <div className="text-xs text-muted-foreground">
                          {t('admin.kyc.limit')}: 50,000 USDT
                        </div>
                      )}
                      {kyc.kyc_level === 'advanced' && (
                        <div className="text-xs text-muted-foreground">
                          {t('admin.kyc.limit')}: {t('kyc.unlimited')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(kyc.status)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewKYC(kyc)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {kyc.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(kyc.id)}
                            disabled={loading}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {t('admin.kyc.approve')}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleViewKYC(kyc)}
                            disabled={loading}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            {t('admin.kyc.reject')}
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-100"
                        onClick={() => setDeleteConfirm({ open: true, kyc })}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {selectedKYC && (
        <Dialog open={!!selectedKYC} onOpenChange={() => {
          setSelectedKYC(null);
          setSignedUrls({});
          setRejectReason("");
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {t('admin.kyc.details')}
                {getLevelBadge(selectedKYC.kyc_level || 'basic')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium">{t('admin.kyc.user')} ID</div>
                  <div>{selectedKYC.user_number || '-'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">{t('admin.kyc.user')}</div>
                  <div>{selectedKYC.username || '-'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">{t('kyc.real_name')}</div>
                  <div>{selectedKYC.real_name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">{t('kyc.id_type')}</div>
                  <div>{selectedKYC.id_type}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">{t('kyc.id_number')}</div>
                  <div>{selectedKYC.id_number}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">{t('common.status')}</div>
                  {getStatusBadge(selectedKYC.status)}
                </div>
                <div>
                  <div className="text-sm font-medium">{t('admin.kyc.level')}</div>
                  <div>{selectedKYC.kyc_level === 'advanced' ? t('kyc.advanced_verification') : t('kyc.basic_verification')}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">{t('admin.kyc.limit')}</div>
                  <div>{selectedKYC.kyc_level === 'advanced' ? t('kyc.unlimited') : '50,000 USDT'}</div>
                </div>
              </div>

              {/* Advanced KYC additional info */}
              {selectedKYC.kyc_level === 'advanced' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium">{t('kyc.nationality')}</div>
                    <div>{selectedKYC.nationality || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t('kyc.occupation')}</div>
                    <div>{selectedKYC.occupation || '-'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm font-medium">{t('kyc.address')}</div>
                    <div>{selectedKYC.address || '-'}</div>
                  </div>
                </div>
              )}

              {selectedKYC.reject_reason && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="text-sm font-medium text-destructive">{t('kyc.reject_reason')}</div>
                  <div className="text-sm">{selectedKYC.reject_reason}</div>
                </div>
              )}

              {/* Documents Section */}
              <div className="space-y-4">
                <div className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  {t('admin.kyc.uploaded_documents')}
                </div>
                {loadingMedia ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    {t('common.loading')}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {signedUrls.front && (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">{t('kyc.doc_front')}</div>
                        <img 
                          src={signedUrls.front} 
                          alt="ID Front" 
                          className="w-full h-48 object-contain border rounded-lg bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(signedUrls.front, '_blank')}
                        />
                      </div>
                    )}
                    {signedUrls.back && (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">{t('kyc.doc_back')}</div>
                        <img 
                          src={signedUrls.back} 
                          alt="ID Back" 
                          className="w-full h-48 object-contain border rounded-lg bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(signedUrls.back, '_blank')}
                        />
                      </div>
                    )}
                    {signedUrls.selfie && (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">{t('kyc.doc_selfie')}</div>
                        <img 
                          src={signedUrls.selfie} 
                          alt="Selfie" 
                          className="w-full h-48 object-contain border rounded-lg bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(signedUrls.selfie, '_blank')}
                        />
                      </div>
                    )}
                    {!signedUrls.front && !signedUrls.back && !signedUrls.selfie && selectedKYC.kyc_level === 'basic' && (
                      <div className="col-span-2 text-center py-8 text-muted-foreground">
                        {t('admin.kyc.no_documents')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Video Section - Only for advanced KYC */}
              {selectedKYC.kyc_level === 'advanced' && (
                <div className="space-y-4">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    {t('admin.kyc.face_video')}
                  </div>
                  {loadingMedia ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      {t('common.loading')}
                    </div>
                  ) : signedUrls.video ? (
                    <div className="space-y-2">
                      <video 
                        src={signedUrls.video} 
                        controls
                        className="w-full max-h-[400px] rounded-lg bg-black"
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      {t('admin.kyc.no_video')}
                    </div>
                  )}
                </div>
              )}

              {selectedKYC.status === 'pending' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin.kyc.reject_reason_label')}</label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={t('admin.kyc.reject_reason_placeholder')}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(selectedKYC.id)}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {t('admin.kyc.approve')} {selectedKYC.kyc_level === 'advanced' ? t('kyc.advanced_verification') : t('kyc.basic_verification')}
                    </Button>
                    <Button
                      onClick={() => handleReject(selectedKYC.id)}
                      disabled={loading}
                      variant="destructive"
                      className="flex-1"
                    >
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {t('admin.kyc.reject')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 删除确认弹窗 */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.kyc.delete_confirm_title') || '确认删除'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.kyc.delete_confirm_desc') || '确定要删除此实名认证记录吗？此操作不可撤销。'}
              {deleteConfirm.kyc && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <div>{t('admin.kyc.user')}: {deleteConfirm.kyc.username}</div>
                  <div>{t('kyc.real_name')}: {deleteConfirm.kyc.real_name}</div>
                  <div>ID: {deleteConfirm.kyc.user_number || '-'}</div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || '取消'}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteKYC}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('common.delete') || '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
