'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Terminal, 
  Clock, 
  Server, 
  AlertTriangle 
} from 'lucide-react';

interface HealthApiResponse {
  success: boolean;
  message: string;
  data?: {
    status: string;
    uptimeSeconds: number;
    timestamp: string;
    environment: string;
    version: string;
  };
}

export const SystemStatus: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [response, setResponse] = useState<HealthApiResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const checkHealth = async () => {
    setStatus('loading');
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const res = await fetch(`${apiUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      setCheckedAt(new Date().toLocaleTimeString());

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
      }

      const json: HealthApiResponse = await res.json();
      setResponse(json);
      setStatus('success');
    } catch (err: unknown) {
      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      setCheckedAt(new Date().toLocaleTimeString());
      setStatus('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to connect to backend server. Make sure the backend is running.'
      );
      setResponse(null);
    }
  };

  // Perform an initial health check on component mount
  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <section id="system-status" className="py-12 bg-slate-900/60 border-y border-slate-800 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <h2 className="text-2xl font-bold text-white tracking-tight">Full-Stack System Health</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Real-time verification of frontend-to-backend API connectivity via Express and Next.js.
            </p>
          </div>

          <button
            onClick={checkHealth}
            disabled={status === 'loading'}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-semibold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
            <span>{status === 'loading' ? 'Checking...' : 'Check System Status'}</span>
          </button>
        </div>

        {/* Status Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Status Indicator */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Backend Status
            </span>
            <div className="flex items-center space-x-3 my-2">
              {status === 'loading' && (
                <>
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-lg font-bold text-amber-300">Pinging API...</span>
                </>
              )}
              {status === 'success' && (
                <>
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <span className="text-lg font-bold text-emerald-300">Online & Healthy</span>
                </>
              )}
              {status === 'error' && (
                <>
                  <XCircle className="w-6 h-6 text-rose-400" />
                  <span className="text-lg font-bold text-rose-300">Offline / Unreachable</span>
                </>
              )}
              {status === 'idle' && (
                <>
                  <div className="w-3.5 h-3.5 rounded-full bg-slate-500" />
                  <span className="text-lg font-bold text-slate-300">Ready to Check</span>
                </>
              )}
            </div>
            <span className="text-xs text-slate-400">
              {checkedAt ? `Last verified: ${checkedAt}` : 'Awaiting check'}
            </span>
          </div>

          {/* Endpoint Info */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Target API Endpoint
            </span>
            <div className="my-2">
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-1">
                GET
              </span>
              <div className="font-mono text-xs text-slate-200 truncate">{apiUrl}/api/health</div>
            </div>
            <span className="text-xs text-slate-400 flex items-center space-x-1">
              <Server className="w-3.5 h-3.5 text-slate-400 inline" />
              <span>Port: 5000 (Express API)</span>
            </span>
          </div>

          {/* Latency & Protocol */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Network Response Time
            </span>
            <div className="my-2 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white">
                {latency !== null ? `${latency}` : '--'}
              </span>
              <span className="text-sm font-medium text-slate-400">ms</span>
            </div>
            <span className="text-xs text-slate-400 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-slate-400 inline" />
              <span>CORS: Enabled (Localhost:3000)</span>
            </span>
          </div>
        </div>

        {/* Response / Diagnostic Terminal */}
        <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl">
          <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-mono text-slate-300">api_response_payload.json</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {status === 'success' ? 'HTTP 200 OK' : status === 'error' ? 'CONNECTION ERROR' : 'IDLE'}
            </span>
          </div>

          <div className="p-4 font-mono text-xs overflow-x-auto text-slate-300 leading-relaxed min-h-[120px] flex flex-col justify-center">
            {status === 'loading' && (
              <div className="text-slate-400 animate-pulse">
                Fetching data from {apiUrl}/api/health...
              </div>
            )}

            {status === 'success' && response && (
              <pre className="text-emerald-300">
                {JSON.stringify(response, null, 2)}
              </pre>
            )}

            {status === 'error' && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-rose-400 font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Connection Failed: {errorMessage}</span>
                </div>
                <div className="text-slate-400 text-[11px] pt-1 border-t border-slate-900">
                  Tip: Start the backend server using <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">npm --prefix backend run dev</code> in a terminal.
                </div>
              </div>
            )}

            {status === 'idle' && (
              <div className="text-slate-500">
                Click &quot;Check System Status&quot; above to initiate live API diagnostic.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
