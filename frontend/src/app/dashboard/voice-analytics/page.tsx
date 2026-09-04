'use client';

import React from 'react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { BusinessSelector } from '../../../components/dashboard/BusinessSelector';
import { VoiceAnalyticsDashboard } from '../../../components/dashboard/voice-analytics/VoiceAnalyticsDashboard';

export default function VoiceAnalyticsPage() {
  return (
    <DashboardLayout title="Voice Analytics" businessSelector={<BusinessSelector />}>
      <VoiceAnalyticsDashboard />
    </DashboardLayout>
  );
}
