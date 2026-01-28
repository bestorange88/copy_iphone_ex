import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, ShieldCheck, AlertCircle, Video, Square, Play, Upload, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";

interface AdvancedKYCData {
  occupation: string;
  income_source: string;
  annual_income: string;
  investment_experience: string;
  investment_purpose: string;
  risk_acknowledgment: boolean;
  aml_acknowledgment: boolean;
  video_url?: string;
  status?: string;
  reject_reason?: string;
}

export default function KYCAdvanced() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<AdvancedKYCData>({
    occupation: '',
    income_source: '',
    annual_income: '',
    investment_experience: '',
    investment_purpose: '',
    risk_acknowledgment: false,
    aml_acknowledgment: false,
  });
  const [existingAdvancedKyc, setExistingAdvancedKyc] = useState<AdvancedKYCData | null>(null);
  const [basicKycApproved, setBasicKycApproved] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // 整合的風險與反洗錢承諾（台灣繁體中文）
  const combinedAcknowledgmentText = `我已充分了解並確認以下投資風險：

1. 數位資產投資具有高度風險性，價格波動劇烈，可能導致全部本金損失。
2. 數位資產市場24小時運作，價格可能在短時間內發生重大變化。
3. 數位資產投資不受傳統金融監管機構的完全保護。
4. 我已閱讀並理解平台的風險揭露文件和用戶協議。
5. 我承諾使用自有資金進行投資，不使用借貸資金。

我鄭重承諾並聲明：

1. 我的資金來源合法，不涉及任何非法活動所得。
2. 我不會利用本平台進行洗錢、恐怖融資或其他非法金融活動。
3. 我提供的所有身份資訊和資料均真實、準確、完整。
4. 我同意配合平台進行必要的身份驗證和交易監控。
5. 如發現任何可疑交易，我同意平台有權凍結帳戶並向相關部門報告。`;

  // 視頻朗讀內容（參考歐易風格）
  const videoReadingText = `我是本人，我已閱讀並理解投資風險已知承諾及反洗錢承諾，我自願進行數位資產投資，所有操作均為本人行為。`;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        const { data: basicKyc } = await supabase
          .from('kyc_verifications')
          .select('status')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!basicKyc || basicKyc.status !== 'approved') {
          toast.error(t('kyc.basic_required', '請先完成初級實名認證'));
          navigate('/kyc');
          return;
        }
        setBasicKycApproved(true);

        // Using type assertion for advanced_kyc_verifications table
        const { data: advancedKyc } = await (supabase as any)
          .from('advanced_kyc_verifications')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (advancedKyc) {
          const kycData = advancedKyc as any;
          setExistingAdvancedKyc(kycData);
          setFormData({
            occupation: kycData.occupation || '',
            income_source: kycData.income_source || '',
            annual_income: kycData.annual_income || '',
            investment_experience: kycData.investment_experience || '',
            investment_purpose: kycData.investment_purpose || '',
            risk_acknowledgment: kycData.risk_acknowledgment || false,
            aml_acknowledgment: kycData.aml_acknowledgment || false,
            video_url: kycData.video_url,
            status: kycData.status,
            reject_reason: kycData.reject_reason,
          });
          if (kycData.video_url) {
            const { data } = await supabase.storage
              .from('kyc-documents')
              .createSignedUrl(kycData.video_url, 3600);
            if (data?.signedUrl) {
              setVideoPreviewUrl(data.signedUrl);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load advanced KYC data:', error);
        toast.error(t('common.error'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, navigate, t]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setVideoPreviewUrl(url);
        
        stream.getTracks().forEach(track => track.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success(t('kyc.recording_started', '開始錄製'));
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error(t('kyc.camera_error', '無法訪問攝像頭，請檢查權限設置'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success(t('kyc.recording_stopped', '錄製完成'));
    }
  };

  const uploadVideo = async (): Promise<string | null> => {
    if (!recordedBlob || !user) return null;

    setUploadingVideo(true);
    try {
      const fileName = `${user.id}/advanced-kyc-video-${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, recordedBlob, {
          contentType: 'video/webm',
          upsert: true
        });

      if (uploadError) throw uploadError;

      toast.success(t('kyc.video_uploaded', '視頻上傳成功'));
      return fileName;
    } catch (error) {
      console.error('Failed to upload video:', error);
      toast.error(t('kyc.video_upload_failed', '視頻上傳失敗'));
      return null;
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!formData.occupation || !formData.income_source || !formData.annual_income || 
        !formData.investment_experience || !formData.investment_purpose) {
      toast.error(t('kyc.fill_all_fields', '請填寫所有必填項'));
      return;
    }

    if (!formData.risk_acknowledgment || !formData.aml_acknowledgment) {
      toast.error(t('kyc.accept_acknowledgments', '請確認已閱讀並同意所有承諾'));
      return;
    }

    if (!recordedBlob && !formData.video_url) {
      toast.error(t('kyc.video_required', '請錄製視頻'));
      return;
    }

    setSubmitting(true);
    try {
      let videoPath = formData.video_url;
      
      if (recordedBlob) {
        const uploadedPath = await uploadVideo();
        if (!uploadedPath) {
          setSubmitting(false);
          return;
        }
        videoPath = uploadedPath;
      }

      const dataToSave = {
        user_id: user.id,
        occupation: formData.occupation,
        income_source: formData.income_source,
        annual_income: formData.annual_income,
        investment_experience: formData.investment_experience,
        investment_purpose: formData.investment_purpose,
        risk_acknowledgment: formData.risk_acknowledgment,
        aml_acknowledgment: formData.aml_acknowledgment,
        video_url: videoPath,
        status: 'pending',
        submitted_at: new Date().toISOString()
      };

      if (existingAdvancedKyc) {
        const { error } = await (supabase as any)
          .from('advanced_kyc_verifications')
          .update(dataToSave)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('advanced_kyc_verifications')
          .insert(dataToSave);
        if (error) throw error;
      }

      toast.success(t('kyc.submit_success', '提交成功，等待審核'));
      navigate('/kyc');
    } catch (error) {
      console.error('Failed to submit advanced KYC:', error);
      toast.error(t('kyc.submit_failed', '提交失敗'));
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

  if (!basicKycApproved) {
    return null;
  }

  const isApproved = existingAdvancedKyc?.status === 'approved';
  const isPending = existingAdvancedKyc?.status === 'pending';
  const isRejected = existingAdvancedKyc?.status === 'rejected';

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 mb-20 lg:mb-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/kyc')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('kyc.advanced_title', '高級實名認證')}</h1>
            <p className="text-muted-foreground">{t('kyc.advanced_subtitle', '完成高級認證享受更高額度')}</p>
          </div>
        </div>

        {isApproved && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              {t('kyc.advanced_approved', '高級實名認證已通過')}
            </AlertDescription>
          </Alert>
        )}

        {isPending && (
          <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
            <AlertDescription className="text-yellow-700 dark:text-yellow-300">
              {t('kyc.advanced_pending', '高級實名認證審核中，請耐心等待')}
            </AlertDescription>
          </Alert>
        )}

        {isRejected && (
          <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700 dark:text-red-300">
              {t('kyc.advanced_rejected', '高級實名認證被拒絕')}: {formData.reject_reason}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`flex-1 h-2 rounded-full ${
                currentStep >= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('kyc.personal_info', '個人資料')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('kyc.occupation', '職業')} *</Label>
                <Select
                  value={formData.occupation}
                  onValueChange={(value) => setFormData({ ...formData, occupation: value })}
                  disabled={isApproved || isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('kyc.select_occupation', '請選擇職業')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">{t('kyc.occupation_employee', '企業員工')}</SelectItem>
                    <SelectItem value="self_employed">{t('kyc.occupation_self_employed', '自營業者')}</SelectItem>
                    <SelectItem value="business_owner">{t('kyc.occupation_business_owner', '企業主')}</SelectItem>
                    <SelectItem value="freelancer">{t('kyc.occupation_freelancer', '自由職業')}</SelectItem>
                    <SelectItem value="retired">{t('kyc.occupation_retired', '退休人員')}</SelectItem>
                    <SelectItem value="student">{t('kyc.occupation_student', '學生')}</SelectItem>
                    <SelectItem value="other">{t('kyc.occupation_other', '其他')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('kyc.income_source', '收入來源')} *</Label>
                <Select
                  value={formData.income_source}
                  onValueChange={(value) => setFormData({ ...formData, income_source: value })}
                  disabled={isApproved || isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('kyc.select_income_source', '請選擇收入來源')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salary">{t('kyc.income_salary', '工資薪金')}</SelectItem>
                    <SelectItem value="business">{t('kyc.income_business', '經營收入')}</SelectItem>
                    <SelectItem value="investment">{t('kyc.income_investment', '投資收益')}</SelectItem>
                    <SelectItem value="inheritance">{t('kyc.income_inheritance', '繼承/贈與')}</SelectItem>
                    <SelectItem value="savings">{t('kyc.income_savings', '儲蓄')}</SelectItem>
                    <SelectItem value="other">{t('kyc.income_other', '其他')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('kyc.annual_income', '年收入範圍')} *</Label>
                <Select
                  value={formData.annual_income}
                  onValueChange={(value) => setFormData({ ...formData, annual_income: value })}
                  disabled={isApproved || isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('kyc.select_annual_income', '請選擇年收入範圍')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="below_50k">{t('kyc.income_below_50k', '5萬美元以下')}</SelectItem>
                    <SelectItem value="50k_100k">{t('kyc.income_50k_100k', '5萬-10萬美元')}</SelectItem>
                    <SelectItem value="100k_500k">{t('kyc.income_100k_500k', '10萬-50萬美元')}</SelectItem>
                    <SelectItem value="500k_1m">{t('kyc.income_500k_1m', '50萬-100萬美元')}</SelectItem>
                    <SelectItem value="above_1m">{t('kyc.income_above_1m', '100萬美元以上')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('kyc.investment_experience', '投資經驗')} *</Label>
                <Select
                  value={formData.investment_experience}
                  onValueChange={(value) => setFormData({ ...formData, investment_experience: value })}
                  disabled={isApproved || isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('kyc.select_investment_experience', '請選擇投資經驗')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('kyc.exp_none', '無經驗')}</SelectItem>
                    <SelectItem value="less_1_year">{t('kyc.exp_less_1_year', '1年以下')}</SelectItem>
                    <SelectItem value="1_3_years">{t('kyc.exp_1_3_years', '1-3年')}</SelectItem>
                    <SelectItem value="3_5_years">{t('kyc.exp_3_5_years', '3-5年')}</SelectItem>
                    <SelectItem value="above_5_years">{t('kyc.exp_above_5_years', '5年以上')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('kyc.investment_purpose', '投資目的')} *</Label>
                <Textarea
                  value={formData.investment_purpose}
                  onChange={(e) => setFormData({ ...formData, investment_purpose: e.target.value })}
                  placeholder={t('kyc.investment_purpose_placeholder', '請描述您的投資目的和預期')}
                  disabled={isApproved || isPending}
                  rows={3}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={() => setCurrentStep(2)}
                disabled={!formData.occupation || !formData.income_source || !formData.annual_income || !formData.investment_experience || !formData.investment_purpose}
              >
                {t('common.next', '下一步')}
              </Button>
            </CardContent>
          </Card>
        )}

                {currentStep === 2 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('kyc.acknowledgments', '風險承諾')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <Label className="text-base font-semibold">{t('kyc.combined_acknowledgment_title', '投資風險已知承諾及反洗錢承諾')}</Label>
                        <div className="bg-muted/50 p-4 rounded-lg text-sm whitespace-pre-line max-h-64 overflow-y-auto">
                          {combinedAcknowledgmentText}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="combined_acknowledgment"
                            checked={formData.risk_acknowledgment && formData.aml_acknowledgment}
                            onCheckedChange={(checked) => setFormData({ 
                              ...formData, 
                              risk_acknowledgment: checked as boolean,
                              aml_acknowledgment: checked as boolean 
                            })}
                            disabled={isApproved || isPending}
                          />
                          <label htmlFor="combined_acknowledgment" className="text-sm">
                            {t('kyc.combined_acknowledgment_confirm', '我已閱讀並同意上述投資風險已知承諾及反洗錢承諾')}
                          </label>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setCurrentStep(1)}>
                          {t('common.back', '返回')}
                        </Button>
                        <Button 
                          className="flex-1" 
                          onClick={() => setCurrentStep(3)}
                          disabled={!formData.risk_acknowledgment || !formData.aml_acknowledgment}
                        >
                          {t('common.next', '下一步')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('kyc.video_verification', '視頻認證')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="space-y-2">
                                <p>{t('kyc.video_instructions_title', '請朗讀以下內容並錄製視頻：')}</p>
                                <p className="font-medium text-foreground bg-muted/50 p-3 rounded-lg">
                                  「{videoReadingText}」
                                </p>
                              </AlertDescription>
                            </Alert>

              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {videoPreviewUrl && !isRecording ? (
                  <video
                    src={videoPreviewUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                )}
                {!isRecording && !videoPreviewUrl && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                {isRecording && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    {t('kyc.recording', '錄製中...')}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-center">
                {!isRecording && !videoPreviewUrl && (
                  <Button onClick={startRecording} className="gap-2" disabled={isApproved || isPending}>
                    <Play className="h-4 w-4" />
                    {t('kyc.start_recording', '開始錄製')}
                  </Button>
                )}
                {isRecording && (
                  <Button onClick={stopRecording} variant="destructive" className="gap-2">
                    <Square className="h-4 w-4" />
                    {t('kyc.stop_recording', '停止錄製')}
                  </Button>
                )}
                {videoPreviewUrl && !isRecording && (
                  <>
                    <Button onClick={() => { setVideoPreviewUrl(''); setRecordedBlob(null); }} variant="outline" className="gap-2" disabled={isApproved || isPending}>
                      {t('kyc.re_record', '重新錄製')}
                    </Button>
                  </>
                )}
              </div>

              {(videoPreviewUrl || formData.video_url) && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">{t('kyc.video_ready', '視頻已準備好')}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setCurrentStep(2)}>
                  {t('common.back', '上一步')}
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleSubmit}
                  disabled={submitting || uploadingVideo || (!recordedBlob && !formData.video_url) || isApproved || isPending}
                >
                  {(submitting || uploadingVideo) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {uploadingVideo ? t('kyc.uploading_video', '上傳視頻中...') : t('kyc.submitting', '提交中...')}
                    </>
                  ) : (
                    t('kyc.submit_advanced', '提交高級認證')
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('kyc.advanced_tips_title', '高級認證說明')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. {t('kyc.advanced_tip_1', '高級認證需要提供更詳細的個人資料和投資背景信息')}</p>
            <p>2. {t('kyc.advanced_tip_2', '請仔細閱讀投資風險和反洗錢承諾，確保您理解相關內容')}</p>
            <p>3. {t('kyc.advanced_tip_3', '錄製視頻時請確保光線充足、面部清晰可見')}</p>
            <p>4. {t('kyc.advanced_tip_4', '視頻中請清晰朗讀指定內容，時長建議10-30秒')}</p>
            <p>5. {t('kyc.advanced_tip_5', '審核通過後，您將享受更高的提現額度和更多功能')}</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
