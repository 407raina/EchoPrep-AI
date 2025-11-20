import { clearStoredAuth, getStoredToken } from "./auth-storage";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

type ApiOptions = RequestInit & {
  skipAuth?: boolean;
  parseJson?: boolean;
};

const isFormData = (value: unknown): value is FormData =>
  typeof FormData !== "undefined" && value instanceof FormData;

const buildError = async (response: Response) => {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") {
      return new Error(data.error);
    }
    if (data?.message) {
      return new Error(data.message);
    }
  } catch (error) {
    // ignore JSON parse errors
  }

  const fallback = await response.text();
  return new Error(fallback || `Request failed with status ${response.status}`);
};

export const apiFetch = async <T = unknown>(path: string, options: ApiOptions = {}) => {
  const { skipAuth, parseJson = true, headers, body, ...rest } = options;
  const token = !skipAuth ? getStoredToken() : null;
  
  // Use Headers object for easier management
  const finalHeaders = new Headers(headers);

  // Set Content-Type for JSON, but not for FormData
  if (body && !isFormData(body) && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  // Always attach auth token if available and not skipped
  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  const url = `${API_BASE_URL}${path}`;
  console.log(`[API] ${rest.method || 'GET'} ${url}`);

  const response = await fetch(url, {
    ...rest,
    body,
    headers: finalHeaders,
  });

  console.log(`[API] Response: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const error = await buildError(response);
    
    if (response.status === 401 && !skipAuth) {
      console.warn('[API] 401 Unauthorized - clearing stored auth');
      clearStoredAuth();
      
      if (!window.location.pathname.includes('/auth')) {
        setTimeout(() => {
          window.location.href = '/auth';
        }, 100);
      }
      
      throw new Error('Session expired. Please log in again.');
    }
    
    console.error(`[API] Error:`, error.message);
    throw error;
  }

  if (!parseJson || response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) {
    return (await response.text()) as T;
  }

  return (await response.json()) as T;
};
