export interface Business {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string | null;
  description?: string | null;
  timezone: string;
  ownerId?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    customers?: number;
    staff?: number;
    services?: number;
    appointments?: number;
    conversations?: number;
  };
}

export interface Customer {
  id: string;
  businessId?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  createdAt: string;
  updatedAt: string;
  business?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateCustomerInput {
  businessId?: string;
  name: string;
  phone: string;
  email?: string;
}

export interface UpdateCustomerInput {
  businessId?: string;
  name?: string;
  phone?: string;
  email?: string;
}

export interface Staff {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  business?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateStaffInput {
  businessId: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive?: boolean;
}

export interface UpdateStaffInput {
  businessId?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  business?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateServiceInput {
  businessId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  isActive?: boolean;
}

export interface UpdateServiceInput {
  businessId?: string;
  name?: string;
  description?: string;
  durationMinutes?: number;
  isActive?: boolean;
}

export interface DashboardStats {
  totalCustomers: number;
  activeStaff: number;
  totalStaff: number;
  availableServices: number;
  totalServices: number;
  upcomingAppointments: number | null; // null indicates Phase 4 module
}
