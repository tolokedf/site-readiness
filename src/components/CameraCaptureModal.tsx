import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X, Check, SwitchCamera, AlertCircle, Image as ImageIcon, Smartphone } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, caption?: string) => Promise<void>;
  itemInfo: {
    sectionTitle?: string;
    itemNumber?: number;
    requirement?: string;
  } | null;
}

// Progressive fallback stream acquisition
async function getCameraStream(mode: 'environment' | 'user'): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const legacyGUM =
      (navigator as any).getUserMedia ||
      (navigator as any).webkitGetUserMedia ||
      (navigator as any).mozGetUserMedia ||
      (navigator as any).msGetUserMedia;
    if (legacyGUM) {
      return new Promise((resolve, reject) => {
        legacyGUM.call(navigator, { video: true }, resolve, reject);
      });
    }
    throw new Error('Camera access is not supported on this browser or environment.');
  }

  // Tier 1: Try with ideal facing mode and resolution
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: mode },
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
      },
      audio: false,
    });
  } catch (err1) {
    console.warn('Tier 1 camera init failed, attempting tier 2 (basic facingMode)...', err1);
  }

  // Tier 2: Try basic facingMode without resolution limits
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: mode },
      audio: false,
    });
  } catch (err2) {
    console.warn('Tier 2 camera init failed, attempting tier 3 (generic video: true)...', err2);
  }

  // Tier 3: Try generic video (works on laptops where 'environment' mode does not exist)
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
  } catch (err3) {
    console.error('All camera initialization tiers failed:', err3);
    throw err3;
  }
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  itemInfo,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const isStartingRef = useRef(false);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const [capturedCount, setCapturedCount] = useState(0);
  const [flashEffect, setFlashEffect] = useState(false);

  // Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start Camera Stream with progressive fallback
  const startCamera = async (mode: 'environment' | 'user') => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    stopCamera();
    setCameraError(null);

    try {
      const stream = await getCameraStream(mode);
      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('autoplay', 'true');
        video.setAttribute('muted', 'true');
        video.muted = true;

        video.onloadedmetadata = () => {
          video.play().catch((playErr) => {
            console.warn('Video play deferred or warning:', playErr);
          });
        };

        video.play().catch((playErr) => {
          console.warn('Direct play warning:', playErr);
        });
      }
    } catch (err: any) {
      console.error('Camera stream error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera permissions in browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device found on this laptop/phone.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Camera is currently in use by another application.');
      } else {
        setCameraError('Unable to open live camera: ' + (err.message || 'Permission or hardware issue'));
      }
    } finally {
      isStartingRef.current = false;
    }
  };

  useEffect(() => {
    if (isOpen && !capturedPhotoUrl) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, capturedPhotoUrl]);

  // Flip Camera
  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture Snapshot from Video
  const handleSnap = () => {
    if (!videoRef.current) return;

    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCapturedPhotoUrl(url);
          setCapturedBlob(blob);
          stopCamera();
        }
      },
      'image/jpeg',
      0.9
    );
  };

  // Handle native camera input capture (fallback for mobile/laptop)
  const handleNativeCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const url = URL.createObjectURL(file);
    setCapturedPhotoUrl(url);
    setCapturedBlob(file);
    stopCamera();
    // Reset file input so same file can be captured again if retaken
    e.target.value = '';
  };

  const triggerNativeCamera = () => {
    if (nativeCameraInputRef.current) {
      nativeCameraInputRef.current.click();
    }
  };

  // Retake
  const handleRetake = () => {
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl);
    }
    setCapturedPhotoUrl(null);
    setCapturedBlob(null);
    setCaption('');
  };

  // Confirm and upload photo
  const handleSavePhoto = async (takeAnother = false) => {
    if (!capturedBlob) return;
    setSaving(true);

    try {
      const filename = `site-photo-${Date.now()}-${itemInfo?.itemNumber || 'general'}.jpg`;
      const file =
        capturedBlob instanceof File
          ? capturedBlob
          : new File([capturedBlob], filename, { type: 'image/jpeg' });
      await onCapture(file, caption.trim() || undefined);

      setCapturedCount((prev) => prev + 1);

      if (capturedPhotoUrl) {
        URL.revokeObjectURL(capturedPhotoUrl);
      }
      setCapturedPhotoUrl(null);
      setCapturedBlob(null);
      setCaption('');

      if (!takeAnother) {
        onClose();
      }
    } catch (err) {
      console.error('Error saving captured photo', err);
      alert('Failed to attach captured photo.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Hidden native camera capture input */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleNativeCapture}
        className="hidden"
      />

      <div className="bg-white rounded-[2.5rem] border border-[#E0F2F1] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#F4FAF9] border-b border-[#E0F2F1] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#00796B] text-white flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#004D40] text-sm sm:text-base leading-tight">
                {capturedPhotoUrl ? 'Review Inspection Photo' : 'Take Site Evidence Photo'}
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[240px] sm:max-w-md mt-0.5">
                {itemInfo ? `Item #${itemInfo.itemNumber}: ${itemInfo.requirement}` : 'Site Checklist Verification'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {capturedCount > 0 && (
              <span className="text-[11px] font-bold text-[#00695C] bg-[#E0F2F1] px-2.5 py-1 rounded-full border border-[#B2DFDB]">
                {capturedCount} Added
              </span>
            )}
            <button
              onClick={() => {
                handleRetake();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-2xl hover:bg-[#E0F2F1]/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder / Preview Body */}
        <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center min-h-[320px] max-h-[460px]">
          {/* Flash Effect */}
          {flashEffect && <div className="absolute inset-0 bg-white z-30 pointer-events-none transition-opacity" />}

          {cameraError ? (
            <div className="p-6 text-center text-white space-y-3 max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-300 flex items-center justify-center mx-auto border border-rose-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-rose-200">{cameraError}</p>
              <p className="text-xs text-slate-400">
                You can retry the live camera or launch your device's native camera directly below:
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-bold transition-colors border border-slate-700 w-full sm:w-auto justify-center"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry Camera</span>
                </button>

                <button
                  type="button"
                  onClick={triggerNativeCamera}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00796B] hover:bg-[#00695C] text-white rounded-2xl text-xs font-bold transition-colors shadow-md shadow-[#00796B]/30 w-full sm:w-auto justify-center"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Open Device Camera</span>
                </button>
              </div>
            </div>
          ) : capturedPhotoUrl ? (
            <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
              <img
                src={capturedPhotoUrl}
                alt="Captured Inspection Site"
                className="max-h-[440px] w-auto max-w-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/20">
                Photo Preview
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover max-h-[440px]"
              />

              {/* Viewfinder Target Guidelines */}
              <div className="absolute inset-6 pointer-events-none border border-white/20 rounded-2xl flex flex-col justify-between p-4">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-[#4DB6AC]" />
                  <div className="w-4 h-4 border-t-2 border-r-2 border-[#4DB6AC]" />
                </div>
                <div className="self-center bg-black/50 backdrop-blur-xs text-white/90 text-[11px] font-medium px-3 py-1 rounded-full border border-white/10">
                  Align site criteria / floor condition
                </div>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-[#4DB6AC]" />
                  <div className="w-4 h-4 border-b-2 border-r-2 border-[#4DB6AC]" />
                </div>
              </div>

              {/* Top Controls on Viewfinder */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={triggerNativeCamera}
                  className="p-2.5 bg-black/60 hover:bg-black/80 text-white rounded-2xl border border-white/20 backdrop-blur-xs transition-all shadow-md text-xs font-semibold flex items-center gap-1.5"
                  title="Open system native camera app"
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="hidden sm:inline text-[11px]">Native App</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="p-2.5 bg-black/60 hover:bg-black/80 text-white rounded-2xl border border-white/20 backdrop-blur-xs transition-all shadow-md"
                  title="Switch front / rear camera"
                >
                  <SwitchCamera className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 sm:p-5 bg-white border-t border-[#E0F2F1] space-y-3">
          {capturedPhotoUrl ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Photo Caption / Description (Optional)
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. Floor clearance measurement showing 2.8m pass..."
                  className="w-full px-3.5 py-2 text-xs rounded-2xl border border-[#E0F2F1] bg-[#F4FAF9]/50 focus:outline-hidden focus:ring-2 focus:ring-[#00796B]/20 focus:border-[#00796B]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-[#F4FAF9] text-xs font-bold transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retake</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSavePhoto(true)}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#E0F2F1] hover:bg-[#B2DFDB] text-[#00695C] text-xs font-bold border border-[#B2DFDB] transition-all disabled:opacity-50"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Save & Take Another</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSavePhoto(false)}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#00796B] hover:bg-[#00695C] text-white text-xs font-bold shadow-md shadow-[#00796B]/20 transition-all disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{saving ? 'Attaching...' : 'Attach to Remark'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Tap shutter or use native camera
              </span>

              {/* Shutter Button */}
              <button
                type="button"
                id="camera-shutter-btn"
                onClick={handleSnap}
                disabled={!!cameraError}
                className="w-14 h-14 rounded-full bg-[#00796B] hover:bg-[#00695C] text-white flex items-center justify-center p-1.5 shadow-lg shadow-[#00796B]/30 border-4 border-white ring-2 ring-[#00796B] transition-transform active:scale-95 disabled:opacity-40"
                title="Take photo"
              >
                <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleRetake();
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-2xl hover:bg-[#F4FAF9] transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

