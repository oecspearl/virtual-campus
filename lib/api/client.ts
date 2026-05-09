/**
 * Typed front-end API client.
 *
 * Replaces raw `fetch()` calls scattered across pages and components.
 * Wraps `fetch` with:
 *   - Typed JSON responses
 *   - Automatic JSON body serialization
 *   - Same-origin cookie auth (Supabase session cookies)
 *   - Consistent error shape via `ApiError`
 *
 * CSRF is origin-validated server-side (lib/security.ts) — same-origin
 * fetches automatically pass, so no token plumbing is needed here.
 *
 * Example:
 *   import { apiGet, apiPost } from '@/lib/api/client';
 *
 *   interface Course { id: string; title: string }
 *   const course = await apiGet<Course>(`/api/courses/${id}`);
 *
 *   await apiPost('/api/enrollments', { courseId: id });
 */

export interface ApiClientOptions {
  /** Extra headers merged on top of defaults. */
  headers?: Record<string, string>;
  /** Abort the request — pair with AbortController. */
  signal?: AbortSignal;
  /** Query-string params, appended to `path`. Values are URL-encoded. */
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Override `credentials`. Default `'same-origin'` — sends Supabase auth cookies. */
  credentials?: RequestCredentials;
  /**
   * When true, return the raw `Response` instead of parsing JSON. Use for
   * streaming, file downloads, or endpoints that don't return JSON.
   */
  raw?: boolean;
}

/**
 * Thrown on any non-2xx response. Inspect `status` for the HTTP code and
 * `body` for the parsed JSON error payload (if any).
 */
export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function buildUrl(path: string, query?: ApiClientOptions['query']): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  if (!qs) return path;
  return path.includes('?') ? `${path}&${qs}` : `${path}?${qs}`;
}

async function parseError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  let message = `HTTP ${response.status}`;
  try {
    const text = await response.text();
    if (text) {
      try {
        body = JSON.parse(text);
        if (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string') {
          message = (body as { error: string }).error;
        }
      } catch {
        body = text;
        message = text.slice(0, 200);
      }
    }
  } catch {
    // body unreadable — keep the default status message
  }
  return new ApiError(response.status, message, body);
}

async function request<T>(
  method: string,
  path: string,
  body: unknown,
  options: ApiClientOptions = {},
): Promise<T> {
  const hasBody = body !== undefined && body !== null;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };

  const response = await fetch(buildUrl(path, options.query), {
    method,
    headers,
    body: hasBody ? JSON.stringify(body) : undefined,
    credentials: options.credentials ?? 'same-origin',
    signal: options.signal,
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  if (options.raw) {
    return response as unknown as T;
  }

  // 204 No Content and empty bodies — return null cast to T
  if (response.status === 204) {
    return null as T;
  }

  const text = await response.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

export function apiGet<T>(path: string, options?: ApiClientOptions): Promise<T> {
  return request<T>('GET', path, undefined, options);
}

export function apiPost<T, B = unknown>(path: string, body?: B, options?: ApiClientOptions): Promise<T> {
  return request<T>('POST', path, body, options);
}

export function apiPut<T, B = unknown>(path: string, body?: B, options?: ApiClientOptions): Promise<T> {
  return request<T>('PUT', path, body, options);
}

export function apiPatch<T, B = unknown>(path: string, body?: B, options?: ApiClientOptions): Promise<T> {
  return request<T>('PATCH', path, body, options);
}

export function apiDelete<T = void>(path: string, options?: ApiClientOptions): Promise<T> {
  return request<T>('DELETE', path, undefined, options);
}

/**
 * For multipart uploads. Pass a `FormData` body; do NOT set Content-Type —
 * the browser sets it (with the multipart boundary) automatically.
 */
export function apiUpload<T>(path: string, formData: FormData, options?: Omit<ApiClientOptions, 'headers'> & { headers?: Record<string, string> }): Promise<T> {
  // Strip Content-Type if a caller passed it — fetch must set the boundary.
  const headers = { ...(options?.headers ?? {}) };
  delete headers['Content-Type'];
  delete headers['content-type'];

  return fetch(buildUrl(path, options?.query), {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json', ...headers },
    credentials: options?.credentials ?? 'same-origin',
    signal: options?.signal,
  }).then(async (response) => {
    if (!response.ok) throw await parseError(response);
    if (options?.raw) return response as unknown as T;
    if (response.status === 204) return null as T;
    const text = await response.text();
    if (!text) return null as T;
    return JSON.parse(text) as T;
  });
}
