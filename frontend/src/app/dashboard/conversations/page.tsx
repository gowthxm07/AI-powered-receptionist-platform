'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { PlaceholderPage } from '../../../components/dashboard/PlaceholderPage';

export default function ConversationsPage() {
  return (
    <DashboardLayout title="Call & Chat Logs">
      <PlaceholderPage
        title="Conversation Transcripts & AI Summaries"
        subtitle="Review caller interactions, message logs, and AI-generated summaries."
        phase="Phase 4 (Local AI & Tool Calling)"
        icon={MessageSquare}
        description="Every caller interaction over web chat or telephone is modeled as a persistent conversation thread with role-tagged messages and automated intent extraction. Full session playback will launch in Phase 4."
        upcomingFeatures={[
          'Complete turn-by-turn dialogue transcripts with timestamp markers',
          'AI-generated conversation summaries and caller sentiment analysis',
          'Searchable knowledge extraction and caller inquiry categorization',
          'Live conversation monitor with human takeover / escalation flags',
        ]}
      />
    </DashboardLayout>
  );
}
