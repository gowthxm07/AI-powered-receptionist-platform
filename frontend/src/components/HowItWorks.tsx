import React from 'react';
import { Mic, Cpu, CalendarCheck, Volume2, Sparkles, ArrowRight } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Caller Speaks Naturally',
      subtitle: 'Browser or Mobile Voice Intake',
      description: 'The caller dials into the voice reception interface. On-device Voice Activity Detection seamlessly streams speech upon pause.',
      icon: Mic,
      color: 'from-blue-500 to-indigo-600',
      iconBg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    },
    {
      step: '02',
      title: 'Intelligent Intent Extraction',
      subtitle: 'Whisper STT & LLM Reasoning',
      description: 'Local Whisper transcribes speech into text in milliseconds. The LLM extracts the desired service, preferred practitioner, date, and time.',
      icon: Cpu,
      color: 'from-indigo-500 to-purple-600',
      iconBg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
    },
    {
      step: '03',
      title: 'Conflict-Free Schedule Lock',
      subtitle: 'PostgreSQL Relational Sync',
      description: 'The booking engine checks live practitioner rosters, verifies working hours, guarantees zero double-booking, and secures the slot.',
      icon: CalendarCheck,
      color: 'from-purple-500 to-pink-600',
      iconBg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    },
    {
      step: '04',
      title: 'Real-Time Spoken Confirmation',
      subtitle: 'Piper High-Fidelity TTS',
      description: 'A natural voice audio response is synthesized instantly and played back to the caller, confirming appointment date, time, and service.',
      icon: Volume2,
      color: 'from-pink-500 to-rose-600',
      iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-slate-900/40 border-y border-slate-800/80 relative">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-indigo-500/5 blur-[140px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-indigo-400 mb-3 shadow-inner">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Seamless Workflow</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            How The Receptionist Operates
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base leading-relaxed">
            From the moment a caller speaks to the moment their booking is confirmed on the calendar — completely hands-free.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-2xl font-black font-mono text-slate-700 group-hover:text-indigo-400/80 transition-colors">
                      {item.step}
                    </span>
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${item.iconBg} shadow-inner`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">
                    {item.title}
                  </h3>
                  <div className="text-xs font-medium text-indigo-400/90 mb-3">
                    {item.subtitle}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-slate-700">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
