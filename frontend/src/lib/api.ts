import { ApiResponse, LoginInput, RegisterInput, User } from '../types/auth';
import {
  Business,
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  Staff,
  CreateStaffInput,
  UpdateStaffInput,
  Service,
  CreateServiceInput,
  UpdateServiceInput,
  Appointment,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AvailabilityCheckResult,
} from '../types/dashboard';
import {
  VoiceAnalyticsSummary,
  VoiceSessionRecord,
  ActiveVoiceSession,
} from '../types/analytics';

/**
 * Resolves the base URL for API requests.
 * - In the browser: ALWAYS returns an empty string `""` so that all fetch requests use relative paths
 *   (e.g., `/api/...`) which route through the Next.js internal rewrite proxy on the current origin.
 *   This eliminates Mixed Content (HTTPS -> HTTP), avoids cross-port CORS issues on mobile,
 *   and guarantees requests from external devices reach the backend.
 * - On the server (SSR): Connects to the local Express backend directly over loopback HTTP.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return '';
  }
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.INTERNAL_API_URL ||
    'http://127.0.0.1:5000'
  ).replace(/\/$/, '');
}

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
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Always send and receive HTTP-only cookies
    });
  } catch (err: any) {
    if (err instanceof TypeError && err.message?.toLowerCase().includes('fetch')) {
      throw new ApiError(
        'Unable to connect to the backend server. Please verify the backend service is running.',
        503
      );
    }
    throw err;
  }

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
    getById: (id: string) => fetcher<Customer>(`/api/customers/${id}`, { method: 'GET' }),
    create: (input: CreateCustomerInput) =>
      fetcher<Customer>('/api/customers', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    update: (id: string, input: UpdateCustomerInput) =>
      fetcher<Customer>(`/api/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    delete: (id: string) => fetcher<void>(`/api/customers/${id}`, { method: 'DELETE' }),
  },
  staff: {
    getAll: (businessId?: string) =>
      fetcher<Staff[]>(
        businessId ? `/api/staff?businessId=${encodeURIComponent(businessId)}` : '/api/staff',
        { method: 'GET' }
      ),
    getById: (id: string) => fetcher<Staff>(`/api/staff/${id}`, { method: 'GET' }),
    create: (input: CreateStaffInput) =>
      fetcher<Staff>('/api/staff', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    update: (id: string, input: UpdateStaffInput) =>
      fetcher<Staff>(`/api/staff/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    delete: (id: string) => fetcher<void>(`/api/staff/${id}`, { method: 'DELETE' }),
  },
  services: {
    getAll: (businessId?: string) =>
      fetcher<Service[]>(
        businessId ? `/api/services?businessId=${encodeURIComponent(businessId)}` : '/api/services',
        { method: 'GET' }
      ),
    getById: (id: string) => fetcher<Service>(`/api/services/${id}`, { method: 'GET' }),
    create: (input: CreateServiceInput) =>
      fetcher<Service>('/api/services', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    update: (id: string, input: UpdateServiceInput) =>
      fetcher<Service>(`/api/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    delete: (id: string) => fetcher<void>(`/api/services/${id}`, { method: 'DELETE' }),
  },
  appointments: {
    getAll: (params?: { businessId?: string; staffId?: string; customerId?: string; status?: string }) => {
      const query = new URLSearchParams();
      if (params?.businessId) query.append('businessId', params.businessId);
      if (params?.staffId) query.append('staffId', params.staffId);
      if (params?.customerId) query.append('customerId', params.customerId);
      if (params?.status) query.append('status', params.status);
      const qs = query.toString();
      return fetcher<Appointment[]>(qs ? `/api/appointments?${qs}` : '/api/appointments', {
        method: 'GET',
      });
    },
    getById: (id: string) => fetcher<Appointment>(`/api/appointments/${id}`, { method: 'GET' }),
    create: (input: CreateAppointmentInput) =>
      fetcher<Appointment>('/api/appointments', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    update: (id: string, input: UpdateAppointmentInput) =>
      fetcher<Appointment>(`/api/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    cancel: (id: string) =>
      fetcher<Appointment>(`/api/appointments/${id}/cancel`, {
        method: 'POST',
      }),
    checkAvailability: (params: { businessId: string; staffId: string; startTime: string; durationMinutes: number; excludeAppointmentId?: string }) => {
      const query = new URLSearchParams({
        businessId: params.businessId,
        staffId: params.staffId,
        startTime: params.startTime,
        durationMinutes: params.durationMinutes.toString(),
      });
      if (params.excludeAppointmentId) {
        query.append('excludeAppointmentId', params.excludeAppointmentId);
      }
      return fetcher<AvailabilityCheckResult>(`/api/appointments/availability?${query.toString()}`, {
        method: 'GET',
      });
    },
  },
  ai: {
    conversation: (input: { sessionId?: string; businessId: string; customerId?: string; message: string }) =>
      fetcher<any>('/api/ai/conversation', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  },
  analytics: {
    getVoiceSummary: (businessId: string) =>
      fetcher<VoiceAnalyticsSummary>(`/api/analytics/voice?businessId=${encodeURIComponent(businessId)}`, {
        method: 'GET',
      }),
    getVoiceSessions: (businessId: string, params?: { page?: number; limit?: number; status?: string }) => {
      const query = new URLSearchParams({ businessId });
      if (params?.page) query.append('page', params.page.toString());
      if (params?.limit) query.append('limit', params.limit.toString());
      if (params?.status) query.append('status', params.status);
      return fetcher<VoiceSessionRecord[]>(`/api/analytics/voice/sessions?${query.toString()}`, {
        method: 'GET',
      });
    },
    getActiveSessions: (businessId: string) =>
      fetcher<ActiveVoiceSession[]>(`/api/analytics/voice/active?businessId=${encodeURIComponent(businessId)}`, {
        method: 'GET',
      }),
    getSessionById: (id: string, businessId: string) =>
      fetcher<VoiceSessionRecord>(`/api/analytics/voice/sessions/${id}?businessId=${encodeURIComponent(businessId)}`, {
        method: 'GET',
      }),
  },
  health: {
    check: () =>
      fetcher<{ status: string; uptimeSeconds: number; timestamp: string; environment: string; version: string }>(
        '/api/health',
        { method: 'GET' }
      ),
  },
};

