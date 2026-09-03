import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useVoiceSession } from '../../hooks/useVoiceSession';
import { VoiceStatus } from './VoiceStatus';
import { VoiceActivityIndicator } from './VoiceActivityIndicator';
import { VoiceControlButton } from './VoiceControlButton';
import { VoiceSessionInfo } from './VoiceSessionInfo';
import { api } from '../../lib/api';
import { Business, Customer } from '../../types/dashboard';
import {
  ArrowLeft,
  Building2,
  User,
  AlertCircle,
  Volume2,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

export const VoiceReceptionist: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState<boolean>(true);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

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
    isSecureContext,
    permissionState,
    diagnostics,
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
        {/* Insecure Context Guidance Warning */}
        {!isSecureContext && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2.5 animate-fadeIn">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>HTTPS Connection Required for Microphone</span>
            </div>
            <p className="text-amber-200/90 leading-relaxed text-[11px]">
              Android Chrome and iOS Safari require a secure context (HTTPS) to grant microphone permissions when accessing over a local Wi-Fi IP.
            </p>
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/20 text-[11px] font-mono space-y-1">
              <div className="text-slate-400 font-sans font-medium text-[10px] uppercase tracking-wider">Recommended Access URL:</div>
              <div className="text-emerald-400 select-all font-semibold">
                https://{typeof window !== 'undefined' ? window.location.host : '11.12.18.229:3000'}/voice
              </div>
            </div>
            <p className="text-slate-400 text-[10px] leading-relaxed">
              When loading via HTTPS on your phone, tap <span className="text-slate-300 font-medium">Advanced &rarr; Proceed to site</span> to accept the local dev certificate.
            </p>
          </div>
        )}

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
                  : isSecureContext
                  ? 'Press Start Voice Call to connect.'
                  : 'HTTPS connection required to start.'}
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

          {/* Safe Diagnostics Toggle */}
          <div className="border-t border-slate-900 pt-2">
            <button
              onClick={() => setShowDiagnostics((prev) => !prev)}
              className="w-full py-1 text-[11px] text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 transition-colors"
            >
              <Info className="w-3 h-3" />
              <span>{showDiagnostics ? 'Hide Client Diagnostics' : 'View Client Diagnostics'}</span>
              {showDiagnostics ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showDiagnostics && diagnostics && (
              <div className="mt-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[10px] space-y-1 font-mono text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Origin:</span>
                  <span className="text-slate-200 truncate max-w-[200px]">{diagnostics.origin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">API Base Routing:</span>
                  <span className="text-emerald-400 font-bold">{diagnostics.apiBaseUrl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Session Endpoint:</span>
                  <span className="text-indigo-400 font-bold truncate max-w-[200px]">{diagnostics.sessionEndpoint}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Protocol:</span>
                  <span className={diagnostics.protocol === 'https:' ? 'text-emerald-400' : 'text-amber-400'}>
                    {diagnostics.protocol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Secure Context:</span>
                  <span className={diagnostics.isSecureContext ? 'text-emerald-400' : 'text-rose-400'}>
                    {diagnostics.isSecureContext ? 'true (Secure)' : 'false (Insecure)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">MediaDevices API:</span>
                  <span className={diagnostics.hasMediaDevices ? 'text-emerald-400' : 'text-rose-400'}>
                    {diagnostics.hasMediaDevices ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">getUserMedia:</span>
                  <span className={diagnostics.hasGetUserMedia ? 'text-emerald-400' : 'text-rose-400'}>
                    {diagnostics.hasGetUserMedia ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">MediaRecorder:</span>
                  <span className={diagnostics.hasMediaRecorder ? 'text-emerald-400' : 'text-rose-400'}>
                    {diagnostics.hasMediaRecorder ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Supported MIME:</span>
                  <span className="text-indigo-400">{diagnostics.supportedMimeType || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Permission State:</span>
                  <span className="text-slate-300">{permissionState}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="py-2 text-center text-[10px] text-slate-600 border-t border-slate-900">
        AI-Powered Smart Receptionist Platform • Local Offline Voice Transport
      </footer>
    </div>
  );
};
