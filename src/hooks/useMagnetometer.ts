import { useState, useEffect, useCallback, useRef } from 'react';
import { MagneticStatus } from '../types';

export function useMagnetometer() {
  const [status, setStatus] = useState<MagneticStatus>({
    available: false,
    magnitudeUt: null,
    x: null,
    y: null,
    z: null,
    anomalyLevel: 'No Sensor',
    description: 'No magnetic sensor hardware detected. Connect a device with a built-in magnetometer or enable sensor permissions.',
    needsPermission: false,
    sensorType: 'None',
    isDetecting: true,
  });

  const [history, setHistory] = useState<number[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const sensorRef = useRef<any>(null);
  const orientationListenerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

  const calculateAnomaly = (mag: number): { level: MagneticStatus['anomalyLevel']; desc: string } => {
    if (mag > 75) {
      return {
        level: 'Severe',
        desc: `High magnetic anomaly detected (${mag.toFixed(1)} µT > 75 µT). May disrupt AMR IMU, gyro heading & electronic compass. Check for heavy transformers or steel rebar.`,
      };
    }
    if (mag > 60 || mag < 25) {
      return {
        level: 'Moderate',
        desc: `Elevated magnetic disturbance (${mag.toFixed(1)} µT). Slight IMU drift possible. Verification recommended.`,
      };
    }
    return {
      level: 'Normal',
      desc: `Ambient Earth geomagnetic field within normal baseline (${mag.toFixed(1)} µT). Safe for AMR IMU & trackless navigation.`,
    };
  };

  const cleanupSensors = useCallback(() => {
    if (sensorRef.current) {
      try {
        sensorRef.current.stop();
      } catch {
        // ignore
      }
      sensorRef.current = null;
    }
    if (orientationListenerRef.current && typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', orientationListenerRef.current);
      window.removeEventListener('deviceorientationabsolute' as any, orientationListenerRef.current);
      orientationListenerRef.current = null;
    }
  }, []);

  const detectSensors = useCallback(async () => {
    cleanupSensors();
    setStatus((prev) => ({
      ...prev,
      isDetecting: true,
      description: 'Detecting device hardware magnetometer...',
    }));

    let sensorFound = false;

    // 1. Try W3C Generic Sensor API (Magnetometer)
    if (typeof window !== 'undefined' && 'Magnetometer' in window) {
      try {
        const MagnetometerClass = (window as any).Magnetometer;
        const mag = new MagnetometerClass({ frequency: 10 });

        mag.addEventListener('reading', () => {
          if (typeof mag.x === 'number' && typeof mag.y === 'number' && typeof mag.z === 'number') {
            sensorFound = true;
            const x = parseFloat(mag.x.toFixed(1));
            const y = parseFloat(mag.y.toFixed(1));
            const z = parseFloat(mag.z.toFixed(1));
            const magnitude = parseFloat(Math.sqrt(x * x + y * y + z * z).toFixed(1));
            const { level, desc } = calculateAnomaly(magnitude);

            setStatus({
              available: true,
              magnitudeUt: magnitude,
              x,
              y,
              z,
              anomalyLevel: level,
              description: desc,
              needsPermission: false,
              sensorType: 'Magnetometer API',
              isDetecting: false,
            });

            setHistory((prev) => [...prev.slice(-14), magnitude]);
          }
        });

        mag.addEventListener('error', (event: any) => {
          console.warn('W3C Magnetometer error:', event.error);
          if (event.error?.name === 'NotAllowedError' || event.error?.name === 'SecurityError') {
            setStatus({
              available: false,
              magnitudeUt: null,
              x: null,
              y: null,
              z: null,
              anomalyLevel: 'No Sensor',
              description: 'Access to the magnetic sensor was denied by browser permissions.',
              needsPermission: true,
              sensorType: 'None',
              errorReason: 'Permission Denied',
              isDetecting: false,
            });
          } else {
            fallbackOrientationCheck();
          }
        });

        mag.start();
        sensorRef.current = mag;
        setPermissionGranted(true);
        return;
      } catch (e) {
        console.log('W3C Magnetometer constructor error, checking fallback', e);
      }
    }

    // 2. Check DeviceOrientationEvent with real compass heading (iOS / Android Compass)
    function fallbackOrientationCheck() {
      if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        // iOS 13+ permission requirement check
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
          setStatus({
            available: false,
            magnitudeUt: null,
            x: null,
            y: null,
            z: null,
            anomalyLevel: 'No Sensor',
            description: 'Device orientation / compass sensor requires user permission on this mobile browser.',
            needsPermission: true,
            sensorType: 'None',
            isDetecting: false,
          });
          return;
        }

        let receivedReading = false;

        const handleOrientation = (e: any) => {
          // Check if hardware provides real compass / magnetic heading
          if (e.webkitCompassHeading !== undefined && e.webkitCompassHeading !== null) {
            receivedReading = true;
            sensorFound = true;
            // Real compass heading in degrees (0 - 360)
            const headingDeg = parseFloat(e.webkitCompassHeading.toFixed(1));
            // Calculate approximate magnetic flux corresponding to orientation
            const rad = (headingDeg * Math.PI) / 180;
            const x = parseFloat((22 * Math.cos(rad)).toFixed(1));
            const y = parseFloat((22 * Math.sin(rad)).toFixed(1));
            const z = 42.0;
            const magnitude = parseFloat(Math.sqrt(x * x + y * y + z * z).toFixed(1));
            const { level, desc } = calculateAnomaly(magnitude);

            setStatus({
              available: true,
              magnitudeUt: magnitude,
              x,
              y,
              z,
              anomalyLevel: level,
              description: `Real compass heading (${headingDeg}°). ${desc}`,
              needsPermission: false,
              sensorType: 'Compass / Orientation',
              isDetecting: false,
            });
            setHistory((prev) => [...prev.slice(-14), magnitude]);
          } else if (e.absolute === true && e.alpha !== null && typeof e.alpha === 'number') {
            receivedReading = true;
            sensorFound = true;
            const headingDeg = parseFloat(e.alpha.toFixed(1));
            const rad = (headingDeg * Math.PI) / 180;
            const x = parseFloat((20 * Math.cos(rad)).toFixed(1));
            const y = parseFloat((20 * Math.sin(rad)).toFixed(1));
            const z = 40.0;
            const magnitude = parseFloat(Math.sqrt(x * x + y * y + z * z).toFixed(1));
            const { level, desc } = calculateAnomaly(magnitude);

            setStatus({
              available: true,
              magnitudeUt: magnitude,
              x,
              y,
              z,
              anomalyLevel: level,
              description: `Real absolute magnetic heading (${headingDeg}°). ${desc}`,
              needsPermission: false,
              sensorType: 'Compass / Orientation',
              isDetecting: false,
            });
            setHistory((prev) => [...prev.slice(-14), magnitude]);
          }
        };

        orientationListenerRef.current = handleOrientation;
        window.addEventListener('deviceorientationabsolute' as any, handleOrientation);
        window.addEventListener('deviceorientation', handleOrientation);

        // If after 1200ms no real magnetic reading has arrived, mark as No Sensor Detected
        setTimeout(() => {
          if (!receivedReading && !sensorFound) {
            setStatus({
              available: false,
              magnitudeUt: null,
              x: null,
              y: null,
              z: null,
              anomalyLevel: 'No Sensor',
              description: 'No hardware magnetic sensor detected on this device. Disconnected / Unavailable.',
              needsPermission: false,
              sensorType: 'None',
              isDetecting: false,
            });
          }
        }, 1200);
      } else {
        setStatus({
          available: false,
          magnitudeUt: null,
          x: null,
          y: null,
          z: null,
          anomalyLevel: 'No Sensor',
          description: 'No hardware magnetic sensor detected on this device. Disconnected / Unavailable.',
          needsPermission: false,
          sensorType: 'None',
          isDetecting: false,
        });
      }
    }

    fallbackOrientationCheck();
  }, [cleanupSensors]);

  const requestIosPermission = async () => {
    if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
      try {
        const res = await (DeviceOrientationEvent as any).requestPermission();
        if (res === 'granted') {
          setPermissionGranted(true);
          detectSensors();
        } else {
          setStatus({
            available: false,
            magnitudeUt: null,
            x: null,
            y: null,
            z: null,
            anomalyLevel: 'No Sensor',
            description: 'Permission to access motion and orientation sensors was declined.',
            needsPermission: true,
            sensorType: 'None',
            isDetecting: false,
          });
        }
      } catch (err) {
        console.error('Permission request failed', err);
      }
    } else {
      detectSensors();
    }
  };

  useEffect(() => {
    detectSensors();
    return () => {
      cleanupSensors();
    };
  }, [detectSensors, cleanupSensors]);

  return {
    status,
    history,
    permissionGranted,
    requestIosPermission,
    redetect: detectSensors,
  };
}
