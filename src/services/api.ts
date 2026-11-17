type TokenProvider = () => Promise<string | null>;

let activeTokenProvider: TokenProvider = async () => null;

export function setAuthTokenProvider(provider: TokenProvider) {
  activeTokenProvider = provider;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  email?: string;

  constructor(message: string, status: number, code?: string, email?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.email = email;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await activeTokenProvider();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      payload?.error || `Request failed (${response.status})`,
      response.status,
      payload?.code,
      payload?.email
    );
  }

  return payload as T;
}
