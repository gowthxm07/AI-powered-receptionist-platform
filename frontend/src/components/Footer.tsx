import React from 'react';
import { Bot, Github, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-200">
              AI-Powered Smart Receptionist Platform
            </div>
            <div className="text-xs text-slate-400">
              Full Stack Development Capstone Course Project
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400 text-center sm:text-right">
          <div>Current Milestone: <span className="text-blue-400 font-semibold">Phase 1 (Foundation)</span></div>
          <div className="mt-1">Built with Next.js, Express, TypeScript & Tailwind CSS</div>
        </div>
      </div>
    </footer>
  );
};
