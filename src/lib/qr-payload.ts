/**
 * Isomorphic utility to parse and sanitize QR payloads from faculty presentation screens.
 * Safe to import in both Client Components and Server Environments.
 */

export interface ParsedQrPayload {
  sessionId: string;
  token: string;
}

export function parseQrPayload(
  raw: string,
  fallbackSessionId?: string
): ParsedQrPayload | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();

  // 1. JSON Payload: {"type":"AMS_ATTENDANCE","sessionId":"...","token":"..."}
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && parsed.sessionId && parsed.token) {
        return {
          sessionId: String(parsed.sessionId).trim(),
          token: String(parsed.token).trim(),
        };
      }
    } catch {}
    // If it is formatted as a JSON object but missing required fields or invalid JSON, reject directly
    return null;
  }

  // 2. URL Payload: https://.../student/scan?sessionId=XYZ&token=ABC or /student/scan?sessionId=XYZ&token=ABC
  try {
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.includes('sessionId=')
    ) {
      const url = new URL(trimmed, 'http://localhost');
      const sId = url.searchParams.get('sessionId');
      const tok = url.searchParams.get('token');
      if (sId && tok) {
        return { sessionId: sId.trim(), token: tok.trim() };
      }
    }
  } catch {}

  // 3. Delimited format: "sessionId:token" or "sessionId|token"
  for (const delimiter of [':', '|']) {
    if (trimmed.includes(delimiter)) {
      const parts = trimmed.split(delimiter);
      if (parts.length === 2) {
        const [sId, tok] = parts.map((p) => p.trim());
        // Ensure tokens don't contain JSON or XML punctuation
        const isValidIdentifier = (str: string) =>
          str.length >= 4 && !/[\{\}\[\]"']/.test(str);
        if (sId.length >= 8 && isValidIdentifier(sId) && isValidIdentifier(tok)) {
          return { sessionId: sId, token: tok };
        }
      }
    }
  }

  // 4. Raw token fallback when session ID is already prefilled
  if (fallbackSessionId && trimmed.length >= 8 && !trimmed.includes(' ')) {
    return { sessionId: fallbackSessionId.trim(), token: trimmed };
  }

  return null;
}
