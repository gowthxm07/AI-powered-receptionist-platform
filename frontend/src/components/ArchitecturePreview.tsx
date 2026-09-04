import React from 'react';
import { Layers, ArrowRight, Database, Server, Monitor, Bot } from 'lucide-react';

export const ArchitecturePreview: React.FC = () => {
  return (
    <section id="architecture" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          System Architecture Overview
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          A decoupled, modular stack designed for scalability, zero vendor lock-in, and local AI execution.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Layer 1 */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 mb-3">
              <Monitor className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Frontend Client</span>
            </div>
            <h4 className="text-base font-semibold text-white mb-1">Next.js & React</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Modern server & client rendering, responsive Tailwind CSS styling, TypeScript safety.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400">
            Port: 3000 (Active)
          </div>
        </div>

        {/* Layer 2 */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 mb-3">
              <Server className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">API Backend</span>
            </div>
            <h4 className="text-base font-semibold text-white mb-1">Node.js & Express</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Modular controllers, route handlers, error middleware, and RESTful API endpoints.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400">
            Port: 5000 (Active)
          </div>
        </div>

        {/* Layer 3 */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-purple-400 mb-3">
              <Bot className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Local AI Engine</span>
            </div>
            <h4 className="text-base font-semibold text-white mb-1">Whisper & Speech AI</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              On-device speech recognition, local dialogue engine, function calling, and zero API costs.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-emerald-400">
            Port: 11434 (Active)
          </div>
        </div>

        {/* Layer 4 */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 mb-3">
              <Database className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Database Layer</span>
            </div>
            <h4 className="text-base font-semibold text-white mb-1">PostgreSQL & Prisma</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Customer directories, staff rosters, and conflict-free calendar appointments with multi-tenant isolation.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-emerald-400">
            Port: 5433 (Active)
          </div>
        </div>
      </div>
    </section>
  );
};
