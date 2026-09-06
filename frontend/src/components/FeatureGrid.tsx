import React from 'react';
import { 
  Bot, 
  Calendar, 
  Users, 
  Mic,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Zap,
  BarChart3,
  Clock
} from 'lucide-react';

interface FeatureCard {
  title: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  highlights: string[];
  gradient: string;
  accentColor: string;
}

export const FeatureGrid: React.FC = () => {
  const features: FeatureCard[] = [
    {
      title: 'Autonomous AI Voice Receptionist',
      category: 'Voice Intake',
      description: 'Handles incoming caller inquiries with conversational comprehension, voice activity detection, and human-sounding speech.',
      icon: Bot,
      highlights: ['Local Speech-to-Text', 'Intent Extraction', 'Real-Time TTS'],
      gradient: 'from-blue-500/10 via-slate-900/60 to-slate-950',
      accentColor: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
    },
    {
      title: 'Conflict-Free Smart Scheduling',
      category: 'Calendar Engine',
      description: 'Finds available openings across multiple practitioners, books appointments, and ensures zero overlapping reservations.',
      icon: Calendar,
      highlights: ['Instant Slot Discovery', 'Overbooking Guard', 'Automatic Reschedule'],
      gradient: 'from-purple-500/10 via-slate-900/60 to-slate-950',
      accentColor: 'text-purple-400 border-purple-500/20 bg-purple-500/10',
    },
    {
      title: 'Customer Directory & Profiling',
      category: 'Caller CRM',
      description: 'Maintains comprehensive caller profiles, past appointment histories, and contact records organized by business workspace.',
      icon: Users,
      highlights: ['Caller Recognition', 'Booking Timeline', 'Multi-Tenant Scoping'],
      gradient: 'from-emerald-500/10 via-slate-900/60 to-slate-950',
      accentColor: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
    },
    {
      title: 'Real-Time Conversational Analytics',
      category: 'Operations & Insights',
      description: 'Analyze call volumes, spoken conversation turns, booking conversion rates, and audio pipeline latency baselines.',
      icon: BarChart3,
      highlights: ['Conversion Tracking', 'Turn Breakdown', 'Latency Telemetry'],
      gradient: 'from-amber-500/10 via-slate-900/60 to-slate-950',
      accentColor: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
    },
  ];

  return (
    <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-indigo-400 mb-3 shadow-inner">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Complete Front-Desk Suite</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
          Everything Your Front Desk Needs
        </h2>
        <p className="mt-4 text-slate-400 text-sm sm:text-base leading-relaxed">
          Replaces fragmented answering services and voicemail with an integrated, intelligent voice intake and booking platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className={`relative group p-7 rounded-2xl bg-gradient-to-br ${feature.gradient} border border-slate-800/80 hover:border-slate-700/80 transition-all duration-300 flex flex-col justify-between hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-1`}
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-indigo-400 group-hover:text-indigo-300 group-hover:scale-105 transition-all shadow-inner">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${feature.accentColor}`}>
                    {feature.category}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2.5 group-hover:text-indigo-200 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  {feature.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80">
                <div className="flex flex-wrap gap-2">
                  {feature.highlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs bg-slate-800/70 text-slate-300 border border-slate-700/50"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 mr-1.5 flex-shrink-0" />
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
