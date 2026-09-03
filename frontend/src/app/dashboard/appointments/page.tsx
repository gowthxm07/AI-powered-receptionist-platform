'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { PlaceholderPage } from '../../../components/dashboard/PlaceholderPage';

export default function AppointmentsPage() {
  return (
    <DashboardLayout title="Appointment Scheduling">
      <PlaceholderPage
        title="Appointment Calendar & Bookings"
        subtitle="Manage calendar slots, confirmations, and automated AI bookings."
        phase="Phase 4 (Local AI & Tool Calling)"
        icon={Calendar}
        description="The appointment engine is designed for direct autonomous function-calling by the AI receptionist. In Phase 4, the AI agent will query available slots and book appointments in real time during live voice/chat sessions."
        upcomingFeatures={[
          'Interactive weekly and monthly calendar views',
          'Autonomous AI receptionist slot-locking via tool calling',
          'Automated appointment statuses (Scheduled, Confirmed, Completed, Cancelled)',
          'Customer confirmation notifications and reschedule handling',
        ]}
      />
    </DashboardLayout>
  );
}
