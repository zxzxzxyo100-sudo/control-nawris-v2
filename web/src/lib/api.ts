// عميل API موحّد يتحدث مع واجهة PHP على /api

const BASE = '/api';

function token(): string | null {
  return localStorage.getItem('nawris_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const t = token();
  if (t) headers['X-Auth-Token'] = t;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error((data && (data.error || data.detail)) || `خطأ ${res.status}`);
  }
  return data as T;
}

export interface User {
  username: string;
  name: string;
  role: string;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () => request<{ user: User }>('/me'),

  // واجهة بيانات عامة على نمط col=eq.value
  select: <T = any>(table: string, query = '') =>
    request<T[]>(`/data/${table}${query ? `?${query}` : ''}`),

  insert: (table: string, rows: unknown) =>
    request(`/data/${table}`, { method: 'POST', body: JSON.stringify(rows) }),

  update: (table: string, query: string, patch: unknown) =>
    request(`/data/${table}?${query}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  remove: (table: string, query: string) =>
    request(`/data/${table}?${query}`, { method: 'DELETE' }),

  // إدارة المستخدمين (للمدير فقط)
  listUsers: () => request<UserRow[]>('/users'),
  saveUser: (user: UserRow & { password?: string }) =>
    request('/users', { method: 'POST', body: JSON.stringify(user) }),
  deleteUser: (username: string) =>
    request(`/users?username=${encodeURIComponent(username)}`, { method: 'DELETE' }),
};

export interface UserRow {
  username: string;
  name: string;
  role: string;
  status: string;
  created_at?: string;
}
