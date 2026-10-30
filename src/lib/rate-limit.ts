interface AttemptRecord {
  count: number;
  lastAttempt: number;
  blockedUntil: number;
}

const attempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function isRateLimited(identifier: string): boolean {
  const key = identifier.toLowerCase().trim();
  const record = attempts.get(key);
  if (!record) return false;

  const now = Date.now();
  if (record.blockedUntil > now) {
    return true;
  }

  // If outside window, reset
  if (now - record.lastAttempt > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }

  return record.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(identifier: string): void {
  const key = identifier.toLowerCase().trim();
  const now = Date.now();
  const record = attempts.get(key) || { count: 0, lastAttempt: now, blockedUntil: 0 };

  if (now - record.lastAttempt > WINDOW_MS) {
    record.count = 1;
  } else {
    record.count += 1;
  }

  record.lastAttempt = now;

  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
    console.warn(`[SECURITY] Login throttled for identifier: ${key} until ${new Date(record.blockedUntil).toISOString()}`);
  }

  attempts.set(key, record);
}

export function clearFailedAttempts(identifier: string): void {
  const key = identifier.toLowerCase().trim();
  attempts.delete(key);
}
