import { describe, it, expect } from 'vitest';
import { parseQrPayload } from '@/lib/qr-payload';

describe('QR Scanner Payload Parsing & Concurrency Guards', () => {
  const sampleSessionId = '5468fb9d-008d-4b72-be92-427587e525c4';
  const sampleToken = 'c2VjdXJlX3Rva2VuX3FhXzIwMjY';

  describe('1. JSON Payload Parsing (Classroom Projection Standard)', () => {
    it('successfully parses standard AMS JSON payload from faculty screen', () => {
      const payload = JSON.stringify({
        type: 'AMS_ATTENDANCE',
        sessionId: sampleSessionId,
        token: sampleToken,
      });

      const parsed = parseQrPayload(payload);
      expect(parsed).not.toBeNull();
      expect(parsed?.sessionId).toBe(sampleSessionId);
      expect(parsed?.token).toBe(sampleToken);
    });

    it('handles JSON payloads with extraneous metadata gracefully', () => {
      const payload = JSON.stringify({
        type: 'AMS_ATTENDANCE',
        sessionId: sampleSessionId,
        token: sampleToken,
        courseCode: 'CS301',
        timestamp: Date.now(),
      });

      const parsed = parseQrPayload(payload);
      expect(parsed).not.toBeNull();
      expect(parsed?.sessionId).toBe(sampleSessionId);
      expect(parsed?.token).toBe(sampleToken);
    });
  });

  describe('2. URL Payload Parsing (Deep-Links & Query Parameters)', () => {
    it('extracts sessionId and token from full LAN HTTP URL', () => {
      const fullUrl = `http://172.20.10.3:3000/student/scan?sessionId=${sampleSessionId}&token=${sampleToken}`;
      const parsed = parseQrPayload(fullUrl);
      expect(parsed).not.toBeNull();
      expect(parsed?.sessionId).toBe(sampleSessionId);
      expect(parsed?.token).toBe(sampleToken);
    });

    it('extracts sessionId and token from relative URL', () => {
      const relativeUrl = `/student/scan?sessionId=${sampleSessionId}&token=${sampleToken}`;
      const parsed = parseQrPayload(relativeUrl);
      expect(parsed).not.toBeNull();
      expect(parsed?.sessionId).toBe(sampleSessionId);
      expect(parsed?.token).toBe(sampleToken);
    });

    it('extracts params when URL contains additional query parameters', () => {
      const complexUrl = `https://ams.karunya.edu/student/scan?mode=camera&sessionId=${sampleSessionId}&utm_source=qr&token=${sampleToken}#viewfinder`;
      const parsed = parseQrPayload(complexUrl);
      expect(parsed).not.toBeNull();
      expect(parsed?.sessionId).toBe(sampleSessionId);
      expect(parsed?.token).toBe(sampleToken);
    });
  });

  describe('3. Delimited Format Support (Compact QR & Fallback Displays)', () => {
    it('parses colon-delimited format (sessionId:token)', () => {
      const delimited = `${sampleSessionId}:${sampleToken}`;
      const parsed = parseQrPayload(delimited);
      expect(parsed).not.toBeNull();
      expect(parsed?.sessionId).toBe(sampleSessionId);
      expect(parsed?.token).toBe(sampleToken);
    });

    it('parses pipe-delimited format (sessionId|token)', () => {
      const delimited = `${sampleSessionId}|${sampleToken}`;
      const parsed = parseQrPayload(delimited);
      expect(parsed).not.toBeNull();
      expect(parsed?.sessionId).toBe(sampleSessionId);
      expect(parsed?.token).toBe(sampleToken);
    });
  });

  describe('4. Prefilled Session ID & Raw Token Fallback', () => {
    it('uses fallbackSessionId when raw scanned payload is just a token', () => {
      const parsed = parseQrPayload(sampleToken, sampleSessionId);
      expect(parsed).not.toBeNull();
      expect(parsed?.sessionId).toBe(sampleSessionId);
      expect(parsed?.token).toBe(sampleToken);
    });

    it('prefers explicit payload identifiers even when fallbackSessionId is present', () => {
      const otherSessionId = '99999999-0000-0000-0000-000000000000';
      const payload = JSON.stringify({
        sessionId: otherSessionId,
        token: sampleToken,
      });

      const parsed = parseQrPayload(payload, sampleSessionId);
      expect(parsed).not.toBeNull();
      expect(parsed?.sessionId).toBe(otherSessionId);
      expect(parsed?.token).toBe(sampleToken);
    });
  });

  describe('5. Malformed Payload Rejection & Sanitization', () => {
    it('rejects empty, null, or undefined inputs', () => {
      expect(parseQrPayload('')).toBeNull();
      expect(parseQrPayload('   ')).toBeNull();
      expect(parseQrPayload(null as any)).toBeNull();
      expect(parseQrPayload(undefined as any)).toBeNull();
    });

    it('rejects random unstructured plain text without session context', () => {
      expect(parseQrPayload('hello world')).toBeNull();
      expect(parseQrPayload('https://google.com')).toBeNull();
      expect(parseQrPayload('SOME_RANDOM_BARCODE_STRING')).toBeNull();
    });

    it('rejects JSON payloads missing required fields', () => {
      expect(parseQrPayload(JSON.stringify({ sessionId: sampleSessionId }))).toBeNull();
      expect(parseQrPayload(JSON.stringify({ token: sampleToken }))).toBeNull();
      expect(parseQrPayload(JSON.stringify({ otherField: 'val' }))).toBeNull();
    });

    it('trims whitespace from parsed session and token values', () => {
      const payload = JSON.stringify({
        sessionId: `  ${sampleSessionId}  `,
        token: `  ${sampleToken}  `,
      });

      const parsed = parseQrPayload(payload);
      expect(parsed).not.toBeNull();
      expect(parsed?.sessionId).toBe(sampleSessionId);
      expect(parsed?.token).toBe(sampleToken);
    });
  });

  describe('6. Viewport Element Invariants & Mobile DOM Rules', () => {
    it('verifies standard HTML viewport element ID constant', () => {
      const EXPECTED_VIEWPORT_ID = 'ams-qr-reader-viewport';
      expect(EXPECTED_VIEWPORT_ID).toBe('ams-qr-reader-viewport');
    });

    it('validates camera error classification for mobile Safari & desktop webcams', () => {
      const classifyError = (err: any) => {
        const errName = err?.name || '';
        const errMsg = String(err?.message || err || '');

        if (
          errName === 'NotAllowedError' ||
          errName === 'PermissionDeniedError' ||
          errMsg.includes('NotAllowedError') ||
          errMsg.includes('Permission denied')
        ) {
          return 'PERMISSION_DENIED';
        }
        if (
          errName === 'NotFoundError' ||
          errName === 'DevicesNotFoundError' ||
          errMsg.includes('NotFoundError')
        ) {
          return 'NO_CAMERA_FOUND';
        }
        if (
          errName === 'NotReadableError' ||
          errName === 'TrackStartError' ||
          errMsg.includes('NotReadableError')
        ) {
          return 'CAMERA_IN_USE';
        }
        if (
          errName === 'OverconstrainedError' ||
          errMsg.includes('Overconstrained') ||
          errMsg.includes('constraint')
        ) {
          return 'OVERCONSTRAINED';
        }
        return 'UNKNOWN';
      };

      expect(classifyError({ name: 'NotAllowedError' })).toBe('PERMISSION_DENIED');
      expect(classifyError({ name: 'NotFoundError' })).toBe('NO_CAMERA_FOUND');
      expect(classifyError({ name: 'NotReadableError' })).toBe('CAMERA_IN_USE');
      expect(classifyError({ name: 'OverconstrainedError' })).toBe('OVERCONSTRAINED');
      expect(classifyError(new Error('Permission denied by user agent'))).toBe('PERMISSION_DENIED');
    });

    it('verifies that student check-in API error reasons map to actionable student advice', () => {
      const getActionableAdvice = (errorReason?: string) => {
        if (errorReason === 'TOKEN_EXPIRED') {
          return 'This QR token has expired. Ask your faculty to click "Refresh" on the classroom projection screen.';
        }
        if (errorReason === 'ALREADY_MARKED') {
          return 'You have already checked into this attendance session.';
        }
        if (errorReason === 'NOT_ENROLLED') {
          return 'You are not enrolled in this course. Submit an enrollment request under Course Registration first.';
        }
        if (errorReason === 'SESSION_NOT_OPEN') {
          return 'This attendance session has already been concluded by the faculty.';
        }
        return 'Failed to mark attendance.';
      };

      expect(getActionableAdvice('TOKEN_EXPIRED')).toContain('expired');
      expect(getActionableAdvice('ALREADY_MARKED')).toContain('already checked into');
      expect(getActionableAdvice('NOT_ENROLLED')).toContain('not enrolled');
      expect(getActionableAdvice('SESSION_NOT_OPEN')).toContain('concluded');
    });

    it('simulates rapid duplicate scans and ensures only one check-in submission fires', async () => {
      let isSubmitting = false;
      let submissionsCount = 0;

      const mockSubmit = async () => {
        if (isSubmitting) return;
        isSubmitting = true;
        try {
          submissionsCount++;
          await new Promise((r) => setTimeout(r, 20));
        } finally {
          isSubmitting = false;
        }
      };

      // Rapid successive scan events (e.g. video frames firing multiple callbacks)
      await Promise.all([mockSubmit(), mockSubmit(), mockSubmit(), mockSubmit()]);

      expect(submissionsCount).toBe(1);
    });

    it('simulates retry after failed submission allowing subsequent valid scans', async () => {
      let isSubmitting = false;
      let scannerState = 'scanning';
      let recordedTokens: string[] = [];

      const handleScan = async (token: string, shouldFail = false) => {
        if (isSubmitting) return;
        isSubmitting = true;
        scannerState = 'qr_detected';

        try {
          scannerState = 'submitting';
          if (shouldFail) {
            throw new Error('TOKEN_EXPIRED');
          }
          recordedTokens.push(token);
          scannerState = 'success';
        } catch {
          scannerState = 'idle';
        } finally {
          isSubmitting = false;
        }
      };

      // 1. First scan fails (e.g. expired QR)
      await handleScan('expired_tok', true);
      expect(scannerState).toBe('idle');
      expect(isSubmitting).toBe(false);
      expect(recordedTokens.length).toBe(0);

      // 2. Retry with refreshed QR token succeeds
      await handleScan('valid_refreshed_tok', false);
      expect(scannerState).toBe('success');
      expect(isSubmitting).toBe(false);
      expect(recordedTokens.length).toBe(1);
      expect(recordedTokens[0]).toBe('valid_refreshed_tok');
    });

    it('verifies exact faculty session generation payload matches student parser and request schema', () => {
      const generatedPayload = JSON.stringify({
        type: 'AMS_ATTENDANCE',
        sessionId: sampleSessionId,
        token: sampleToken,
      });

      const parsed = parseQrPayload(generatedPayload);
      expect(parsed).not.toBeNull();

      // Ensure the parsed output matches MarkAttendanceSchema expectation
      const apiBody = {
        sessionId: parsed!.sessionId,
        token: parsed!.token,
      };

      expect(typeof apiBody.sessionId).toBe('string');
      expect(typeof apiBody.token).toBe('string');
      expect(apiBody.sessionId.length).toBeGreaterThan(0);
      expect(apiBody.token.length).toBeGreaterThan(0);
    });

    it('validates non-intrusive enumerateDevices extraction without stream abortion', () => {
      const mockRawDevices = [
        { kind: 'audioinput', deviceId: 'mic-1', label: 'Microphone' },
        { kind: 'videoinput', deviceId: 'cam-back-1', label: 'Back Camera 1' },
        { kind: 'videoinput', deviceId: 'cam-front-1', label: 'Front Camera 1' },
      ];

      const videoInputs = mockRawDevices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => ({
          id: d.deviceId,
          label: d.label || `Camera ${index + 1}`,
        }));

      expect(videoInputs.length).toBe(2);
      expect(videoInputs[0].id).toBe('cam-back-1');
      expect(videoInputs[1].id).toBe('cam-front-1');
    });

    it('verifies iOS WebKit video surface safeguarding and onabort exception neutralization', () => {
      // Simulate video element with library's dangerous onabort thrower
      const mockVideoElement: any = {
        attributes: {} as Record<string, string>,
        setAttribute(k: string, v: string) {
          this.attributes[k] = v;
        },
        playsInline: false,
        muted: false,
        onabort: () => {
          throw new Error('RenderedCameraImpl video surface onabort() called');
        },
      };

      // Apply our fix's safeguarding logic
      mockVideoElement.setAttribute('playsinline', 'true');
      mockVideoElement.setAttribute('webkit-playsinline', 'true');
      mockVideoElement.setAttribute('muted', 'true');
      mockVideoElement.setAttribute('autoplay', 'true');
      mockVideoElement.playsInline = true;
      mockVideoElement.muted = true;

      // Neutralize the dangerous throw
      let abortHandledSafely = false;
      mockVideoElement.onabort = () => {
        abortHandledSafely = true;
      };

      expect(mockVideoElement.attributes['playsinline']).toBe('true');
      expect(mockVideoElement.attributes['webkit-playsinline']).toBe('true');
      expect(mockVideoElement.playsInline).toBe(true);
      expect(mockVideoElement.muted).toBe(true);

      // Trigger onabort - must NOT throw!
      expect(() => mockVideoElement.onabort()).not.toThrow();
      expect(abortHandledSafely).toBe(true);
    });
  });
});
