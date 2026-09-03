'use client';

import React from 'react';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { ConversationConsole } from '../../components/receptionist';

export default function ReceptionistDirectPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout title="AI Receptionist Console">
        <ConversationConsole />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
