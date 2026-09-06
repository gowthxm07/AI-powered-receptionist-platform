import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Mic, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const CallToAction: React.FC = () => {
  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      <div className="relative rounded-3xl overflow-hidden p-8 sm:p-14 border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 via-slate-900/90 to-slate-950 shadow-2xl">
        {/* Glow backdrop inside container */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-900/40 border border-indigo-500/40 text-indigo-300 text-xs font-semibold mb-6 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ready for Front-Desk Transformation</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Automate Your Customer Inquiries & Appointments Today
          </h2>

          <p className="mt-4 text-slate-300 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            Experience real-time voice intake powered by private, on-device AI. Zero cloud telephony subscriptions, zero double bookings.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center space-x-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <span>Get Started with Your Business</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/voice"
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700/80 hover:border-slate-600 shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <Mic className="w-4 h-4 text-indigo-400" />
              <span>Try Live Voice Demo</span>
            </Link>
          </div>

          <div className="mt-10 pt-8 border-t border-indigo-500/20 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Multi-Tenant Business Isolation</span>
            </span>
            <span className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>100% Private Local Audio</span>
            </span>
            <span className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              <span>Instant Appointment Booking</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
