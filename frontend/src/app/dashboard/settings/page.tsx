'use client';

import React from 'react';
import { Settings } from 'lucide-react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { PlaceholderPage } from '../../../components/dashboard/PlaceholderPage';

export default function SettingsPage() {
  return (
    <DashboardLayout title="System Settings">
      <PlaceholderPage
        title="Business & Account Settings"
        subtitle="Manage business profiles, notification webhooks, and operating hours."
        phase="Phase 6 (Admin Dashboard)"
        icon={Settings}
        description="Configure your business profile details, timezone parameters, operating hours, and multi-tenant preferences."
        upcomingFeatures={[
          'Business profile updates (name, contact email, phone, address, timezone)',
          'Operating schedule and holiday calendar configurations',
          'Webhook integrations for external notification channels',
          'Role-based security access management for team staff',
        ]}
      />
    </DashboardLayout>
  );
}
