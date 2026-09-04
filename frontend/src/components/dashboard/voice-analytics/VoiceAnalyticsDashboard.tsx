'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../../context/BusinessContext';
import { api } from '../../../lib/api';
import {
  VoiceAnalyticsSummary,
  VoiceSessionRecord,
  ActiveVoiceSession,
} from '../../../types/analytics';
import {
  PhoneCall,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
  CalendarCheck,
  TrendingUp,
  RefreshCw,
  Radio,
  Zap,
  Cpu,
  Mic,
  Volume2,
} from 'lucide-react';

export const VoiceAnalyticsDashboard: React.FC = () => {
  const { selectedBusiness, loading: loadingBiz } = useBusiness();
  const [summary, setSummary] = useState<VoiceAnalyticsSummary | null>(null);
  const [sessions, setSessions] = useState<VoiceSessionRecord[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveVoiceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    setError(null);

    try {
      const [sumRes, sessRes, actRes] = await Promise.all([
        api.analytics.getVoiceSummary(selectedBusiness.id),
        api.analytics.getVoiceSessions(selectedBusiness.id, { limit: 20 }),
        api.analytics.getActiveSessions(selectedBusiness.id),
      ]);

      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data);
      }
      if (sessRes.success && sessRes.data) {
        setSessions(sessRes.data);
      }
      if (actRes.success && actRes.data) {
        setActiveSessions(actRes.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load voice analytics data');
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatDuration = (ms: number | null | undefined): string => {
    if (ms === null || ms === undefined || ms <= 0) return '0s';
    const totalSec = Math.round(ms / 1000);
    if (totalSec < 60) return `${totalSec}s`;
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}m ${sec}s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            <Radio className="w-3 h-3 mr-1" />
            In Progress
          </span>
        );
      case 'ENDED_BY_USER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/20">
            Ended by Caller
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Timed Out
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
            {status}
          </span>
        );
    }
  };

  if (loadingBiz) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading tenant context...</span>
      </div>
    );
  }

  if (!selectedBusiness) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-white">No Business Selected</h3>
        <p className="text-sm mt-1">Please select a business from the top bar to view voice session analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/30 via-indigo-900/30 to-purple-900/20 border border-indigo-500/20 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-2">
              <Activity className="w-3.5 h-3.5" />
              <span>Voice Observability & Telemetry</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Voice Session Analytics
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              Real-time monitoring, conversational lifecycle telemetry, and booking conversion tracking for{' '}
              <span className="font-semibold text-white">{selectedBusiness.name}</span>.
            </p>
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="self-start sm:self-auto inline-flex items-center px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sessions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Total Voice Calls</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {summary?.totalVoiceSessions ?? 0}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span className="text-emerald-400 font-semibold">{summary?.completedSessions ?? 0} completed</span>
            <span>•</span>
            <span className="text-rose-400">{summary?.errorSessions ?? 0} errors</span>
          </div>
        </div>

        {/* Total Spoken Turns */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Spoken Turns Processed</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {summary?.totalVoiceTurns ?? 0}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Avg {summary?.averageTurnsPerSession ?? 0} turns per conversation
          </div>
        </div>

        {/* Appointments Booked */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Appointments Booked</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">
            {summary?.appointmentsBooked ?? 0}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Confirmed via voice state machine
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Booking Conversion Rate</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-purple-400">
            {summary?.bookingConversionRate ?? 0}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Avg call length: {formatDuration(summary?.averageSessionDurationMs)}
          </div>
        </div>
      </div>

      {/* Performance Latency Telemetry Cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
            Speech & AI Pipeline Latency Telemetry (Averages)
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Whisper STT Latency</div>
              <div className="text-lg font-bold text-white mt-0.5">
                {summary?.averageSttLatencyMs ? `${summary.averageSttLatencyMs} ms` : '—'}
              </div>
              <div className="text-[11px] text-slate-500">whisper.cpp tiny.en</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-violet-500/10 text-violet-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">AI Engine / Router Latency</div>
              <div className="text-lg font-bold text-white mt-0.5">
                {summary?.averageConversationLatencyMs ? `${summary.averageConversationLatencyMs} ms` : '—'}
              </div>
              <div className="text-[11px] text-slate-500">FastIntentRouter & Tools</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Piper Neural TTS Latency</div>
              <div className="text-lg font-bold text-white mt-0.5">
                {summary?.averageTtsLatencyMs ? `${summary.averageTtsLatencyMs} ms` : '—'}
              </div>
              <div className="text-[11px] text-slate-500">lessac-medium ONNX</div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Active Voice Calls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h2 className="text-base font-bold text-white">Live Active Voice Calls</h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {activeSessions.length} active right now
          </span>
        </div>

        {activeSessions.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
            No voice calls currently connected. Start a call from the mobile voice receptionist to see live telemetry.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeSessions.map((act) => (
              <div
                key={act.transportSessionId}
                className="p-4 rounded-xl bg-slate-950/60 border border-emerald-500/30 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>{act.customerName || 'Walk-in / Mobile Caller'}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      {act.state}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    Session: {act.transportSessionId}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div className="font-bold text-white">{act.turnCount} turns</div>
                  <div className="text-[11px] text-slate-500">
                    Started {new Date(act.startedAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Voice Sessions Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Recent Voice Receptionist Sessions</h2>
          <span className="text-xs text-slate-400 font-medium">Last 20 sessions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Started</th>
                <th className="px-4 py-3">Caller</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Turns</th>
                <th className="px-4 py-3">Appointment Booked</th>
                <th className="px-4 py-3 text-right">Avg Turn Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    No voice sessions recorded yet for this business.
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3.5 text-slate-300 whitespace-nowrap">
                      {new Date(sess.startedAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-white whitespace-nowrap">
                      {sess.customerName || 'Mobile Caller'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getStatusBadge(sess.status)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{formatDuration(sess.durationMs)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300 whitespace-nowrap">
                      <span className="font-semibold text-white">{sess.turnCount}</span>
                      <span className="text-slate-500 text-[11px] ml-1">
                        ({sess.successfulTranscriptionCount} ok / {sess.failedTranscriptionCount} fail)
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {sess.appointmentBooked ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Confirmed Booked
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Inquiry / Unbooked</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-300 whitespace-nowrap">
                      {sess.totalLatencyMs ? `${Math.round(sess.totalLatencyMs)} ms` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
