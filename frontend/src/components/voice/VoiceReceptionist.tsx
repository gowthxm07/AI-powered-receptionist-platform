import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Keyboard,
  Send,
  X,
} from 'lucide-react';

export const VoiceReceptionist: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState<boolean>(true);
  const [businessesError, setBusinessesError] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [showTypeInput, setShowTypeInput] = useState<boolean>(false);
  const [typedText, setTypedText] = useState<string>('');

  const dialogueContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    uiState,
    session,
    dialogueTurns,
    lastMetrics,
    error,
    activeStep,
    appointmentConfirmed,
    confirmedDetails,
    isRecording,
    recordingDurationSec,
    isSecureContext,
    permissionState,
    diagnostics,
    speechDetected,
    volumeLevel,
    autoStopTriggered,
    autoStopEnabled,
    setAutoStopEnabled,
    silenceThresholdMs,
    setSilenceThresholdMs,
    startSession,
    startTalking,
    stopTalking,
    submitTypedTurn,
    endSession,
    resetSession,
  } = useVoiceSession();

  // Fetch public businesses for multi-tenant customer selection
  const loadBusinesses = useCallback(async () => {
    try {
      setIsLoadingBusinesses(true);
      setBusinessesError(null);
      const res = await api.businesses.getPublic();
      if (res.success && res.data && res.data.length > 0) {
        setBusinesses(res.data);
      } else {
        setBusinesses([]);
      }
    } catch (err: any) {
      setBusinesses([]);
      setBusinessesError(err.message || 'Unable to load available businesses.');
    } finally {
      setIsLoadingBusinesses(false);
    }
  }, []);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  const handleBusinessChange = (bizId: string) => {
    setSelectedBusinessId(bizId);
    setSelectedCustomerId('');
    setCustomers([]);
  };

  // Fetch customers when business changes (if authenticated)
  useEffect(() => {
    if (!selectedBusinessId) {
      setCustomers([]);
      return;
    }

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
          <span className="text-[10px] text-indigo-400 font-medium">Voice Reception</span>
        </div>

        <VoiceStatus state={uiState} speechDetected={speechDetected} />
      </header>

      {/* Main Interactive Body */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-6 flex flex-col justify-between gap-6">
        {/* Insecure Context Guidance Warning */}
        {!isSecureContext && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2.5 animate-fadeIn">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>Insecure HTTP Context Detected</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              Mobile browsers restrict microphone access to HTTPS origins or localhost. To connect over the local network, please navigate to:
            </p>
            <div className="p-2 rounded-xl bg-slate-950/80 border border-amber-500/20 font-mono text-[11px] text-amber-400 break-all select-all">
              https://{diagnostics?.host || '11.12.18.229:3000'}/voice
            </div>
          </div>
        )}

        {/* Business and Customer Selectors */}
        {!session ? (
          <div className="space-y-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Which business would you like to contact?</span>
            </div>

            {isLoadingBusinesses ? (
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-400 bg-slate-950/60 rounded-xl border border-slate-800">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Loading available businesses...</span>
              </div>
            ) : businessesError ? (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                  <span>{businessesError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => loadBusinesses()}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-lg transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            ) : businesses.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 text-center">
                No businesses are currently available for Voice Reception.
              </div>
            ) : (
              <select
                value={selectedBusinessId}
                onChange={(e) => handleBusinessChange(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select a Business</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 pt-1">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Caller Profile (Optional):</span>
            </div>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              disabled={!selectedBusinessId}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            >
              <option value="">Continue as Guest</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone || 'No phone'})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {/* If appointment is confirmed, show complete confirmation card */}
        {appointmentConfirmed ? (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-2xl space-y-6 text-center animate-fadeIn my-auto">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ✓ Appointment Confirmed!
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">Booking Complete</h2>
              <p className="text-xs text-slate-400">Your appointment has been saved in our system.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Service:</span>
                <span className="font-semibold text-slate-200">{confirmedDetails?.service || 'Appointment'}</span>
              </div>
              {confirmedDetails?.specialist && (
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Specialist:</span>
                  <span className="font-semibold text-slate-200">{confirmedDetails.specialist}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Date & Time:</span>
                <span className="font-semibold text-indigo-400">
                  {confirmedDetails?.date} at {confirmedDetails?.time}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-slate-200">{confirmedDetails?.customer || 'Valued Guest'}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-600"></span>
              <span>Call Ended</span>
            </div>

            <button
              onClick={() => resetSession()}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start New Voice Reception</span>
            </button>
          </div>
        ) : (
          <>
            {/* Center Animated Activity Visualizer */}
            <div className="flex flex-col items-center justify-center my-auto py-2">
              <VoiceActivityIndicator
                state={uiState}
                volumeLevel={volumeLevel}
                speechDetected={speechDetected}
              />

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
                      : !selectedBusinessId
                      ? 'Select a business to begin.'
                      : isSecureContext
                      ? `Ready to connect with ${selectedBusiness?.name}.`
                      : 'HTTPS connection required to start.'}
                  </p>
                )}
              </div>

              {/* Optional Typed Input for Sensitive Information (Name & Phone) */}
              {session && uiState !== 'ENDED' && (
                <div className="mt-4 w-full max-w-xs flex flex-col items-center gap-2">
                  {!showTypeInput ? (
                    <button
                      type="button"
                      onClick={() => setShowTypeInput(true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
                      <span>
                        {activeStep?.includes('PHONE')
                          ? 'Type phone number instead'
                          : activeStep?.includes('NAME')
                          ? 'Type name instead'
                          : 'Type instead'}
                      </span>
                    </button>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!typedText.trim()) return;
                        const t = typedText.trim();
                        setTypedText('');
                        setShowTypeInput(false);
                        await submitTypedTurn(t);
                      }}
                      className="w-full flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900 border border-indigo-500/40 shadow-xl animate-fadeIn"
                    >
                      <input
                        type="text"
                        value={typedText}
                        onChange={(e) => setTypedText(e.target.value)}
                        placeholder={
                          activeStep?.includes('PHONE')
                            ? 'Enter phone number...'
                            : activeStep?.includes('NAME')
                            ? 'Enter full name...'
                            : 'Type message...'
                        }
                        autoFocus
                        className="flex-1 px-2.5 py-1.5 text-xs bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!typedText.trim() || uiState === 'PROCESSING'}
                        className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors"
                        title="Send typed input"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTypeInput(false)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  )}
                </div>
              )}
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
              {/* Silence Auto-Stop Feature Toggle */}
              {session && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-xs">
                  <div className="flex flex-col">
                    <span className="text-slate-200 font-medium">Auto-Stop on Silence</span>
                    <span className="text-[10px] text-slate-400">
                      {autoStopEnabled ? `Stops after ${(silenceThresholdMs / 1000).toFixed(1)}s pause` : 'Manual push-to-talk only'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoStopEnabled(!autoStopEnabled)}
                    className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoStopEnabled ? 'bg-teal-500' : 'bg-slate-700'
                    }`}
                    role="switch"
                    aria-checked={autoStopEnabled}
                    aria-label="Toggle auto-stop on silence"
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        autoStopEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}

              <VoiceControlButton
                state={uiState}
                recordingDurationSec={recordingDurationSec}
                autoStopEnabled={autoStopEnabled}
                speechDetected={speechDetected}
                disabled={!selectedBusinessId || isLoadingBusinesses}
                onStartSession={() => startSession(selectedBusinessId, selectedCustomerId || undefined)}
                onStartTalking={startTalking}
                onStopTalking={stopTalking}
                onEndSession={endSession}
              />

              {/* Active Call Telemetry Accordion (Optional Inspection) */}
              {session && (
                <VoiceSessionInfo
                  session={session}
                  activeStep={activeStep}
                  metrics={lastMetrics}
                />
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="py-3 text-center text-[11px] text-slate-500 border-t border-slate-900/80">
        AI-Powered Smart Receptionist Platform
      </footer>
    </div>
  );
};
