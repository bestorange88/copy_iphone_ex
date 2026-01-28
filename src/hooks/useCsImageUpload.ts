import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UseCSImageUploadOptions {
  onUploadComplete?: (url: string) => void;
}

export const useCsImageUpload = (options?: UseCSImageUploadOptions) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (file: File, userId: string): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "格式错误",
        description: "请选择图片文件",
        variant: "destructive"
      });
      return null;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "文件过大",
        description: "图片大小不能超过5MB",
        variant: "destructive"
      });
      return null;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('cs-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('cs-images')
        .getPublicUrl(fileName);

      if (options?.onUploadComplete) {
        options.onUploadComplete(data.publicUrl);
      }

      return data.publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "上传失败",
        description: error.message || "请稍后重试",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadImage,
    uploading
  };
};
