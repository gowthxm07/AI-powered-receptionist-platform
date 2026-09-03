import { ApiResponse, LoginInput, RegisterInput, User } from '../types/auth';
import { Business, Customer, Staff, Service } from '../types/dashboard';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export class ApiError extends Error {
  public status: number;
  public errors?: Array<{ field: string; message: string }>;

  constructor(message: string, status: number, errors?: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function fetcher<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Always send and receive HTTP-only cookies
  });

  let data: ApiResponse<T>;
  try {
    data = await response.json();
  } catch {
    data = {
      success: false,
      message: response.statusText || 'An unexpected error occurred',
    };
  }

  if (!response.ok) {
    throw new ApiError(
      data.message || `Request failed with status ${response.status}`,
      response.status,
      data.errors
    );
  }

  return data;
}

export const api = {
  auth: {
    register: (input: RegisterInput) =>
      fetcher<User>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    login: (input: LoginInput) =>
      fetcher<User>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    me: () => fetcher<User>('/api/auth/me', { method: 'GET' }),
    logout: () => fetcher<void>('/api/auth/logout', { method: 'POST' }),
  },
  businesses: {
    getAll: () => fetcher<Business[]>('/api/businesses', { method: 'GET' }),
    getById: (id: string) => fetcher<Business>(`/api/businesses/${id}`, { method: 'GET' }),
  },
  customers: {
    getAll: (businessId?: string) =>
      fetcher<Customer[]>(
        businessId ? `/api/customers?businessId=${encodeURIComponent(businessId)}` : '/api/customers',
        { method: 'GET' }
      ),
  },
  staff: {
    getAll: (businessId?: string) =>
      fetcher<Staff[]>(
        businessId ? `/api/staff?businessId=${encodeURIComponent(businessId)}` : '/api/staff',
        { method: 'GET' }
      ),
  },
  services: {
    getAll: (businessId?: string) =>
      fetcher<Service[]>(
        businessId ? `/api/services?businessId=${encodeURIComponent(businessId)}` : '/api/services',
        { method: 'GET' }
      ),
  },
  health: {
    check: () => fetcher<{ status: string; uptimeSeconds: number }>('/api/health', { method: 'GET' }),
  },
};
