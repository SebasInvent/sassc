// Configuración de API para producción y desarrollo
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Helper para hacer requests al backend
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
) {
  const url = `${API_URL}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}

// GET request
export async function apiGet(endpoint: string, token?: string | null) {
  return apiRequest(endpoint, { method: 'GET' }, token);
}

// POST request
export async function apiPost(endpoint: string, data: any, token?: string | null) {
  return apiRequest(
    endpoint,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token
  );
}

// PUT request
export async function apiPut(endpoint: string, data: any, token?: string | null) {
  return apiRequest(
    endpoint,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    token
  );
}

// PATCH request
export async function apiPatch(endpoint: string, data: any, token?: string | null) {
  return apiRequest(
    endpoint,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
    token
  );
}

// DELETE request
export async function apiDelete(endpoint: string, token?: string | null) {
  return apiRequest(endpoint, { method: 'DELETE' }, token);
}
