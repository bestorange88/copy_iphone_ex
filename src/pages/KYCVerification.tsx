import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, CheckCircle, XCircle, Clock, Shield, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import IdCardUploader from "@/components/kyc/IdCardUploader";
import VideoRecorder from "@/components/kyc/VideoRecorder";

interface KYCData {
  id?: string;
  real_name: string;
  id_type: string;
  id_number: string;
  id_front_url?: string;
  id_back_url?: string;
  selfie_url?: string;
  video_url?: string;
  address?: string;
  occupation?: string;
  nationality?: string;
  status?: string;
  reject_reason?: string;
  submitted_at?: string;
  kyc_level?: string;
}

const basicKycSchema = z.object({
  real_name: z.string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  id_number: z.string()
    .trim()
    .min(5, 'ID number must be at least 5 characters')
    .max(50, 'ID number must be less than 50 characters'),
});

const advancedKycSchema = z.object({
  address: z.string().trim().min(5, 'Address must be at least 5 characters').max(200, 'Address too long'),
  occupation: z.string().trim().min(2, 'Occupation is required').max(100, 'Occupation too long'),
  nationality: z.string().trim().min(2, 'Nationality is required').max(50, 'Nationality too long'),
});

export default function KYCVerification() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  
  const [basicKycData, setBasicKycData] = useState<KYCData>({
    real_name: '',
    id_type: 'id_card',
    id_number: '',
    id_front_url: '',
    id_back_url: '',
  });
  
  const [advancedKycData, setAdvancedKycData] = useState<KYCData>({
    real_name: '',
    id_type: 'id_card',
    id_number: '',
    address: '',
    occupation: '',
    nationality: '',
    video_url: '',
  });
  
  const [existingBasicKYC, setExistingBasicKYC] = useState<KYCData | null>(null);
  const [existingAdvancedKYC, setExistingAdvancedKYC] = useState<KYCData | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const loadKYC = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('kyc_verifications')
          .select('*')
          .eq('user_id', user.id);

        if (error && error.code !== 'PGRST116') throw error;

        if (data && data.length > 0) {
          const basicKyc = data.find(k => k.kyc_level === 'basic');
          const advancedKyc = data.find(k => k.kyc_level === 'advanced');
          
          if (basicKyc) {
            setExistingBasicKYC(basicKyc);
            setBasicKycData({
              real_name: basicKyc.real_name,
              id_type: basicKyc.id_type,
              id_number: basicKyc.id_number,
              id_front_url: basicKyc.id_front_url || '',
              id_back_url: basicKyc.id_back_url || '',
            });
            // Pre-fill advanced KYC with basic info
            setAdvancedKycData(prev => ({
              ...prev,
              real_name: basicKyc.real_name,
              id_type: basicKyc.id_type,
              id_number: basicKyc.id_number,
            }));
          }
          
          if (advancedKyc) {
            setExistingAdvancedKYC(advancedKyc);
            setAdvancedKycData({
              real_name: advancedKyc.real_name,
              id_type: advancedKyc.id_type,
              id_number: advancedKyc.id_number,
              address: advancedKyc.address || '',
              occupation: advancedKyc.occupation || '',
              nationality: advancedKyc.nationality || '',
              video_url: advancedKyc.video_url || '',
            });
          }
          
          // Auto-select appropriate tab
          if (basicKyc?.status === 'approved' && !advancedKyc) {
            setActiveTab('advanced');
          }
        }
      } catch (error) {
        console.error('Failed to load KYC:', error);
        toast.error(t('kyc.load_failed'));
      } finally {
        setLoading(false);
      }
    };

    loadKYC();
  }, [user, t]);

  const uploadVideo = async (blob: Blob): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    
    const fileName = `${user.id}/video_${Date.now()}.webm`;
    
    const { error } = await supabase.storage
      .from('kyc-documents')
      .upload(fileName, blob, {
        contentType: 'video/webm',
        upsert: false,
      });

    if (error) throw error;
    return fileName;
  };

  const handleBasicSubmit = async () => {
    if (!user) return;

    // Validate form
    const validation = basicKycSchema.safeParse({
      real_name: basicKycData.real_name,
      id_number: basicKycData.id_number,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    // Validate ID card uploads
    if (!basicKycData.id_front_url || !basicKycData.id_back_url) {
      toast.error(t('kyc.upload_all_required'));
      return;
    }

    setSubmitting(true);
    try {
      const kycPayload = {
        user_id: user.id,
        real_name: basicKycData.real_name,
        id_type: basicKycData.id_type,
        id_number: basicKycData.id_number,
        id_front_url: basicKycData.id_front_url,
        id_back_url: basicKycData.id_back_url,
        kyc_level: 'basic',
        status: 'pending',
        trading_limit: 50000,
        withdrawal_limit: 50000,
      };

      if (existingBasicKYC && (existingBasicKYC.status === 'pending' || existingBasicKYC.status === 'rejected')) {
        const { error } = await supabase
          .from('kyc_verifications')
          .update({
            ...kycPayload,
            reject_reason: null,
          })
          .eq('id', existingBasicKYC.id);

        if (error) throw error;
      } else if (!existingBasicKYC) {
        const { error } = await supabase
          .from('kyc_verifications')
          .insert(kycPayload);

        if (error) throw error;
      }

      toast.success(t('kyc.submit_success'));
      
      // Refresh KYC data
      const { data } = await supabase
        .from('kyc_verifications')
        .select('*')
        .eq('user_id', user.id);
      
      if (data) {
        const basicKyc = data.find(k => k.kyc_level === 'basic');
        if (basicKyc) setExistingBasicKYC(basicKyc);
      }
    } catch (error) {
      console.error('Failed to submit KYC:', error);
      toast.error(t('kyc.submit_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvancedSubmit = async () => {
    if (!user) return;

    // Require basic KYC to be approved first
    if (existingBasicKYC?.status !== 'approved') {
      toast.error(t('kyc.basic_required'));
      return;
    }

    // Validate form
    const validation = advancedKycSchema.safeParse({
      address: advancedKycData.address,
      occupation: advancedKycData.occupation,
      nationality: advancedKycData.nationality,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    // Validate video
    if (!videoBlob && !advancedKycData.video_url) {
      toast.error(t('kyc.video_required'));
      return;
    }

    setSubmitting(true);
    try {
      let videoPath = advancedKycData.video_url;
      
      // Upload video if new one recorded
      if (videoBlob) {
        videoPath = await uploadVideo(videoBlob);
      }

      const kycPayload = {
        user_id: user.id,
        real_name: advancedKycData.real_name || existingBasicKYC?.real_name,
        id_type: advancedKycData.id_type || existingBasicKYC?.id_type || 'id_card',
        id_number: advancedKycData.id_number || existingBasicKYC?.id_number,
        address: advancedKycData.address,
        occupation: advancedKycData.occupation,
        nationality: advancedKycData.nationality,
        video_url: videoPath,
        kyc_level: 'advanced',
        status: 'pending',
        trading_limit: 999999999,
        withdrawal_limit: 999999999,
      };

      if (existingAdvancedKYC && (existingAdvancedKYC.status === 'pending' || existingAdvancedKYC.status === 'rejected')) {
        const { error } = await supabase
          .from('kyc_verifications')
          .update({
            ...kycPayload,
            reject_reason: null,
          })
          .eq('id', existingAdvancedKYC.id);

        if (error) throw error;
      } else if (!existingAdvancedKYC) {
        const { error } = await supabase
          .from('kyc_verifications')
          .insert(kycPayload);

        if (error) throw error;
      }

      toast.success(t('kyc.submit_success'));
      setVideoBlob(null);
      
      // Refresh KYC data
      const { data } = await supabase
        .from('kyc_verifications')
        .select('*')
        .eq('user_id', user.id);
      
      if (data) {
        const advancedKyc = data.find(k => k.kyc_level === 'advanced');
        if (advancedKyc) setExistingAdvancedKYC(advancedKyc);
      }
    } catch (error) {
      console.error('Failed to submit KYC:', error);
      toast.error(t('kyc.submit_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (kyc: KYCData | null) => {
    if (!kyc?.status) return null;

    const statusConfig = {
      pending: { icon: Clock, text: t('kyc.status_pending'), variant: 'outline' as const },
      approved: { icon: CheckCircle, text: t('kyc.status_approved'), variant: 'default' as const },
      rejected: { icon: XCircle, text: t('kyc.status_rejected'), variant: 'destructive' as const },
    };

    const config = statusConfig[kyc.status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const renderKycAlert = (kyc: KYCData | null, level: 'basic' | 'advanced') => {
    if (!kyc?.status) return null;

    const statusConfig = {
      pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
      approved: { icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200' },
      rejected: { icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
    };

    const config = statusConfig[kyc.status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;
    const levelText = level === 'basic' ? t('kyc.basic_verification') : t('kyc.advanced_verification');

    return (
      <Alert className={`${config.color} border`}>
        <Icon className="h-4 w-4" />
        <AlertDescription>
          <span className="font-medium">{levelText}: {t(`kyc.status_${kyc.status}`)}</span>
          {kyc.status === 'rejected' && kyc.reject_reason && (
            <p className="mt-2 text-sm">{t('kyc.reject_reason')}{kyc.reject_reason}</p>
          )}
          {kyc.submitted_at && (
            <p className="mt-1 text-xs opacity-75">
              {t('kyc.submit_time')}{new Date(kyc.submitted_at).toLocaleString()}
            </p>
          )}
        </AlertDescription>
      </Alert>
    );
  };

  const isBasicDisabled = existingBasicKYC?.status === 'approved' || existingBasicKYC?.status === 'pending';
  const isAdvancedDisabled = existingAdvancedKYC?.status === 'approved' || existingAdvancedKYC?.status === 'pending';
  const canSubmitAdvanced = existingBasicKYC?.status === 'approved';

  if (authLoading || loading || !user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 mb-20 lg:mb-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('kyc.title')}</h1>
            <p className="text-muted-foreground">{t('kyc.subtitle')}</p>
          </div>
        </div>

        {/* KYC Level Overview */}
        <div className="grid grid-cols-2 gap-4">
          <Card className={`cursor-pointer transition-all ${existingBasicKYC?.status === 'approved' ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : ''}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-medium">{t('kyc.basic_verification')}</span>
                </div>
                {getStatusBadge(existingBasicKYC)}
              </div>
              <p className="text-sm text-muted-foreground">{t('kyc.basic_limit')}</p>
              <p className="text-lg font-bold mt-1">50,000 USDT</p>
            </CardContent>
          </Card>
          
          <Card className={`cursor-pointer transition-all ${existingAdvancedKYC?.status === 'approved' ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : ''}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <span className="font-medium">{t('kyc.advanced_verification')}</span>
                </div>
                {getStatusBadge(existingAdvancedKYC)}
              </div>
              <p className="text-sm text-muted-foreground">{t('kyc.advanced_limit')}</p>
              <p className="text-lg font-bold mt-1">{t('kyc.unlimited')}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'basic' | 'advanced')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {t('kyc.basic_verification')}
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2" disabled={!canSubmitAdvanced && !existingAdvancedKYC}>
              <ShieldCheck className="h-4 w-4" />
              {t('kyc.advanced_verification')}
            </TabsTrigger>
          </TabsList>

          {/* Basic KYC Tab */}
          <TabsContent value="basic" className="space-y-4">
            {renderKycAlert(existingBasicKYC, 'basic')}
            
            <Card>
              <CardHeader>
                <CardTitle>{t('kyc.basic_info_title')}</CardTitle>
                <CardDescription>{t('kyc.basic_info_desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); handleBasicSubmit(); }} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="basic_real_name">{t('kyc.real_name')} *</Label>
                      <Input
                        id="basic_real_name"
                        value={basicKycData.real_name}
                        onChange={(e) => setBasicKycData({ ...basicKycData, real_name: e.target.value })}
                        placeholder={t('kyc.real_name_placeholder')}
                        disabled={isBasicDisabled}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basic_id_type">{t('kyc.id_type')} *</Label>
                      <Select
                        value={basicKycData.id_type}
                        onValueChange={(value) => setBasicKycData({ ...basicKycData, id_type: value })}
                        disabled={isBasicDisabled}
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
                      <Label htmlFor="basic_id_number">{t('kyc.id_number')} *</Label>
                      <Input
                        id="basic_id_number"
                        value={basicKycData.id_number}
                        onChange={(e) => setBasicKycData({ ...basicKycData, id_number: e.target.value })}
                        placeholder={t('kyc.id_number_placeholder')}
                        disabled={isBasicDisabled}
                        required
                      />
                    </div>

                    {/* ID Card Upload */}
                    <div className="space-y-2">
                      <Label>{t('kyc.documents')} *</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <IdCardUploader
                          userId={user.id}
                          type="front"
                          value={basicKycData.id_front_url}
                          onChange={(path) => setBasicKycData({ ...basicKycData, id_front_url: path })}
                          disabled={isBasicDisabled}
                        />
                        <IdCardUploader
                          userId={user.id}
                          type="back"
                          value={basicKycData.id_back_url}
                          onChange={(path) => setBasicKycData({ ...basicKycData, id_back_url: path })}
                          disabled={isBasicDisabled}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{t('kyc.doc_hint')}</p>
                    </div>
                  </div>

                  <Alert>
                    <AlertDescription className="text-sm">
                      <strong>{t('kyc.tips_title')}</strong>
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        <li>{t('kyc.tip_1')}</li>
                        <li>{t('kyc.tip_2')}</li>
                        <li>{t('kyc.basic_tip_limit')}</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  {(!isBasicDisabled || existingBasicKYC?.status === 'rejected') && (
                    <Button type="submit" disabled={submitting} className="w-full">
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t('common.submitting')}
                        </>
                      ) : existingBasicKYC?.status === 'rejected' ? (
                        t('kyc.resubmit_kyc')
                      ) : (
                        t('kyc.submit_basic')
                      )}
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced KYC Tab */}
          <TabsContent value="advanced" className="space-y-4">
            {!canSubmitAdvanced && !existingAdvancedKYC && (
              <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t('kyc.basic_required')}
                </AlertDescription>
              </Alert>
            )}
            
            {renderKycAlert(existingAdvancedKYC, 'advanced')}
            
            <Card>
              <CardHeader>
                <CardTitle>{t('kyc.advanced_info_title')}</CardTitle>
                <CardDescription>{t('kyc.advanced_info_desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); handleAdvancedSubmit(); }} className="space-y-6">
                  <div className="space-y-4">
                    {/* Show basic info (read-only) */}
                    <Alert className="bg-muted/50">
                      <AlertDescription className="text-sm">
                        <strong>{t('kyc.basic_info_summary')}</strong>
                        <p className="mt-1">{t('kyc.real_name')}: {existingBasicKYC?.real_name}</p>
                        <p>{t('kyc.id_number')}: {existingBasicKYC?.id_number}</p>
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="advanced_nationality">{t('kyc.nationality')} *</Label>
                      <Input
                        id="advanced_nationality"
                        value={advancedKycData.nationality}
                        onChange={(e) => setAdvancedKycData({ ...advancedKycData, nationality: e.target.value })}
                        placeholder={t('kyc.nationality_placeholder')}
                        disabled={isAdvancedDisabled || !canSubmitAdvanced}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="advanced_occupation">{t('kyc.occupation')} *</Label>
                      <Input
                        id="advanced_occupation"
                        value={advancedKycData.occupation}
                        onChange={(e) => setAdvancedKycData({ ...advancedKycData, occupation: e.target.value })}
                        placeholder={t('kyc.occupation_placeholder')}
                        disabled={isAdvancedDisabled || !canSubmitAdvanced}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="advanced_address">{t('kyc.address')} *</Label>
                      <Input
                        id="advanced_address"
                        value={advancedKycData.address}
                        onChange={(e) => setAdvancedKycData({ ...advancedKycData, address: e.target.value })}
                        placeholder={t('kyc.address_placeholder')}
                        disabled={isAdvancedDisabled || !canSubmitAdvanced}
                        required
                      />
                    </div>

                    {/* Face Video Recording */}
                    <div className="space-y-2">
                      <Label>{t('kyc.face_video')} *</Label>
                      <VideoRecorder
                        onVideoReady={setVideoBlob}
                        disabled={isAdvancedDisabled || !canSubmitAdvanced}
                        existingVideoUrl={advancedKycData.video_url ? undefined : undefined}
                      />
                    </div>
                  </div>

                  <Alert>
                    <AlertDescription className="text-sm">
                      <strong>{t('kyc.tips_title')}</strong>
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        <li>{t('kyc.tip_3')}</li>
                        <li>{t('kyc.tip_4')}</li>
                        <li>{t('kyc.advanced_tip_unlimited')}</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  {canSubmitAdvanced && (!isAdvancedDisabled || existingAdvancedKYC?.status === 'rejected') && (
                    <Button type="submit" disabled={submitting} className="w-full">
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t('common.submitting')}
                        </>
                      ) : existingAdvancedKYC?.status === 'rejected' ? (
                        t('kyc.resubmit_kyc')
                      ) : (
                        t('kyc.submit_advanced')
                      )}
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
