import React from 'react';
import { 
  Bot, 
  Calendar, 
  Users, 
  BookOpen, 
  MessageSquareText, 
  Sparkles,
  Lock,
  Mic,
  Cpu
} from 'lucide-react';

interface FeatureCard {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  phase: string;
  highlights: string[];
  gradient: string;
}

export const FeatureGrid: React.FC = () => {
  const features: FeatureCard[] = [
    {
      title: 'AI Receptionist',
      description: 'Autonomous conversational assistant handling incoming caller queries with natural voice understanding and human-like dialogue.',
      icon: Bot,
      phase: 'Phase 3 & 4',
      highlights: ['Local LLM (Ollama)', 'Speech-to-Text (Whisper)', 'Natural Voice Output (Piper)'],
      gradient: 'from-blue-500/20 to-indigo-500/5',
    },
    {
      title: 'Smart Appointments',
      description: 'Intelligent scheduling assistant with automatic calendar slot matching, conflict resolution, and booking confirmation.',
      icon: Calendar,
      phase: 'Phase 2',
      highlights: ['Slot Discovery', 'Conflict Prevention', 'Automated Rescheduling'],
      gradient: 'from-purple-500/20 to-pink-500/5',
    },
    {
      title: 'Customer Management',
      description: 'Comprehensive directory of caller identities, past interaction logs, preferences, and contextual relationship notes.',
      icon: Users,
      phase: 'Phase 2',
      highlights: ['Caller Profiling', 'Interaction Timeline', 'Preference Tracking'],
      gradient: 'from-emerald-500/20 to-teal-500/5',
    },
    {
      title: 'Knowledge Assistant',
      description: 'Context-aware RAG engine that searches business documents, FAQs, and service guidelines to provide exact answers.',
      icon: BookOpen,
      phase: 'Phase 4',
      highlights: ['Vector Search (ChromaDB)', 'Semantic Embeddings', 'Document Ingestion'],
      gradient: 'from-amber-500/20 to-yellow-500/5',
    },
    {
      title: 'Conversation History',
      description: 'Detailed searchable archive of all past customer interactions with AI-generated key summaries and sentiment insights.',
      icon: MessageSquareText,
      phase: 'Phase 3',
      highlights: ['Full Audio Transcripts', 'Key Takeaways Extraction', 'Structured Audit Trail'],
      gradient: 'from-cyan-500/20 to-blue-500/5',
    },
  ];

  return (
    <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-blue-400 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Platform Capabilities Preview</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Planned Future Features
        </h2>
        <p className="mt-3 text-slate-400 text-sm sm:text-base">
          These core capabilities will be incrementally implemented in upcoming project phases.
          All designed to operate locally without external paid subscriptions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, idx) => {
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
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
                    <Lock className="w-3 h-3 mr-1 text-slate-400" />
                    {feature.phase}
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
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Key Planned Elements
                </div>
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

        {/* Local AI Architecture Teaser Card */}
        <div className="relative group p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900/80 border border-indigo-900/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-900/30 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
                <Cpu className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-indigo-950/60 text-indigo-300 border border-indigo-800/50">
                Free & Open Stack
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-2">
              Zero-Cost Local Architecture
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Unlike traditional setups relying on costly proprietary APIs (OpenAI, Twilio, ElevenLabs), our system will leverage self-hosted open-source AI.
            </p>
          </div>

          <div className="pt-4 border-t border-indigo-900/40">
            <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-300">
              <Mic className="w-4 h-4" />
              <span>Ollama • Whisper • ChromaDB • Piper</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
