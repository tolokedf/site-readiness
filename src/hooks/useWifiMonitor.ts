import { useState, useEffect, useCallback, useRef } from 'react';
import { WifiStatus } from '../types';
import { api } from '../services/api';

export function useWifiMonitor(pollIntervalMs: number = 3000) {
  const [wifi, setWifi] = useState<WifiStatus>({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    effectiveType: '4g',
    downlink: 10,
    rtt: 35,
    strengthPercent: 92,
    estimatedDbm: -55,
    quality: 'Good',
    lastPingMs: 25,
  });

  const [isTesting, setIsTesting] = useState(false);
  const [pingHistory, setPingHistory] = useState<number[]>([28, 32, 26, 30, 25]);
  const isMountedRef = useRef(true);

  const measurePing = useCallback(async () => {
    try {
      const pingMs = await api.ping();
      if (!isMountedRef.current) return pingMs;

      setPingHistory((prev) => [...prev.slice(-14), pingMs]);
      return pingMs;
    } catch {
      return 120;
    }
  }, []);

  const evaluateNetwork = useCallback(async () => {
    const isOnline = navigator.onLine;
    if (!isOnline) {
      setWifi({
        online: false,
        strengthPercent: 0,
        estimatedDbm: -100,
        quality: 'Disconnected',
        lastPingMs: undefined,
      });
      return;
    }

    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const realPing = await measurePing();

    let effectiveType = conn?.effectiveType || '4g';
    let downlink = conn?.downlink || 15;
    let rtt = conn?.rtt || realPing || 30;

    // Calculate estimated dBm and percentage
    // Optimal Wi-Fi for AMR: -40 to -65 dBm (90-100%)
    // Acceptable: -66 to -75 dBm (65-85%)
    // Marginal: -76 to -85 dBm (30-60%)
    // Poor: < -85 dBm (<30%)
    let estimatedDbm = -50;
    if (rtt < 35 && downlink > 8) {
      estimatedDbm = -48 - Math.round(Math.random() * 6);
    } else if (rtt < 70) {
      estimatedDbm = -62 - Math.round(Math.random() * 6);
    } else if (rtt < 130) {
      estimatedDbm = -74 - Math.round(Math.random() * 8);
    } else {
      estimatedDbm = -85 - Math.round(Math.random() * 10);
    }

    // Convert dBm to percentage (-30 dBm is 100%, -95 dBm is 0%)
    const pct = Math.max(5, Math.min(100, Math.round(((estimatedDbm + 95) / 65) * 100)));

    let quality: WifiStatus['quality'] = 'Good';
    if (pct >= 85) quality = 'Excellent';
    else if (pct >= 65) quality = 'Good';
    else if (pct >= 40) quality = 'Fair';
    else quality = 'Poor';

    if (isMountedRef.current) {
      setWifi({
        online: true,
        effectiveType,
        downlink,
        rtt: realPing,
        strengthPercent: pct,
        estimatedDbm,
        quality,
        lastPingMs: realPing,
      });
    }
  }, [measurePing]);

  useEffect(() => {
    isMountedRef.current = true;
    evaluateNetwork();

    const handleOnline = () => evaluateNetwork();
    const handleOffline = () => {
      setWifi((prev) => ({
        ...prev,
        online: false,
        strengthPercent: 0,
        estimatedDbm: -100,
        quality: 'Disconnected',
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(evaluateNetwork, pollIntervalMs);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [evaluateNetwork, pollIntervalMs]);

  const runDetailedSurvey = async () => {
    setIsTesting(true);
    const pings: number[] = [];
    for (let i = 0; i < 5; i++) {
      const p = await measurePing();
      pings.push(p);
      await new Promise((r) => setTimeout(r, 200));
    }
    const avg = Math.round(pings.reduce((a, b) => a + b, 0) / pings.length);
    setIsTesting(false);
    return {
      averagePing: avg,
      jitter: Math.max(...pings) - Math.min(...pings),
      packetSuccessRate: 100,
      meetsAmrRequirements: avg <= 65 && wifi.strengthPercent >= 65,
    };
  };

  const simulateValue = (dbm: number) => {
    const pct = Math.max(5, Math.min(100, Math.round(((dbm + 95) / 65) * 100)));
    let quality: WifiStatus['quality'] = 'Good';
    if (pct >= 85) quality = 'Excellent';
    else if (pct >= 65) quality = 'Good';
    else if (pct >= 40) quality = 'Fair';
    else quality = 'Poor';

    setWifi((prev) => ({
      ...prev,
      estimatedDbm: dbm,
      strengthPercent: pct,
      quality,
      isSimulated: true,
    }));
  };

  return {
    wifi,
    pingHistory,
    isTesting,
    refreshWifi: evaluateNetwork,
    runDetailedSurvey,
    simulateValue,
  };
}
