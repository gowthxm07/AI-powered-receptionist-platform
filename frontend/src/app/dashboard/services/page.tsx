'use client';

import React from 'react';
import { Briefcase } from 'lucide-react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { PlaceholderPage } from '../../../components/dashboard/PlaceholderPage';

export default function ServicesPage() {
  return (
    <DashboardLayout title="Services Catalog">
      <PlaceholderPage
        title="Bookable Services Catalog"
        subtitle="Define service offerings, appointment durations, and pricing guidelines."
        phase="Phase 6 (Admin Dashboard)"
        icon={Briefcase}
        description="Services are structured with precise minute durations to enable accurate calendar slot computation by the autonomous AI receptionist. Full catalog management will be available in Phase 6."
        upcomingFeatures={[
          'Service catalog creation with custom durations and categories',
          'Service-to-staff qualification mappings',
          'Buffer time and preparation window configurations',
          'Dynamic service FAQ injection for the AI receptionist prompt context',
        ]}
      />
    </DashboardLayout>
  );
}
