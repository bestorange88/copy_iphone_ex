import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Check, X, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IdCardUploaderProps {
  userId: string;
  type: 'front' | 'back';
  value?: string;
  onChange: (path: string) => void;
  disabled?: boolean;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function IdCardUploader({ userId, type, value, onChange, disabled }: IdCardUploaderProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('kyc.file_format_error'));
      return;
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      setError(t('kyc.file_size_error'));
      return;
    }

    setUploading(true);

    try {
      // Create preview
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreviewUrl(e.target?.result as string);
        reader.readAsDataURL(file);
      }

      // Get auth session for upload
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error(t('kyc.login_required'));
      }

      // Generate a unique file path
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}/${type}_${Date.now()}.${fileExt}`;

      // Upload directly to storage
      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message || t('kyc.upload_failed'));
      }

      onChange(fileName);
      toast.success(t('kyc.upload_success'));
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : t('kyc.upload_failed'));
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const hasValue = !!value || !!previewUrl;

  return (
    <div className="space-y-2">
      <div
        onClick={handleClick}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer",
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50",
          hasValue ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : "border-muted-foreground/25",
          error ? "border-red-500 bg-red-50/50 dark:bg-red-950/20" : ""
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          </div>
        ) : previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt={type === 'front' ? t('kyc.doc_front') : t('kyc.doc_back')}
              className="max-h-32 mx-auto rounded"
            />
            <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
              <Check className="h-3 w-3" />
            </div>
          </div>
        ) : value ? (
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <ImageIcon className="h-8 w-8 text-green-500" />
              <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5">
                <Check className="h-2.5 w-2.5" />
              </div>
            </div>
            <p className="text-sm font-medium text-green-600">{t('kyc.uploaded')}</p>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">
              {type === 'front' ? t('kyc.doc_front') : t('kyc.doc_back')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('kyc.click_upload')}
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <X className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
