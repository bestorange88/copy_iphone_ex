import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PWAInstallationData {
  device_type: string;
  browser: string;
  os_version: string;
}

export const usePWAInstallation = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    const checkInstallation = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      
      setIsStandalone(isStandaloneMode);
      setIsInstalled(isStandaloneMode);
    };

    checkInstallation();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
      setIsInstalled(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const detectPlatform = useCallback((): PWAInstallationData => {
    const userAgent = navigator.userAgent;
    let device_type = 'desktop';
    let browser = 'unknown';
    let os_version = 'unknown';

    // Detect device type
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      device_type = 'ios';
      const match = userAgent.match(/OS (\d+_\d+)/);
      if (match) os_version = match[1].replace('_', '.');
    } else if (/Android/.test(userAgent)) {
      device_type = 'android';
      const match = userAgent.match(/Android (\d+\.?\d*)/);
      if (match) os_version = match[1];
    } else if (/Windows/.test(userAgent)) {
      device_type = 'windows';
      const match = userAgent.match(/Windows NT (\d+\.?\d*)/);
      if (match) os_version = match[1];
    } else if (/Mac/.test(userAgent)) {
      device_type = 'macos';
      const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
      if (match) os_version = match[1].replace('_', '.');
    }

    // Detect browser
    if (/Chrome/.test(userAgent) && !/Edg/.test(userAgent)) {
      browser = 'Chrome';
    } else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
      browser = 'Safari';
    } else if (/Firefox/.test(userAgent)) {
      browser = 'Firefox';
    } else if (/Edg/.test(userAgent)) {
      browser = 'Edge';
    }

    return { device_type, browser, os_version };
  }, []);

  const trackInstallation = useCallback(async () => {
    try {
      const platformData = detectPlatform();
      
      // Get current user if logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('pwa_installations')
        .insert({
          user_id: user?.id || null,
          ...platformData
        });

      if (error) {
        console.error('Failed to track PWA installation:', error);
      } else {
        console.log('PWA installation tracked successfully');
        // Store in localStorage to avoid duplicate tracking
        localStorage.setItem('pwa_installation_tracked', 'true');
      }
    } catch (error) {
      console.error('Error tracking PWA installation:', error);
    }
  }, [detectPlatform]);

  const trackAppOpen = useCallback(async () => {
    if (!isStandalone) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update last opened time for this device
      // This is a simplified version - in production you'd want to track by device fingerprint
      if (user) {
        const { error } = await supabase
          .from('pwa_installations')
          .update({
            last_opened_at: new Date().toISOString(),
            open_count: supabase.rpc ? 1 : 1 // Increment would need an RPC function
          })
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Failed to track app open:', error);
        }
      }
    } catch (error) {
      console.error('Error tracking app open:', error);
    }
  }, [isStandalone]);

  // Track installation when app is first opened as standalone
  useEffect(() => {
    if (isStandalone && !localStorage.getItem('pwa_installation_tracked')) {
      trackInstallation();
    }
  }, [isStandalone, trackInstallation]);

  // Track app opens
  useEffect(() => {
    if (isStandalone) {
      trackAppOpen();
    }
  }, [isStandalone, trackAppOpen]);

  return {
    isInstalled,
    isStandalone,
    trackInstallation,
    detectPlatform
  };
};
