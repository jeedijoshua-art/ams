'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, CheckCircle2, AlertTriangle, KeyRound, Loader2, ArrowRight } from 'lucide-react';

interface QrScannerProps {
  onCheckInSuccess: (result: any) => void;
  prefilledSessionId?: string;
}

export function QrScanner({ onCheckInSuccess, prefilledSessionId }: QrScannerProps) {
  const [scanningActive, setScanningActive] = useState(false);
  const [manualSessionId, setManualSessionId] = useState(prefilledSessionId || '');
  const [manualToken, setManualToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (scanningActive) {
      const scanner = new Html5QrcodeScanner(
        'reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          handleQrDecoded(decodedText);
          scanner.clear();
          setScanningActive(false);
        },
        (errorMessage) => {
          // ignore stream parse errors
        }
      );

      scannerRef.current = scanner;

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch((err) => console.error(err));
        }
      };
    }
  }, [scanningActive]);

  const handleQrDecoded = (decodedText: string) => {
    try {
      // Check if QR is formatted JSON
      const parsed = JSON.parse(decodedText);
      if (parsed.type === 'AMS_ATTENDANCE' && parsed.sessionId && parsed.token) {
        setManualSessionId(parsed.sessionId);
        setManualToken(parsed.token);
        submitCheckIn(parsed.sessionId, parsed.token);
        return;
      }
    } catch {
      // Fallback: If payload is just raw token
      if (manualSessionId) {
        setManualToken(decodedText);
        submitCheckIn(manualSessionId, decodedText);
      } else {
        setManualToken(decodedText);
        setMessage({
          type: 'error',
          text: 'QR detected. Please select the session ID to confirm check-in.',
        });
      }
    }
  };

  const submitCheckIn = async (sessionId: string, token: string) => {
    if (!sessionId.trim() || !token.trim()) {
      setMessage({ type: 'error', text: 'Both Session ID and Token are required.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

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

      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: data.message || 'Attendance recorded successfully!',
        });
        onCheckInSuccess(data);
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to record attendance.',
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Network error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border transition-all ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          )}
          <div className="text-sm">
            <p className="font-semibold">
              {message.type === 'success' ? 'Attendance Recorded' : 'Check-In Notice'}
            </p>
            <p className="mt-0.5">{message.text}</p>
          </div>
        </div>
      )}

      {/* Camera Scanner View */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center">
        {!scanningActive ? (
          <div>
            <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Live Camera Scanner</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
              Point your camera at the faculty screen to instantly scan the dynamic session QR code.
            </p>
            <button
              onClick={() => setScanningActive(true)}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-teal-500/20"
            >
              Start Camera Scanner
            </button>
          </div>
        ) : (
          <div>
            <div id="reader" className="w-full max-w-sm mx-auto rounded-xl overflow-hidden border border-slate-700" />
            <button
              onClick={() => setScanningActive(false)}
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Stop Camera
            </button>
          </div>
        )}
      </div>

      {/* Manual Check-in Fallback */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-teal-400" />
          <h4 className="text-sm font-bold text-white">Manual Token Entry</h4>
          <span className="text-[11px] text-slate-400 ml-auto">Desktop / No-Webcam fallback</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitCheckIn(manualSessionId, manualToken);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Session ID</label>
            <input
              type="text"
              placeholder="e.g. 5fa8ca0a-ff30-47a4-a764-..."
              value={manualSessionId}
              onChange={(e) => setManualSessionId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              QR Token / Verification Code
            </label>
            <input
              type="text"
              placeholder="e.g. LIVE-DEMO-TOKEN-606257"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-500/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying Credentials & Enforcing Uniqueness...
              </>
            ) : (
              <>
                Confirm & Mark Attendance
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
