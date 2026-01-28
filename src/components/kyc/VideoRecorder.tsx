import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Video, StopCircle, RefreshCw, Check, AlertTriangle, Loader2 } from "lucide-react";

interface VideoRecorderProps {
  onVideoReady: (blob: Blob) => void;
  disabled?: boolean;
  existingVideoUrl?: string;
}

// Get verification phrases for face recording
const getVerificationPhrases = (t: (key: string) => string) => {
  return [
    t('kyc.video_phrase_2'),
    t('kyc.video_phrase_1'),
  ];
};

export default function VideoRecorder({ onVideoReady, disabled, existingVideoUrl }: VideoRecorderProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const maxRecordingTime = 30; // 30 seconds max
  
  // Get phrases dynamically to ensure translations are loaded
  const phrases = getVerificationPhrases(t);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, [stream, recordedUrl]);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxRecordingTime) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const requestCameraPermission = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: true
      });
      setStream(mediaStream);
      setHasPermission(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera permission error:', err);
      setHasPermission(false);
      setError(t('kyc.camera_permission_denied'));
    }
  }, [t]);

  const startRecording = useCallback(async () => {
    if (!stream) {
      await requestCameraPermission();
      return;
    }

    // Countdown before recording
    setCountdown(3);
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setCountdown(0);

    chunksRef.current = [];
    setRecordingTime(0);
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8,opus'
    });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);
      onVideoReady(blob);
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000);
    setIsRecording(true);
  }, [stream, onVideoReady, requestCameraPermission]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const resetRecording = useCallback(() => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingTime(0);
    
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  }, [recordedUrl, stream]);

  if (existingVideoUrl && !recordedUrl) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-green-600 mb-3">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">{t('kyc.video_uploaded')}</span>
          </div>
          <video
            src={existingVideoUrl}
            controls
            className="w-full rounded-lg"
          />
          {!disabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetRecording}
              className="mt-3 w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('kyc.rerecord_video')}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Instructions */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{t('kyc.video_instructions_title')}</strong>
            <ol className="mt-2 space-y-1 list-decimal list-inside text-sm">
              <li>{t('kyc.video_instruction_1')}</li>
              <li>{t('kyc.video_instruction_2')}</li>
              <li>{t('kyc.video_instruction_3')}</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Text to read */}
        <div className="p-4 bg-muted rounded-lg border-2 border-dashed">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            {t('kyc.read_aloud')}
          </p>
          <div className="space-y-2">
            {phrases.map((phrase, idx) => (
              <p key={idx} className="text-lg font-medium">
                "{phrase}"
              </p>
            ))}
          </div>
        </div>

        {/* Video preview */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          {recordedUrl ? (
            <video
              src={recordedUrl}
              controls
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover mirror"
              style={{ transform: 'scaleX(-1)' }}
            />
          )}
          
          {/* Countdown overlay */}
          {countdown > 0 && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <span className="text-7xl font-bold text-white animate-pulse">
                {countdown}
              </span>
            </div>
          )}
          
          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-sm font-medium">
                {recordingTime}s / {maxRecordingTime}s
              </span>
            </div>
          )}
          
          {/* Permission request overlay */}
          {hasPermission === null && !stream && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center p-4">
                <Video className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-3">
                  {t('kyc.click_to_enable_camera')}
                </p>
                <Button onClick={requestCameraPermission} disabled={disabled}>
                  {t('kyc.enable_camera')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          {!recordedUrl ? (
            <>
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  disabled={disabled || hasPermission === false}
                  className="flex-1"
                >
                  <Video className="h-4 w-4 mr-2" />
                  {t('kyc.start_recording')}
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="flex-1"
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  {t('kyc.stop_recording')}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={resetRecording}
                disabled={disabled}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('kyc.rerecord_video')}
              </Button>
              <Button disabled className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                {t('kyc.video_ready')}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
