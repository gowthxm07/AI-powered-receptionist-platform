'use client';

import React from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { BusinessSelector } from '../../components/dashboard/BusinessSelector';
import { DashboardOverview } from '../../components/dashboard/DashboardOverview';

export default function DashboardPage() {
  return (
    <DashboardLayout title="Overview" businessSelector={<BusinessSelector />}>
      <DashboardOverview />
    </DashboardLayout>
  );
}
