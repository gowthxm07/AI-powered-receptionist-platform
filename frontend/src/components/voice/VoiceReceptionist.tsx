import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useVoiceSession } from '../../hooks/useVoiceSession';
import { VoiceStatus } from './VoiceStatus';
import { VoiceActivityIndicator } from './VoiceActivityIndicator';
import { VoiceControlButton } from './VoiceControlButton';
import { VoiceSessionInfo } from './VoiceSessionInfo';
import { api } from '../../lib/api';
import { Business, Customer } from '../../types/dashboard';
import { ArrowLeft, Building2, User, AlertCircle, Volume2 } from 'lucide-react';

export const VoiceReceptionist: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState<boolean>(true);

  const dialogueContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    uiState,
    session,
    dialogueTurns,
    lastMetrics,
    error,
    activeStep,
    isRecording,
    recordingDurationSec,
    startSession,
    startTalking,
    stopTalking,
    endSession,
  } = useVoiceSession();

  // Fetch businesses for multi-tenant selection
  useEffect(() => {
    async function loadBusinesses() {
      try {
        setIsLoadingBusinesses(true);
        const res = await api.businesses.getAll();
        if (res.success && res.data && res.data.length > 0) {
          setBusinesses(res.data);
          setSelectedBusinessId(res.data[0].id);
        }
      } catch {
        // Fallback demo business
        setBusinesses([
          {
            id: 'b0000001-0000-0000-0000-000000000001',
            name: 'Lumina Dental Care',
            phone: '+1-555-0100',
            email: 'info@luminadental.com',
            timezone: 'America/New_York',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
        setSelectedBusinessId('b0000001-0000-0000-0000-000000000001');
      } finally {
        setIsLoadingBusinesses(false);
      }
    }

    loadBusinesses();
  }, []);

  // Fetch customers when business changes
  useEffect(() => {
    if (!selectedBusinessId) return;

    async function loadCustomers() {
      try {
        const res = await api.customers.getAll(selectedBusinessId);
        if (res.success && res.data) {
          setCustomers(res.data);
        }
      } catch {
        setCustomers([]);
      }
    }

    loadCustomers();
  }, [selectedBusinessId]);

  // Auto-scroll dialogue container
  useEffect(() => {
    if (dialogueContainerRef.current) {
      dialogueContainerRef.current.scrollTop = dialogueContainerRef.current.scrollHeight;
    }
  }, [dialogueTurns]);

  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId);
  const latestTurn = dialogueTurns[dialogueTurns.length - 1];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Mobile App Bar */}
      <header className="px-4 py-3 border-b border-slate-900 bg-slate-950/90 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors flex items-center gap-1.5 text-xs font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>

        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-slate-200 tracking-tight">
            {selectedBusiness?.name || 'Smart Receptionist'}
          </span>
          <span className="text-[10px] text-indigo-400 font-medium">Mobile Voice AI</span>
        </div>

        <VoiceStatus state={uiState} />
      </header>

      {/* Main Interactive Body */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-6 flex flex-col justify-between gap-6">
        {/* Business & Caller Context Selector (Visible before call starts) */}
        {uiState === 'IDLE' || uiState === 'ENDED' || uiState === 'ERROR' ? (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>Select Tenant Business</span>
            </div>

            <select
              value={selectedBusinessId}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
              disabled={isLoadingBusinesses}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {businesses.map((biz) => (
                <option key={biz.id} value={biz.id}>
                  {biz.name}
                </option>
              ))}
            </select>

            <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2 text-xs font-semibold text-slate-300">
              <User className="w-4 h-4 text-emerald-400" />
              <span>Caller Profile</span>
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">Guest Caller (Anonymous)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone || 'No phone'})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {/* Center Animated Activity Visualizer */}
        <div className="flex flex-col items-center justify-center my-auto py-2">
          <VoiceActivityIndicator state={uiState} />

          {/* Current Spoken Speech Bubble */}
          <div className="mt-6 w-full text-center px-2 min-h-[72px] flex items-center justify-center">
            {latestTurn ? (
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed max-w-sm transition-all shadow-lg ${
                  latestTurn.speaker === 'assistant'
                    ? 'bg-gradient-to-tr from-slate-900 to-slate-800/90 border border-slate-700/80 text-slate-100 font-medium'
                    : 'bg-indigo-600/15 border border-indigo-500/30 text-indigo-200 italic'
                }`}
              >
                {latestTurn.speaker === 'assistant' && (
                  <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-indigo-400 mb-1">
                    <Volume2 className="w-3 h-3" />
                    <span>AI Receptionist</span>
                  </div>
                )}
                <span>&ldquo;{latestTurn.text}&rdquo;</span>
              </div>
            ) : (
              <p className="text-slate-400 text-xs">
                {uiState === 'READY'
                  ? 'Tap the microphone and speak naturally.'
                  : 'Press Start Voice Call to connect.'}
              </p>
            )}
          </div>
        </div>

        {/* Error Alert Display */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Notice:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="space-y-4">
          <VoiceControlButton
            state={uiState}
            recordingDurationSec={recordingDurationSec}
            onStartSession={() => startSession(selectedBusinessId, selectedCustomerId || undefined)}
            onStartTalking={startTalking}
            onStopTalking={stopTalking}
            onEndSession={endSession}
          />

          {/* Technical Telemetry Collapsible Panel */}
          {session && (
            <VoiceSessionInfo
              session={session}
              activeStep={activeStep}
              metrics={lastMetrics}
            />
          )}
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="py-2 text-center text-[10px] text-slate-600 border-t border-slate-900">
        AI-Powered Smart Receptionist Platform • Local Offline Voice Transport
      </footer>
    </div>
  );
};
