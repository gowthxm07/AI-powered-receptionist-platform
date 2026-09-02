import React from 'react';
import { Bot, Sparkles, Github, Activity } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white tracking-tight">Smart Receptionist</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Phase 1: Foundation
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">AI-Powered Platform</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-blue-400 transition-colors">
            Features
          </a>
          <a href="#system-status" className="hover:text-blue-400 transition-colors flex items-center space-x-1.5">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>System Status</span>
          </a>
          <a href="#architecture" className="hover:text-blue-400 transition-colors">
            Architecture
          </a>
        </nav>

        <div className="flex items-center space-x-3">
          <a
            href="https://github.com/gowthxm07/AI-powered-receptionist-platform"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all shadow-sm"
          >
            <Github className="w-4 h-4" />
            <span className="hidden sm:inline">GitHub Repository</span>
          </a>
        </div>
      </div>
    </header>
  );
};
