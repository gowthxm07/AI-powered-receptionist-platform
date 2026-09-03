'use client';

import React from 'react';
import { Bot } from 'lucide-react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { PlaceholderPage } from '../../../components/dashboard/PlaceholderPage';

export default function AIReceptionistPage() {
  return (
    <DashboardLayout title="AI Receptionist Engine">
      <PlaceholderPage
        title="Autonomous AI Receptionist Agent"
        subtitle="Configure receptionist persona, prompt guidelines, and voice pipeline."
        phase="Phase 4 & Phase 5 (AI & Voice Pipelines)"
        icon={Bot}
        description="The platform will use local, open-source AI (Ollama local LLMs, Whisper STT, and Piper TTS) providing ultra-low response latency without any paid cloud dependencies or third-party subscriptions."
        upcomingFeatures={[
          'Receptionist tone and greeting customization per business',
          'Local LLM model selection and temperature configuration via Ollama',
          'Zero-cost local Whisper STT & Piper TTS voice streaming pipeline',
          'Sub-second latency performance profiling and voice test simulator',
        ]}
      />
    </DashboardLayout>
  );
}
