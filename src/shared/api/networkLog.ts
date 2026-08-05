const LOG_PREFIX = '[BackendNetwork]';

const SENSITIVE_BODY_KEYS = new Set([
  'idToken',
  'accessToken',
  'refreshToken',
  'entropy',
  'seed',
  'ciphertext',
  'wrappedKey',
]);

function truncateToken(value: string): string {
  if (value.length <= 48) {
    return value;
  }
  return `${value.slice(0, 24)}…${value.slice(-12)} (${value.length} chars)`;
}

function redactValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    if (
      key === 'entropy' ||
      key === 'seed' ||
      key === 'ciphertext' ||
      (key === 'idToken' && value.length > 80)
    ) {
      return `[string len=${value.length}] ${truncateToken(value)}`;
    }
    if (key === 'accessToken' || key === 'refreshToken' || key === 'idToken') {
      return truncateToken(value);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) => redactValue(String(index), entry));
  }

  if (typeof value === 'object') {
    return redactBody(value as Record<string, unknown>);
  }

  return value;
}

export function redactBody(body: unknown): unknown {
  if (body === null || body === undefined) {
    return body;
  }

  if (typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }

  const record = body as Record<string, unknown>;
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (SENSITIVE_BODY_KEYS.has(key)) {
      redacted[key] = redactValue(key, value);
      continue;
    }

    if (key === 'wrappedKey' && value && typeof value === 'object') {
      redacted[key] = redactBody(value);
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      redacted[key] = redactBody(value);
      continue;
    }

    redacted[key] = value;
  }

  return redacted;
}

export function redactHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const redacted: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'authorization') {
      const token = value.startsWith('Bearer ') ? value.slice(7) : value;
      redacted[key] = `Bearer ${truncateToken(token)}`;
      continue;
    }
    redacted[key] = value;
  }

  return redacted;
}

export function headersFromFetchResponse(
  response: Response,
): Record<string, string> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

function parseJsonBody(text: string): unknown {
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function logNetworkRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: unknown,
): void {
  console.log(`${LOG_PREFIX} → ${method} ${url}`, {
    headers: redactHeaders(headers),
    body: body === undefined ? undefined : redactBody(body),
  });
}

export function logNetworkResponse(
  method: string,
  url: string,
  status: number,
  headers: Record<string, string>,
  bodyText: string,
): void {
  const parsedBody = parseJsonBody(bodyText);
  const bodyForLog =
    parsedBody && typeof parsedBody === 'object'
      ? redactBody(parsedBody)
      : parsedBody;

  console.log(`${LOG_PREFIX} ← ${method} ${url} ${status}`, {
    headers,
    body: bodyForLog,
  });
}

export async function readResponseBodyText(
  response: Response,
): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
