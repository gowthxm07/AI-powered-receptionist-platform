'use client';

import React from 'react';
import { UserCheck } from 'lucide-react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { PlaceholderPage } from '../../../components/dashboard/PlaceholderPage';

export default function StaffPage() {
  return (
    <DashboardLayout title="Staff Roster">
      <PlaceholderPage
        title="Staff & Specialist Roster"
        subtitle="Configure team members, operating roles, and appointment availability."
        phase="Phase 6 (Admin Dashboard)"
        icon={UserCheck}
        description="The staff data model supports industry-agnostic team management with role assignments and active availability flags. In Phase 6, you will be able to assign staff to specific service offerings and calendars."
        upcomingFeatures={[
          'Team member onboarding, roles, and department assignments',
          'Individual working hours, breaks, and vacation schedules',
          'Automated AI scheduling conflict prevention per staff member',
          'Staff performance and appointment completion metrics',
        ]}
      />
    </DashboardLayout>
  );
}
