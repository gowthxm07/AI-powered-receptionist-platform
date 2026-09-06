import React from 'react';
import { 
  Sparkles, 
  Clock, 
  TrendingUp, 
  ShieldCheck, 
  Layers, 
  CheckCircle2, 
  ArrowUpRight 
} from 'lucide-react';
import Link from 'next/link';

export const BenefitsSection: React.FC = () => {
  const benefits = [
    {
      icon: Clock,
      title: '24/7 Unattended Reception',
      stat: '100% Intake',
      statLabel: 'After-Hours Coverage',
      description: 'Your front desk never sleeps. Whether callers reach out at midnight or on holidays, every inquiry is answered promptly with polite, human-like voice dialogue.',
      accent: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      icon: TrendingUp,
      title: 'Eliminate Missed Bookings',
      stat: '0%',
      statLabel: 'Lost Caller Leads',
      description: 'Traditional voicemail leads to lost customers. The AI receptionist captures caller intent and books confirmed slots directly into PostgreSQL on the spot.',
      accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      icon: ShieldCheck,
      title: 'Complete Data Sovereignty',
      stat: 'Private',
      statLabel: 'On-Premises / Local AI',
      description: 'Sensitive client conversations and contact info are processed on-device. No customer audio is sent to third-party cloud speech providers.',
      accent: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      icon: Layers,
      title: 'Multi-Tenant Architecture',
      stat: 'Isolated',
      statLabel: 'Business Workspaces',
      description: 'Host multiple branches, clinics, or practices on a single platform. Every business maintains its own staff, services, and appointment calendar.',
      accent: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
  ];

  return (
    <section id="benefits" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-indigo-400 mb-3 shadow-inner">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Commercial Value</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
          Designed for Front-Desk Excellence
        </h2>
        <p className="mt-4 text-slate-400 text-sm sm:text-base leading-relaxed">
          Scale your customer service operations without multiplying staffing overhead or missing valuable appointments.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {benefits.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <div
              key={benefit.title}
              className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/5"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${benefit.accent} shadow-inner`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-white tracking-tight font-mono">
                      {benefit.stat}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      {benefit.statLabel}
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-200 transition-colors">
                  {benefit.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  {benefit.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center space-x-1.5 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Enterprise production grade</span>
                </span>
                <Link
                  href="/voice"
                  className="inline-flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  <span>Experience Voice</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
