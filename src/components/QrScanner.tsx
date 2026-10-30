'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Html5Qrcode,
  CameraDevice,
  Html5QrcodeCameraScanConfig,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Loader2,
  ArrowRight,
  RotateCw,
  SwitchCamera,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Upload,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { parseQrPayload } from '@/lib/qr-payload';

interface QrScannerProps {
  onCheckInSuccess: (result: any) => void;
  prefilledSessionId?: string;
  prefilledToken?: string;
}

type ScannerStatus =
  | 'idle'
  | 'requesting_permission'
  | 'starting'
  | 'scanning'
  | 'qr_detected'
  | 'submitting'
  | 'success'
  | 'error';

export function QrScanner({
  onCheckInSuccess,
  prefilledSessionId,
  prefilledToken,
}: QrScannerProps) {
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('idle');
  const [isSecure, setIsSecure] = useState(true);
  const [isHttps, setIsHttps] = useState(false);
  const [isLoopback, setIsLoopback] = useState(false);
  const [hasMediaDevices, setHasMediaDevices] = useState(true);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [manualSessionId, setManualSessionId] = useState(prefilledSessionId || '');
  const [manualToken, setManualToken] = useState(prefilledToken || '');
  const [openSessions, setOpenSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    title?: string;
    text: string;
  } | null>(null);

  // References for strict lifecycle management & duplicate submission suppression
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrInstanceRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const isMountedRef = useRef(true);
  const activeCameraIndexRef = useRef(0);

  // Check secure context and media device support on mount
  useEffect(() => {
    isMountedRef.current = true;

    if (typeof window !== 'undefined') {
      const loopback =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const httpsProto = window.location.protocol === 'https:';
      setIsLoopback(loopback);
      setIsHttps(httpsProto);

      const secureContext = Boolean(window.isSecureContext || loopback || httpsProto);
      setIsSecure(secureContext);

      const mediaAvailable = Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      setHasMediaDevices(mediaAvailable);

      if (!secureContext && !loopback) {
        setMessage({
          type: 'warning',
          title: 'Mobile Camera Restricted on HTTP',
          text: 'Mobile browsers (iOS Safari, Android Chrome) block live video streaming on plain HTTP. You can use "Snap QR Photo" below, switch to HTTPS for live camera, or enter the 6-character code.',
        });
      }
    }

    return () => {
      isMountedRef.current = false;
      // Clean up camera resources on unmount
      if (qrInstanceRef.current) {
        const scanner = qrInstanceRef.current;
        if (scanner.isScanning) {
          scanner
            .stop()
            .catch(() => {})
            .finally(() => {
              try {
                scanner.clear();
              } catch {}
            });
        } else {
          try {
            scanner.clear();
          } catch {}
        }
        qrInstanceRef.current = null;
      }
      // Stop all tracks on unmount
      if (viewportRef.current) {
        const videoElements = viewportRef.current.querySelectorAll('video');
        videoElements.forEach((video) => {
          if (video.srcObject && 'getTracks' in (video.srcObject as MediaStream)) {
            try {
              (video.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
            } catch {}
            video.srcObject = null;
          }
        });
      }
    };
  }, []);

  // Fetch currently open attendance sessions for enrolled student
  useEffect(() => {
    const fetchActiveSessions = async () => {
      setLoadingSessions(true);
      try {
        const res = await fetch('/api/sessions?status=OPEN');
        if (res.ok) {
          const data = await res.json();
          if (data.sessions && Array.isArray(data.sessions)) {
            setOpenSessions(data.sessions);
            if (prefilledSessionId) {
              const matched = data.sessions.find((s: any) => s.id === prefilledSessionId);
              if (matched) {
                setSelectedSubjectName(`${matched.subject.code}: ${matched.subject.name}`);
              }
            } else if (data.sessions.length > 0) {
              // Automatically select the active session so the student doesn't have to type UUID!
              setManualSessionId(data.sessions[0].id);
              setSelectedSubjectName(
                `${data.sessions[0].subject.code}: ${data.sessions[0].subject.name}`
              );
            }
          }
        }
      } catch (err) {
        console.warn('[QR-SCANNER] Failed to fetch active sessions:', err);
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchActiveSessions();
  }, [prefilledSessionId]);

  // Sync prefilled values if provided asynchronously
  useEffect(() => {
    if (prefilledSessionId && !manualSessionId) {
      setManualSessionId(prefilledSessionId);
    }
  }, [prefilledSessionId, manualSessionId]);

  useEffect(() => {
    if (prefilledToken && !manualToken) {
      setManualToken(prefilledToken);
    }
  }, [prefilledToken, manualToken]);

  const stopCameraScanner = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    try {
      if (qrInstanceRef.current) {
        const scanner = qrInstanceRef.current;
        if (scanner.isScanning) {
          await scanner.stop();
        }
        try {
          scanner.clear();
        } catch {}
        qrInstanceRef.current = null;
      }

      // Explicit track termination for iOS Safari WebKit cleanup
      if (viewportRef.current) {
        const videoElements = viewportRef.current.querySelectorAll('video');
        videoElements.forEach((video) => {
          if (video.srcObject && 'getTracks' in (video.srcObject as MediaStream)) {
            try {
              (video.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
            } catch {}
            video.srcObject = null;
          }
        });
      }
    } catch (err) {
      console.warn('[QR-SCANNER] Error during camera stop:', err);
    } finally {
      isStoppingRef.current = false;
      if (isMountedRef.current) {
        setScannerStatus('idle');
      }
    }
  }, []);

  // Handle mobile backgrounding/tab switching (iOS Safari camera hardware release)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (qrInstanceRef.current && qrInstanceRef.current.isScanning) {
          stopCameraScanner();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stopCameraScanner]);

  const handleCameraError = (err: any) => {
    let errTitle = 'Camera Access Error';
    let errText = err?.message || 'Failed to initialize camera scanner.';

    const errName = err?.name || '';
    const errMsg = String(err?.message || err || '');

    if (
      errName === 'NotAllowedError' ||
      errName === 'PermissionDeniedError' ||
      errMsg.includes('NotAllowedError') ||
      errMsg.includes('Permission denied') ||
      errMsg.includes('permission')
    ) {
      errTitle = 'Camera Permission Required';
      errText =
        "Camera access was denied. On iPhone Safari, tap the 'aA' or lock icon in the address bar > Website Settings > Camera > Allow, then tap Retry Camera.";
    } else if (
      errName === 'NotFoundError' ||
      errName === 'DevicesNotFoundError' ||
      errMsg.includes('NotFoundError') ||
      errMsg.includes('Requested device not found')
    ) {
      errTitle = 'No Camera Found';
      errText =
        'No compatible camera sensor was detected on this device. Please use the Manual Token Entry form below.';
    } else if (
      errName === 'NotReadableError' ||
      errName === 'TrackStartError' ||
      errMsg.includes('NotReadableError') ||
      errMsg.includes('Could not start video source')
    ) {
      errTitle = 'Camera Already In Use';
      errText =
        'Your camera is currently in use by another tab, app, or browser. Please close conflicting applications and retry.';
    } else if (
      errName === 'OverconstrainedError' ||
      errMsg.includes('Overconstrained') ||
      errMsg.includes('constraint')
    ) {
      errTitle = 'Camera Constraints Error';
      errText =
        'The requested camera configuration is not supported by your hardware. Tap Retry Camera to switch to fallback mode.';
    }

    setMessage({
      type: 'error',
      title: errTitle,
      text: errText,
    });
  };

  const startCameraScanner = async (cameraIdOverride?: string) => {
    if (isStartingRef.current || isStoppingRef.current || isSubmittingRef.current) {
      return;
    }
    if (!isMountedRef.current) return;

    // Viewport element MUST exist in DOM before constructing Html5Qrcode
    const viewport = viewportRef.current || document.getElementById('ams-qr-reader-viewport');
    if (!viewport || !document.body.contains(viewport)) {
      console.error('[QR-SCANNER] Fatal: Viewport #ams-qr-reader-viewport element not found in DOM.');
      setMessage({
        type: 'error',
        title: 'Scanner Viewport Error',
        text: 'The camera viewport container is not ready. Please refresh the page.',
      });
      return;
    }

    isStartingRef.current = true;
    setScannerStatus('requesting_permission');
    setMessage(null);

    try {
      // Clean up previous instance if any
      if (qrInstanceRef.current) {
        try {
          if (qrInstanceRef.current.isScanning) {
            await qrInstanceRef.current.stop();
          }
          qrInstanceRef.current.clear();
        } catch {}
        qrInstanceRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMessage({
          type: 'warning',
          title: 'Mobile Camera Restricted on HTTP',
          text: 'Mobile browsers (iOS Safari, Android Chrome) restrict camera hardware on plain HTTP local network connections. Use the Quick Verification Code form below to record attendance.',
        });
        setScannerStatus('idle');
        return;
      }

      // Initialize Html5Qrcode with specialized QR format config & native BarcodeDetector acceleration
      const html5Qr = new Html5Qrcode('ams-qr-reader-viewport', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      qrInstanceRef.current = html5Qr;

      const cameraIdToUse = cameraIdOverride || selectedCameraId;
      // Prefer rear/environment camera on mobile; fallback gracefully on desktop
      const cameraConfig = cameraIdToUse
        ? { deviceId: { exact: cameraIdToUse } }
        : { facingMode: 'environment' };

      // High-performance scan configuration:
      // Omit qrbox so the entire camera frame is captured without coordinate scaling drift
      const scanConfig: Html5QrcodeCameraScanConfig = {
        fps: 15,
        disableFlip: false,
      };

      setScannerStatus('starting');
      console.log('[QR-DIAGNOSTIC] Camera starting. Sensor mode:', cameraIdToUse ? 'DEVICE_ID' : 'ENVIRONMENT');

      try {
        await html5Qr.start(
          cameraConfig,
          scanConfig,
          (decodedText) => {
            handleQrDecoded(decodedText);
          },
          () => {
            // Frame parse error: expected while hunting for QR
          }
        );
      } catch (startErr: any) {
        // If rear/environment camera failed (e.g. laptop with only front webcam), fallback to front camera
        const errMsg = String(startErr?.message || startErr || '');
        const isConstraintErr =
          startErr?.name === 'OverconstrainedError' ||
          errMsg.includes('Overconstrained') ||
          errMsg.includes('constraint') ||
          errMsg.includes('NotFoundError');

        if (!cameraIdToUse) {
          console.warn('[QR-SCANNER] Rear camera attempt failed, trying front/default camera...', startErr);
          try {
            await html5Qr.start(
              { facingMode: 'user' },
              scanConfig,
              (decodedText) => {
                handleQrDecoded(decodedText);
              },
              () => {}
            );
          } catch (userErr: any) {
            // Final fallback: Enumerate available video inputs directly
            if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
              const allDevs = await navigator.mediaDevices.enumerateDevices();
              const firstVideo = allDevs.find((d) => d.kind === 'videoinput');
              if (firstVideo?.deviceId) {
                console.warn('[QR-SCANNER] Attempting first enumerated device:', firstVideo.label || firstVideo.deviceId);
                await html5Qr.start(
                  firstVideo.deviceId,
                  scanConfig,
                  (decodedText) => {
                    handleQrDecoded(decodedText);
                  },
                  () => {}
                );
                return;
              }
            }
            throw startErr;
          }
        } else {
          throw startErr;
        }
      }

      if (!isMountedRef.current) {
        await html5Qr.stop().catch(() => {});
        html5Qr.clear();
        return;
      }

      // Safeguard video element on WebKit:
      // 1. Enforce playsinline and muted attributes required by iOS Safari.
      // 2. Intercept and neutralize html5-qrcode's internal unhandled throw on video.onabort.
      // 3. Ensure video is actively playing and visible.
      const videoEl = viewport.querySelector('video');
      if (videoEl) {
        videoEl.setAttribute('playsinline', 'true');
        videoEl.setAttribute('webkit-playsinline', 'true');
        videoEl.setAttribute('muted', 'true');
        videoEl.setAttribute('autoplay', 'true');
        videoEl.playsInline = true;
        videoEl.muted = true;

        videoEl.onabort = () => {
          console.warn('[QR-DIAGNOSTIC] WebKit video onabort event captured safely without throwing.');
        };
        videoEl.onerror = () => {
          console.warn('[QR-DIAGNOSTIC] WebKit video onerror event captured safely.');
        };

        if (videoEl.paused) {
          videoEl.play().catch((playErr) => {
            console.warn('[QR-DIAGNOSTIC] Video resume warning:', playErr);
          });
        }

        console.log(
          '[QR-DIAGNOSTIC] Video surface ready. Visible dimensions:',
          videoEl.clientWidth,
          'x',
          videoEl.clientHeight,
          'Resolution:',
          videoEl.videoWidth,
          'x',
          videoEl.videoHeight
        );
      }

      setScannerStatus('scanning');
      console.log('[QR-DIAGNOSTIC] Camera stream ready & actively scanning for QR codes.');

      // SAFE CAMERA ENUMERATION:
      // NEVER call Html5Qrcode.getCameras() here, because Html5Qrcode.getCameras() internally
      // requests a second getUserMedia() stream, which causes iOS Safari to ABORT the active camera track!
      // Using native navigator.mediaDevices.enumerateDevices() enumerates devices safely without stream interruption.
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
        try {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = allDevices
            .filter((d) => d.kind === 'videoinput')
            .map((d, index) => ({
              id: d.deviceId,
              label: d.label || `Camera ${index + 1}`,
            }));

          if (isMountedRef.current && videoInputs.length > 0) {
            setCameras(videoInputs);
            if (cameraIdToUse) {
              setSelectedCameraId(cameraIdToUse);
            }
          }
        } catch (enumErr) {
          console.warn('[QR-DIAGNOSTIC] Safe device enumeration warning:', enumErr);
        }
      }
    } catch (err: any) {
      console.error('[QR-SCANNER] Camera startup failed:', err);
      if (qrInstanceRef.current) {
        try {
          qrInstanceRef.current.clear();
        } catch {}
        qrInstanceRef.current = null;
      }
      if (isMountedRef.current) {
        setScannerStatus('error');
        handleCameraError(err);
      }
    } finally {
      isStartingRef.current = false;
    }
  };

  const handleSwitchCamera = async () => {
    if (cameras.length <= 1 || isStartingRef.current || isStoppingRef.current) return;

    activeCameraIndexRef.current = (activeCameraIndexRef.current + 1) % cameras.length;
    const nextCamera = cameras[activeCameraIndexRef.current];
    setSelectedCameraId(nextCamera.id);
    await startCameraScanner(nextCamera.id);
  };

  const handleSwitchToHttps = () => {
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      currentUrl.protocol = 'https:';
      window.location.href = currentUrl.toString();
    }
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setScannerStatus('submitting');
    setMessage({
      type: 'warning',
      title: 'Analyzing Photo...',
      text: 'Decoding cryptographic QR attendance token from captured photo.',
    });

    try {
      let html5Qr = qrInstanceRef.current;
      if (!html5Qr) {
        html5Qr = new Html5Qrcode('ams-qr-reader-viewport', {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        qrInstanceRef.current = html5Qr;
      }

      console.log('[QR-DIAGNOSTIC] Scanning photo file via Html5Qrcode.scanFile...');
      const decodedText = await html5Qr.scanFile(file, true);
      isSubmittingRef.current = false;
      await handleQrDecoded(decodedText);
    } catch (err: any) {
      console.warn('[QR-SCANNER] Photo QR scan failed:', err);
      isSubmittingRef.current = false;
      setScannerStatus('idle');
      setMessage({
        type: 'error',
        title: 'QR Code Not Detected in Photo',
        text: 'Could not read a clear AMS attendance QR code from the captured photo. Hold steady, ensure good lighting on the screen, and retry or enter the 6-character code below.',
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleQrDecoded = async (decodedText: string) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    // Minimal dev diagnostics (length & format only, zero secrets)
    const isJson = decodedText.trim().startsWith('{') && decodedText.trim().endsWith('}');
    console.log('[QR-DIAGNOSTIC] QR code decoded. Format:', isJson ? 'JSON' : 'STRING', 'Length:', decodedText.length);

    // Set UI state immediately so student sees detection confirmation
    setScannerStatus('qr_detected');

    const parsed = parseQrPayload(decodedText, manualSessionId);
    console.log('[QR-DIAGNOSTIC] Payload parsing outcome:', parsed ? 'VALID' : 'INVALID');

    if (!parsed) {
      isSubmittingRef.current = false;
      setMessage({
        type: 'error',
        title: 'Unrecognized QR Code',
        text: 'The scanned QR code is not a valid AMS attendance token. Please verify you are scanning the classroom screen.',
      });
      setScannerStatus('idle');
      return;
    }

    // Immediately stop camera to freeze scan and prevent duplicate scans
    await stopCameraScanner();

    setManualSessionId(parsed.sessionId);
    setManualToken(parsed.token);
    await submitCheckIn(parsed.sessionId, parsed.token);
  };

  const submitCheckIn = async (sessionId: string, token: string) => {
    if (!sessionId.trim() || !token.trim()) {
      isSubmittingRef.current = false;
      setMessage({
        type: 'error',
        title: 'Missing Required Fields',
        text: 'Both Session ID and QR Token are required to mark attendance.',
      });
      setScannerStatus('idle');
      return;
    }

    isSubmittingRef.current = true;
    setScannerStatus('submitting');
    setMessage(null);
    console.log('[QR-DIAGNOSTIC] Submitting attendance check-in to /api/attendance/check-in...');

    try {
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId.trim(),
          token: token.trim(),
        }),
      });

      const data = await res.json();
      console.log('[QR-DIAGNOSTIC] Server check-in response status:', res.status, 'Success:', Boolean(data.success));

      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          title: 'Attendance Confirmed!',
          text: data.message || 'Presence successfully recorded on server.',
        });
        setScannerStatus('success');
        onCheckInSuccess(data);
      } else {
        const errorReason = data.errorReason;
        console.warn('[QR-DIAGNOSTIC] Check-in rejected by server. Reason:', errorReason || data.error);
        let userAdvice = data.error || 'Failed to mark attendance.';

        if (errorReason === 'TOKEN_EXPIRED') {
          userAdvice = 'This QR token has expired. Ask your faculty to click "Refresh" on the classroom projection screen.';
        } else if (errorReason === 'ALREADY_MARKED') {
          userAdvice = 'You have already checked into this attendance session.';
        } else if (errorReason === 'NOT_ENROLLED') {
          userAdvice = 'You are not enrolled in this course. Submit an enrollment request under Course Registration first.';
        } else if (errorReason === 'SESSION_NOT_OPEN') {
          userAdvice = 'This attendance session has already been concluded by the faculty.';
        }

        setMessage({
          type: 'error',
          title: 'Check-In Notice',
          text: userAdvice,
        });
        setScannerStatus('idle');
      }
    } catch (err: any) {
      console.error('[QR-DIAGNOSTIC] Network failure contacting AMS check-in API:', err?.name);
      setMessage({
        type: 'error',
        title: 'Network Communication Error',
        text: err.message || 'Unable to communicate with the AMS server. Please check your network and retry.',
      });
      setScannerStatus('idle');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const isScanning = scannerStatus === 'scanning';
  const isBusy =
    scannerStatus === 'requesting_permission' ||
    scannerStatus === 'starting' ||
    scannerStatus === 'qr_detected' ||
    scannerStatus === 'submitting';

  return (
    <div className="space-y-6">
      {/* Feedback Message Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border transition-all ${
            message.type === 'success'
              ? 'bg-[#72D6A0]/10 border-[#72D6A0]/30 text-[#72D6A0] shadow-lg'
              : message.type === 'warning'
              ? 'bg-[#F0BC65]/10 border-[#F0BC65]/30 text-[#F0BC65] shadow-lg'
              : 'bg-[#FF7777]/10 border-[#FF7777]/30 text-[#FF7777] shadow-lg'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-[#72D6A0] mt-0.5" />
          ) : message.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 shrink-0 text-[#F0BC65] mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-[#FF7777] mt-0.5" />
          )}
          <div className="text-xs">
            {message.title && <p className="font-bold text-sm mb-0.5">{message.title}</p>}
            <p className="leading-relaxed">{message.text}</p>
          </div>
        </div>
      )}

      {/* Camera Scanner Container Card */}
      <div className="p-4 sm:p-6 rounded-xl bg-[#171B18] border border-[#303831] text-center relative overflow-hidden shadow-xl">
        {/* Responsive Viewport Frame */}
        <div className="relative w-full max-w-sm mx-auto rounded-xl overflow-hidden border-2 border-[#303831] bg-black min-h-[300px] shadow-2xl flex items-center justify-center">
          {/*
            STABLE TARGET VIEWPORT:
            This DOM container is ALWAYS rendered and NEVER conditionally removed.
            This guarantees that Html5Qrcode's constructor finds it synchronously on both iPhone and Desktop.
          */}
          <div
            id="ams-qr-reader-viewport"
            ref={viewportRef}
            className="w-full h-full min-h-[300px] flex items-center justify-center overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:min-h-[300px] [&_video]:object-cover [&_video]:rounded-xl [&_img]:hidden"
          />

          {/* Idle / Cover State Overlay */}
          {!isScanning && (
            <div className="absolute inset-0 bg-[#101211]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10 transition-opacity duration-300">
              <div className="w-16 h-16 rounded-xl bg-[#C6F36B]/10 border border-[#C6F36B]/30 flex items-center justify-center text-[#C6F36B] mb-4 shadow-inner">
                {scannerStatus === 'error' ? (
                  <CameraOff className="w-8 h-8 text-[#FF7777]" />
                ) : (
                  <Camera className="w-8 h-8" />
                )}
              </div>

              <h3 className="text-base sm:text-lg font-bold text-[#F1F3ED]">
                {scannerStatus === 'error' ? 'Camera Stopped' : 'Classroom QR Scanner'}
              </h3>
              <p className="text-xs text-[#A0A89F] max-w-xs mt-1.5 mb-5 leading-relaxed">
                {scannerStatus === 'error'
                  ? 'Resolve camera permissions or retry below.'
                  : 'Scan the faculty attendance QR code projected in class.'}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-sm">
                {/* Live Camera Scanner Button */}
                <button
                  type="button"
                  onClick={() => startCameraScanner()}
                  disabled={isBusy}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-3 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] disabled:opacity-50 text-[#101211] font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#C6F36B]/25 flex items-center justify-center gap-2 cursor-pointer touch-manipulation select-none"
                >
                  {scannerStatus === 'requesting_permission' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#101211]" />
                      Requesting Permission...
                    </>
                  ) : scannerStatus === 'starting' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#101211]" />
                      Starting Camera...
                    </>
                  ) : scannerStatus === 'error' ? (
                    <>
                      <RotateCw className="w-4 h-4" />
                      Retry Camera
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      Start Live Camera
                    </>
                  )}
                </button>

                {/* Snap QR Code Photo Button (Native Camera - Works on HTTP & HTTPS) */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-3 rounded-xl bg-[#202622] hover:bg-[#303831] border border-[#303831] text-[#F1F3ED] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation select-none"
                  title="Snap a photo of the QR code using your phone's native camera"
                >
                  <Upload className="w-4 h-4 text-[#C6F36B]" />
                  <span>Snap QR Photo</span>
                </button>
              </div>

              {/* Hidden Native Camera File Input with capture="environment" */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileScan}
              />

              {!isHttps && !isLoopback && (
                <button
                  type="button"
                  onClick={handleSwitchToHttps}
                  className="mt-4 text-[11px] text-[#C6F36B] hover:underline flex items-center gap-1.5 font-medium cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Switch to HTTPS (Unlocks Live Camera Stream)</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Active Viewfinder Reticle (Overlays Live Video) */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4 z-10">
              {/* Top Status Pill */}
              <div className="px-3 py-1 rounded-full bg-[#101211]/80 border border-[#C6F36B]/40 text-[11px] font-semibold text-[#C6F36B] flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-[#C6F36B] animate-ping" />
                Align QR Code Inside Box
              </div>

              {/* Center Reticle with Laser Beam */}
              <div className="w-56 h-56 border-2 border-[#C6F36B]/80 rounded-xl relative shadow-[0_0_20px_rgba(198,243,107,0.2)]">
                {/* Glowing Laser Scan Bar */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#C6F36B] to-transparent shadow-[0_0_12px_#C6F36B] animate-[bounce_2s_infinite]" />
                {/* Corner Accent Brackets */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#C6F36B]" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#C6F36B]" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#C6F36B]" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#C6F36B]" />
              </div>

              {/* Bottom Guidance */}
              <span className="text-[10px] text-[#A0A89F] bg-[#101211]/80 px-2 py-0.5 rounded">
                Keep phone steady
              </span>
            </div>
          )}

          {/* QR Code Detected State Overlay */}
          {scannerStatus === 'qr_detected' && (
            <div className="absolute inset-0 bg-[#101211]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 animate-in fade-in">
              <Sparkles className="w-8 h-8 text-[#C6F36B] animate-bounce mb-3" />
              <p className="text-sm font-bold text-[#F1F3ED]">QR Code Detected!</p>
              <p className="text-xs text-[#A0A89F] mt-1">Validating token with server...</p>
            </div>
          )}

          {/* Submitting In-Flight Overlay */}
          {scannerStatus === 'submitting' && (
            <div className="absolute inset-0 bg-[#101211]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#C6F36B] mb-3" />
              <p className="text-sm font-bold text-[#F1F3ED]">Verifying Attendance...</p>
              <p className="text-xs text-[#A0A89F] mt-1">Validating cryptographic QR token with server</p>
            </div>
          )}
        </div>

        {/* Live Scanning Action Toolbar */}
        {isScanning && (
          <div className="flex items-center justify-center gap-3 pt-4">
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#202622] hover:bg-[#303831] text-[#F1F3ED] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer select-none touch-manipulation"
              >
                <SwitchCamera className="w-3.5 h-3.5 text-[#C6F36B]" />
                Switch Camera
              </button>
            )}

            <button
              type="button"
              onClick={stopCameraScanner}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FF7777]/10 hover:bg-[#FF7777]/20 border border-[#FF7777]/30 text-[#FF7777] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer select-none touch-manipulation"
            >
              <CameraOff className="w-3.5 h-3.5" />
              Stop Camera
            </button>
          </div>
        )}

        {/* LAN Insecure Context Advisory */}
        {!isSecure && (
          <div className="mt-4 p-3.5 rounded-lg bg-[#F0BC65]/10 border border-[#F0BC65]/20 text-[#F0BC65] text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-[#F0BC65] mt-0.5" />
              <span>
                <strong>Mobile Camera Note:</strong> Mobile browsers restrict live streaming video on plain HTTP. Use <strong>Snap QR Photo</strong> above, switch to HTTPS, or enter the 6-character code below.
              </span>
            </div>
            {!isHttps && !isLoopback && (
              <button
                type="button"
                onClick={handleSwitchToHttps}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-[#F0BC65]/20 hover:bg-[#F0BC65]/30 text-[#F0BC65] font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Lock className="w-3 h-3" />
                Switch to HTTPS
              </button>
            )}
          </div>
        )}
      </div>

      {/* Manual Token Entry Fallback */}
      <div className="p-6 rounded-xl bg-[#171B18] border border-[#303831] shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="w-4 h-4 text-[#C6F36B]" />
          <h4 className="text-sm font-bold text-[#F1F3ED]">Quick Verification Code Entry</h4>
        </div>
        <p className="text-xs text-[#A0A89F] mb-4 leading-relaxed">
          Enter the 6-character verification code or token displayed on the classroom projection screen.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitCheckIn(manualSessionId, manualToken);
          }}
          className="space-y-4"
          suppressHydrationWarning
        >
          <div>
            <label className="block text-[11px] font-semibold text-[#A0A89F] uppercase tracking-wider mb-1.5">
              Course / Class Session
            </label>
            {openSessions.length > 0 ? (
              <select
                value={manualSessionId}
                onChange={(e) => {
                  setManualSessionId(e.target.value);
                  const selected = openSessions.find((s) => s.id === e.target.value);
                  if (selected) {
                    setSelectedSubjectName(`${selected.subject.code}: ${selected.subject.name}`);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] focus:outline-none focus:border-[#C6F36B] transition-all font-medium"
              >
                {openSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject.code} — {s.subject.name} ({s.classSection || 'CSE-A'})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                value={manualSessionId}
                onChange={(e) => setManualSessionId(e.target.value)}
                placeholder="e.g. 5468fb9d-008d-4b72-be92-427587e525c4"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F]/50 focus:outline-none focus:border-[#C6F36B] transition-all font-mono"
                suppressHydrationWarning
              />
            )}
            {selectedSubjectName && (
              <span className="text-[11px] text-[#C6F36B] font-semibold mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C6F36B]" />
                Selected: {selectedSubjectName}
              </span>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#A0A89F] uppercase tracking-wider mb-1.5">
              Classroom Code / QR Token
            </label>
            <input
              type="text"
              required
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value.toUpperCase())}
              placeholder="e.g. 6-character code (K7P9X2) or full token"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#202622] border border-[#303831] text-sm text-[#C6F36B] placeholder-[#A0A89F]/50 focus:outline-none focus:border-[#C6F36B] transition-all font-mono tracking-widest font-bold"
              suppressHydrationWarning
            />
            <p className="text-[10px] text-[#A0A89F] mt-1">
              Case-insensitive code displayed on classroom projector.
            </p>
          </div>

          <button
            type="submit"
            disabled={isBusy || !manualSessionId.trim() || !manualToken.trim()}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#C6F36B] hover:bg-[#D4FF83] active:bg-[#b5e855] disabled:opacity-40 text-[#101211] font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 shadow-lg shadow-[#C6F36B]/20 touch-manipulation"
          >
            {scannerStatus === 'submitting' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#101211]" />
                Recording Attendance...
              </>
            ) : (
              <>
                <span>Submit Verification Code</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
