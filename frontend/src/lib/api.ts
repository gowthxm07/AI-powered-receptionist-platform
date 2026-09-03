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
    delete: (id: string) =>
      fetcher<void>(`/api/customers/${id}`, {
        method: 'DELETE',
      }),
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
    delete: (id: string) =>
      fetcher<void>(`/api/staff/${id}`, {
        method: 'DELETE',
      }),
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
    delete: (id: string) =>
      fetcher<void>(`/api/services/${id}`, {
        method: 'DELETE',
      }),
  },
  appointments: {
    getAll: (params: {
      businessId?: string;
      staffId?: string;
      customerId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    } = {}) => {
      const searchParams = new URLSearchParams();
      if (params.businessId) searchParams.append('businessId', params.businessId);
      if (params.staffId) searchParams.append('staffId', params.staffId);
      if (params.customerId) searchParams.append('customerId', params.customerId);
      if (params.status) searchParams.append('status', params.status);
      if (params.startDate) searchParams.append('startDate', params.startDate);
      if (params.endDate) searchParams.append('endDate', params.endDate);

      const qs = searchParams.toString();
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
        method: 'PATCH',
      }),
    checkAvailability: (params: {
      businessId: string;
      staffId: string;
      startTime: string;
      durationMinutes?: number;
      endTime?: string;
      excludeAppointmentId?: string;
    }) => {
      const searchParams = new URLSearchParams();
      searchParams.append('businessId', params.businessId);
      searchParams.append('staffId', params.staffId);
      searchParams.append('startTime', params.startTime);
      if (params.durationMinutes) searchParams.append('durationMinutes', String(params.durationMinutes));
      if (params.endTime) searchParams.append('endTime', params.endTime);
      if (params.excludeAppointmentId) searchParams.append('excludeAppointmentId', params.excludeAppointmentId);

      return fetcher<AvailabilityCheckResult>(`/api/appointments/availability?${searchParams.toString()}`, {
        method: 'GET',
      });
    },
  },
  health: {
    check: () => fetcher<{ status: string; uptimeSeconds: number }>('/api/health', { method: 'GET' }),
  },
  ai: {
    conversation: (input: import('../types/conversation').ConversationRequestInput) =>
      fetcher<import('../types/conversation').ConversationResponseData>('/api/ai/conversation', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  },
};
