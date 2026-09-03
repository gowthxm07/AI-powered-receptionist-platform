'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  phase: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  upcomingFeatures: string[];
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  subtitle,
  phase,
  icon: Icon,
  description,
  upcomingFeatures,
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center space-x-2 text-xs font-medium text-slate-400 hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard Overview</span>
        </Link>
      </div>

      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Icon className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
                <Clock className="w-3 h-3" />
                <span>Scheduled for {phase}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{title}</h2>
              <p className="text-slate-300 text-xs sm:text-sm max-w-xl">{subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Details Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase">
            <Sparkles className="w-4 h-4" />
            <span>Architecture & Roadmap Status</span>
          </div>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{description}</p>

          <div className="pt-2">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Key Capabilities in Development:
            </h4>
            <ul className="space-y-2">
              {upcomingFeatures.map((feat, i) => (
                <li key={i} className="flex items-start space-x-2.5 text-xs text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0"></span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Informational Side Card */}
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-200">Backend Readiness</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Database schema models, Prisma migrations, and secured REST endpoints with multi-tenant data isolation are already in place and tested.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <Link
              href="/dashboard"
              className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              <span>Return to Overview</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
