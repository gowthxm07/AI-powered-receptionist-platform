'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { PlaceholderPage } from '../../../components/dashboard/PlaceholderPage';

export default function CustomersPage() {
  return (
    <DashboardLayout title="Customer Directory">
      <PlaceholderPage
        title="Customer Directory & Profiles"
        subtitle="Manage client history, contact channels, and appointment records."
        phase="Phase 6 (Admin Dashboard)"
        icon={Users}
        description="The customer data layer is secured in PostgreSQL with per-business data isolation. Full frontend management UI including client search, filtering, detailed contact profiles, and appointment timelines will be integrated in Phase 6."
        upcomingFeatures={[
          'Real-time customer search by name, phone, or email',
          'Detailed customer profile view with interaction histories',
          'Automated caller ID recognition during live receptionist dialogues',
          'CSV and customer record export capabilities',
        ]}
      />
    </DashboardLayout>
  );
}
