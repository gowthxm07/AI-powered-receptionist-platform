'use client';

import React from 'react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { ConversationConsole } from '../../../components/receptionist';

export default function AIReceptionistPage() {
  return (
    <DashboardLayout title="AI Receptionist Console">
      <ConversationConsole />
    </DashboardLayout>
  );
}
