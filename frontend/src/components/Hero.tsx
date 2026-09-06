import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Mic, ShieldCheck, Clock, Building2, Bot, CalendarCheck, CheckCircle2 } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="relative pt-12 pb-20 md:pt-24 md:pb-32 overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-gradient-to-tr from-indigo-600/15 via-blue-500/10 to-purple-600/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-10 right-1/4 w-72 h-72 bg-blue-500/5 blur-[90px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        {/* Category Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-6 shadow-lg shadow-indigo-500/10 backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>Next-Generation Intelligent Front-Desk Automation</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1]">
          The Autonomous Voice Receptionist for <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
            Modern Businesses
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-slate-300 leading-relaxed font-normal">
          Provide human-like, 24/7 spoken customer intake. Answers caller inquiries, resolves calendar availability, and confirms bookings entirely in real-time.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/voice"
            className="inline-flex items-center space-x-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
          >
            <Mic className="w-4 h-4 text-white animate-pulse" />
            <span>Try Voice Receptionist</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700/80 hover:border-slate-600 shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <span>Open Business Portal</span>
          </Link>
        </div>

        {/* Live Assistant Mockup Showcase */}
        <div className="mt-14 max-w-3xl mx-auto rounded-2xl p-1 bg-gradient-to-b from-indigo-500/20 via-slate-800/40 to-transparent shadow-2xl">
          <div className="rounded-xl bg-slate-900/90 border border-slate-800/90 p-5 sm:p-7 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3.5 text-left">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm flex items-center space-x-2">
                    <span>Front-Desk Voice Agent</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1.5" />
                      Live Audio
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">Intelligent Scheduling & Inquiries</div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs font-medium text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                <CalendarCheck className="w-4 h-4 text-blue-400" />
                <span>Real-Time Calendar Sync</span>
              </div>
            </div>

            {/* Simulated Live Call Dialogue Snippet */}
            <div className="mt-5 space-y-3 text-left">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 flex-shrink-0 mt-0.5">
                  C
                </div>
                <div className="p-3 rounded-2xl rounded-tl-none bg-slate-800/60 border border-slate-700/50 text-xs text-slate-200 leading-relaxed max-w-md">
                  &ldquo;Hi, I&apos;d like to schedule a dental checkup for next Tuesday afternoon with Dr. Jenkins.&rdquo;
                </div>
              </div>

              <div className="flex items-start space-x-3 justify-end">
                <div className="p-3 rounded-2xl rounded-tr-none bg-indigo-600/20 border border-indigo-500/30 text-xs text-indigo-100 leading-relaxed max-w-md">
                  &ldquo;I have an opening with Dr. Sarah Jenkins on Tuesday at 2:00 PM. Would that work for you?&rdquo;
                </div>
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5">
                  AI
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Speech-to-Text • LLM Reasoning • Text-to-Speech</span>
              </div>
              <div className="font-mono text-[11px] text-slate-400">
                Avg. Latency: <span className="text-emerald-400 font-semibold">Sub-second</span>
              </div>
            </div>
          </div>
        </div>

        {/* Commercial Trust Pillars */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-slate-800/80">
          <div className="flex items-center justify-center space-x-3.5 p-4 rounded-xl bg-slate-900/60 border border-slate-800/60 shadow-sm">
            <Clock className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-200">24/7 Always Available</div>
              <div className="text-[11px] text-slate-400">Zero missed client calls or inquiries</div>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-3.5 p-4 rounded-xl bg-slate-900/60 border border-slate-800/60 shadow-sm">
            <ShieldCheck className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-200">Private & Sovereign</div>
              <div className="text-[11px] text-slate-400">Zero third-party audio transmission</div>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-3.5 p-4 rounded-xl bg-slate-900/60 border border-slate-800/60 shadow-sm">
            <Building2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-200">Multi-Business Architecture</div>
              <div className="text-[11px] text-slate-400">Isolated customer and appointment rosters</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
