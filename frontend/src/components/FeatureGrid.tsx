import React from 'react';
import { 
  Bot, 
  Calendar, 
  Users, 
  Mic,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface FeatureCard {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  highlights: string[];
  gradient: string;
}

export const FeatureGrid: React.FC = () => {
  const features: FeatureCard[] = [
    {
      title: 'AI Receptionist',
      description: 'Automatically handle incoming customer inquiries with natural conversational understanding and human-like dialogue.',
      icon: Bot,
      highlights: ['Natural Dialogue', 'Intent Understanding', 'Knowledge Retrieval'],
      gradient: 'from-blue-500/20 to-indigo-500/5',
    },
    {
      title: 'Smart Appointments',
      description: 'Help customers discover available slots, resolve scheduling conflicts, and confirm calendar bookings automatically.',
      icon: Calendar,
      highlights: ['Slot Discovery', 'Conflict Prevention', 'Automated Rescheduling'],
      gradient: 'from-purple-500/20 to-pink-500/5',
    },
    {
      title: 'Customer Management',
      description: 'Maintain an organized directory of caller identities, past interaction logs, preferences, and appointment records.',
      icon: Users,
      highlights: ['Caller Profiling', 'Appointment History', 'Enterprise Scoping'],
      gradient: 'from-emerald-500/20 to-teal-500/5',
    },
    {
      title: 'Voice Reception',
      description: 'Enable customers to interact with your AI receptionist through real-time, browser-based voice conversations on mobile or desktop.',
      icon: Mic,
      highlights: ['Voice Activity Detection', 'Low-Latency Response', 'Mobile Responsive'],
      gradient: 'from-indigo-500/20 to-blue-500/5',
    },
  ];

  return (
    <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-blue-400 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Platform Capabilities</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Core Platform Features
        </h2>
        <p className="mt-3 text-slate-400 text-sm sm:text-base">
          Everything your business needs to automate front-desk operations and streamline caller appointments.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className={`relative group p-6 rounded-2xl bg-gradient-to-br ${feature.gradient} bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-all duration-300 flex flex-col justify-between hover:shadow-xl hover:-translate-y-0.5`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-blue-400 group-hover:text-blue-300 group-hover:scale-105 transition-all shadow-inner">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Available
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  {feature.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/60">
                <div className="flex flex-wrap gap-1.5">
                  {feature.highlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="px-2 py-0.5 rounded-md text-[11px] bg-slate-800/60 text-slate-300 border border-slate-700/40"
                    >
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
