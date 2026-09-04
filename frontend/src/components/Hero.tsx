import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Server, ShieldCheck, Cpu, UserPlus } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 text-xs font-medium mb-6 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Intelligent Front-Desk Automation Platform</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight sm:leading-none">
          AI-Powered Smart <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
            Receptionist Platform
          </span>
        </h1>

        {/* Tagline */}
        <p className="mt-6 text-xl sm:text-2xl font-medium text-slate-300 italic">
          &ldquo;Intelligent conversations. Smarter appointments.&rdquo;
        </p>

        {/* Description */}
        <p className="mt-4 max-w-2xl mx-auto text-base text-slate-400 leading-relaxed">
          An AI-powered receptionist platform that helps businesses manage customer inquiries, automate appointment scheduling, and provide intelligent real-time assistance.
        </p>

        {/* Call to actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-800 hover:border-slate-700 transition-all"
          >
            <span>Sign In</span>
          </Link>
        </div>

        {/* Trust & Architecture Pillars */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-slate-800/80">
          <div className="flex items-center justify-center space-x-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/50">
            <Cpu className="w-5 h-5 text-blue-400" />
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-200">Local AI Engine</div>
              <div className="text-[11px] text-slate-400">Autonomous voice & dialogue</div>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/50">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-200">Privacy First</div>
              <div className="text-[11px] text-slate-400">Zero cloud audio persistence</div>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/50">
            <Server className="w-5 h-5 text-emerald-400" />
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-200">Multi-Tenant Platform</div>
              <div className="text-[11px] text-slate-400">Isolated business workspaces</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
