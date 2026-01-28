import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Upload, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { z } from "zod";
import { useTranslation } from "react-i18next";

interface KYCData {
  id?: string;
  real_name: string;
  id_type: string;
  id_number: string;
  id_front_url?: string;
  id_back_url?: string;
  selfie_url?: string;
  status?: string;
  reject_reason?: string;
  submitted_at?: string;
}

const kycSchema = z.object({
  real_name: z.string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[\p{L}\s'-]+$/u, 'Name contains invalid characters'),
  id_type: z.enum(['id_card', 'passport', 'driver_license']),
  id_number: z.string()
    .trim()
    .min(5, 'ID number must be at least 5 characters')
    .max(50, 'ID number must be less than 50 characters')
    .regex(/^[A-Z0-9]+$/i, 'ID number must contain only letters and numbers'),
});

export default function KYC() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [kycData, setKycData] = useState<KYCData>({
    real_name: '',
    id_type: 'id_card',
    id_number: '',
  });
  const [existingKyc, setExistingKyc] = useState<KYCData | null>(null);
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string>('');
  const [idBackPreview, setIdBackPreview] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const loadKycData = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('kyc_verifications')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setExistingKyc(data);
          setKycData({
            real_name: data.real_name,
            id_type: data.id_type,
            id_number: data.id_number,
            id_front_url: data.id_front_url,
            id_back_url: data.id_back_url,
            selfie_url: data.selfie_url,
            status: data.status,
            reject_reason: data.reject_reason,
            submitted_at: data.submitted_at
          });

          // Load image previews from stored URLs
          if (data.id_front_url) await loadImagePreview(data.id_front_url, 'front');
          if (data.id_back_url) await loadImagePreview(data.id_back_url, 'back');
        }
      } catch (error) {
        console.error('Failed to load KYC data:', error);
        toast.error(t('kyc.load_failed'));
      } finally {
        setLoading(false);
      }
    };

    loadKycData();
  }, [user, t]);

  const loadImagePreview = async (storedPath: string, type: 'front' | 'back') => {
    if (!storedPath) return;
    
    try {
      // Generate signed URL for preview
      const { data, error } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(storedPath, 3600);
      
      if (error) throw error;
      if (!data?.signedUrl) return;
      
      if (type === 'front') setIdFrontPreview(data.signedUrl);
      else if (type === 'back') setIdBackPreview(data.signedUrl);
    } catch (error) {
      console.error('Failed to load image preview:', error);
    }
  };

  const handleFileUpload = async (file: File, type: 'front' | 'back' | 'selfie'): Promise<string> => {
    // Client-side validation (first line of defense)
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedTypes = ['jpg', 'jpeg', 'png', 'pdf'];
    
    if (!fileExt || !allowedTypes.includes(fileExt)) {
      throw new Error(t('kyc.file_format_error'));
    }
    
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(t('kyc.file_size_error'));
    }

    // Get session token for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error(t('kyc.login_required'));
    }

    // Server-side validation and upload via edge function
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const { data, error } = await supabase.functions.invoke('validate-kyc-upload', {
      body: formData,
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      throw new Error(error.message || t('kyc.upload_failed'));
    }

    if (!data?.success || !data?.path) {
      throw new Error(data?.error || t('kyc.upload_failed'));
    }

    // Return the file path for database storage
    return data.path;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 设置上传状态
    if (type === 'front') setUploadingFront(true);
    else setUploadingBack(true);
    
    // 创建本地预览
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      if (type === 'front') setIdFrontPreview(preview);
      else setIdBackPreview(preview);
    };
    reader.readAsDataURL(file);
    
    try {
      const path = await handleFileUpload(file, type);
      
      console.log(`${type} uploaded successfully, path:`, path);
      
      // 立即更新状态
      setKycData(prev => {
        const updated = {
          ...prev,
          [type === 'front' ? 'id_front_url' : 'id_back_url']: path
        };
        console.log('Updated kycData:', updated);
        return updated;
      });
      
      if (type === 'front') {
        setIdFrontFile(file);
      } else {
        setIdBackFile(file);
      }
      
      // 重置输入
      e.target.value = '';
      
      toast.success(t('kyc.upload_success'));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('kyc.upload_failed');
      console.error(`File upload error for ${type}:`, error);
      toast.error(errorMessage);
      
      // 清除预览
      if (type === 'front') setIdFrontPreview('');
      else setIdBackPreview('');
      
      // 重置输入
      e.target.value = '';
    } finally {
      // 清除上传状态
      if (type === 'front') setUploadingFront(false);
      else setUploadingBack(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    console.log('Submitting KYC with data:', {
      real_name: kycData.real_name,
      id_type: kycData.id_type,
      id_number: kycData.id_number,
      id_front_url: kycData.id_front_url,
      id_back_url: kycData.id_back_url
    });

    // Validate input
    const validation = kycSchema.safeParse({
      real_name: kycData.real_name,
      id_type: kycData.id_type,
      id_number: kycData.id_number,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    // Validate file uploads - 检查正反面照片是否都已上传
    if (!kycData.id_front_url || !kycData.id_back_url) {
      const missingDocs = [];
      if (!kycData.id_front_url) missingDocs.push(t('kyc.doc_front'));
      if (!kycData.id_back_url) missingDocs.push(t('kyc.doc_back'));
      
      console.error('Missing documents:', missingDocs);
      toast.error(t('kyc.upload_all_required') + ': ' + missingDocs.join(', '));
      return;
    }

    setSubmitting(true);
    try {
      if (existingKyc) {
        // 更新现有记录
        const { error } = await supabase
          .from('kyc_verifications')
          .update({
            real_name: kycData.real_name,
            id_type: kycData.id_type,
            id_number: kycData.id_number,
            id_front_url: kycData.id_front_url,
            id_back_url: kycData.id_back_url,
            status: 'pending',
            reject_reason: null,
            submitted_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // 创建新记录
        const { error } = await supabase
          .from('kyc_verifications')
          .insert({
            user_id: user.id,
            real_name: kycData.real_name,
            id_type: kycData.id_type,
            id_number: kycData.id_number,
            id_front_url: kycData.id_front_url,
            id_back_url: kycData.id_back_url,
            status: 'pending'
          });

        if (error) throw error;
      }

      // 重新加载KYC数据以显示最新状态
      const { data: updatedKyc } = await supabase
        .from('kyc_verifications')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (updatedKyc) {
        setExistingKyc(updatedKyc);
        setKycData({
          real_name: updatedKyc.real_name,
          id_type: updatedKyc.id_type,
          id_number: updatedKyc.id_number,
          id_front_url: updatedKyc.id_front_url,
          id_back_url: updatedKyc.id_back_url,
          status: updatedKyc.status,
          reject_reason: updatedKyc.reject_reason,
          submitted_at: updatedKyc.submitted_at
        });
      }

      toast.success(t('kyc.submit_success'));
    } catch (error) {
      console.error('Failed to submit KYC:', error);
      toast.error(t('kyc.submit_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading || !user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const isApproved = existingKyc?.status === 'approved';
  const isPending = existingKyc?.status === 'pending';
  const isRejected = existingKyc?.status === 'rejected';

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 mb-20 lg:mb-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('kyc.title')}</h1>
            <p className="text-muted-foreground">{t('kyc.subtitle')}</p>
          </div>
        </div>

                {isApproved && (
                  <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-700 dark:text-green-300">
                      {t('kyc.approved_message')}
                    </AlertDescription>
                  </Alert>
                )}

                {/* 高级实名认证入口 - 初级认证通过后显示 */}
                {isApproved && (
                  <Card className="border-primary/50 bg-gradient-to-br from-card to-primary/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        {t('kyc.advanced_title', '高級實名認證')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {t('kyc.advanced_description', '完成高級實名認證可享受更高的提現額度和更多功能。')}
                      </p>
                      <div className="flex items-center gap-4">
                        <Button 
                          onClick={() => navigate('/kyc/advanced')}
                          className="gap-2"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          {t('kyc.start_advanced', '開始高級認證')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

        {isPending && (
          <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
            <AlertDescription className="text-yellow-700 dark:text-yellow-300">
              {t('kyc.pending_message')}
            </AlertDescription>
          </Alert>
        )}

        {isRejected && (
          <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700 dark:text-red-300">
              {t('kyc.rejected_message')}: {kycData.reject_reason || t('kyc.recheck_info')}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('kyc.info_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="real_name">{t('kyc.real_name')} *</Label>
                <Input
                  id="real_name"
                  value={kycData.real_name}
                  onChange={(e) => setKycData({ ...kycData, real_name: e.target.value })}
                  placeholder={t('kyc.real_name_placeholder')}
                  disabled={isApproved || isPending}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="id_type">{t('kyc.id_type')} *</Label>
                <Select
                  value={kycData.id_type}
                  onValueChange={(value) => setKycData({ ...kycData, id_type: value })}
                  disabled={isApproved || isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id_card">{t('kyc.id_type_id_card')}</SelectItem>
                    <SelectItem value="passport">{t('kyc.id_type_passport')}</SelectItem>
                    <SelectItem value="driver_license">{t('kyc.id_type_driver_license')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="id_number">{t('kyc.id_number')} *</Label>
                <Input
                  id="id_number"
                  value={kycData.id_number}
                  onChange={(e) => setKycData({ ...kycData, id_number: e.target.value })}
                  placeholder={t('kyc.id_number_placeholder')}
                  disabled={isApproved || isPending}
                  required
                />
              </div>

              <div className="space-y-4">
                <Label>{t('kyc.documents')} *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type="file"
                      id="id-front"
                      accept="image/jpeg,image/jpg,image/png,application/pdf"
                      onChange={(e) => handleFileChange(e, 'front')}
                      disabled={isApproved || isPending || uploadingFront}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    />
                    <div className={`border-2 border-dashed rounded-lg p-4 text-center relative ${
                      kycData.id_front_url ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''
                    } ${idFrontPreview ? 'h-48' : 'h-32'}`}>
                      {uploadingFront && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg z-20">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      )}
                      {idFrontPreview ? (
                        <img 
                          src={idFrontPreview} 
                          alt="ID Front" 
                          className="w-full h-full object-contain rounded"
                        />
                      ) : (
                        <>
                          <Upload className={`h-8 w-8 mx-auto mb-2 ${kycData.id_front_url ? 'text-green-500' : 'text-muted-foreground'}`} />
                          <p className="text-sm text-muted-foreground">{t('kyc.doc_front')}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {kycData.id_front_url ? '✓ ' + t('kyc.uploaded') : t('kyc.click_upload')}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      id="id-back"
                      accept="image/jpeg,image/jpg,image/png,application/pdf"
                      onChange={(e) => handleFileChange(e, 'back')}
                      disabled={isApproved || isPending || uploadingBack}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    />
                    <div className={`border-2 border-dashed rounded-lg p-4 text-center relative ${
                      kycData.id_back_url ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''
                    } ${idBackPreview ? 'h-48' : 'h-32'}`}>
                      {uploadingBack && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg z-20">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      )}
                      {idBackPreview ? (
                        <img 
                          src={idBackPreview} 
                          alt="ID Back" 
                          className="w-full h-full object-contain rounded"
                        />
                      ) : (
                        <>
                          <Upload className={`h-8 w-8 mx-auto mb-2 ${kycData.id_back_url ? 'text-green-500' : 'text-muted-foreground'}`} />
                          <p className="text-sm text-muted-foreground">{t('kyc.doc_back')}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {kycData.id_back_url ? '✓ ' + t('kyc.uploaded') : t('kyc.click_upload')}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('kyc.doc_hint')}
                </p>
              </div>

              {!isApproved && (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || isPending}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('kyc.submitting')}
                    </>
                  ) : (
                    <>
                      {isPending ? t('kyc.status_pending') : isRejected ? t('kyc.resubmit_kyc') : t('kyc.submit_kyc')}
                    </>
                  )}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('kyc.tips_title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• {t('kyc.tip_1')}</p>
            <p>• {t('kyc.tip_2')}</p>
            <p>• {t('kyc.tip_3')}</p>
            <p>• {t('kyc.tip_4')}</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
