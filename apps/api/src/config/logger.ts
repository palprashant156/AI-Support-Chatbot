// Structured JSON logs. Redact PII: never log full email/content in production.
type Level = 'info' | 'warn' | 'error' | 'debug';

function redact(value: unknown): unknown {
  if (typeof value === 'string' && value.includes('@')) return '[redacted-email]';
  return value;
}

function log(level: Level, msg: string, fields: Record<string, unknown> = {}) {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (['email', 'content', 'prompt'].includes(k)) {
      safe[k] = typeof v === 'string' ? `${String(v).slice(0, 120)}…[truncated]` : '[redacted]';
    } else {
      safe[k] = redact(v);
    }
  }
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...safe });
  if (level === 'error') console.error(line);
  else console.log(line);
}

export const logger = {
  info: (msg: string, f?: Record<string, unknown>) => log('info', msg, f),
  warn: (msg: string, f?: Record<string, unknown>) => log('warn', msg, f),
  error: (msg: string, f?: Record<string, unknown>) => log('error', msg, f),
  debug: (msg: string, f?: Record<string, unknown>) => log('debug', msg, f),
};
