'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { Bot, Activity, Github, User, LogOut, LayoutDashboard, ArrowRight } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, isAuthenticated, loading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white tracking-tight">Smart Receptionist</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Phase 3: Auth
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">AI-Powered Platform</p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-300">
          <a href="/#features" className="hover:text-indigo-400 transition-colors">
            Features
          </a>
          <a href="/#system-status" className="hover:text-indigo-400 transition-colors flex items-center space-x-1.5">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>System Status</span>
          </a>
          <a href="/#architecture" className="hover:text-indigo-400 transition-colors">
            Architecture
          </a>
        </nav>

        <div className="flex items-center space-x-3">
          <a
            href="https://github.com/gowthxm07/AI-powered-receptionist-platform"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 transition-all shadow-sm"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>

          {!loading && (
            <>
              {isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                  </Link>

                  <button
                    onClick={() => logout()}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/login"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all"
                  >
                    Sign In
                  </Link>

                  <Link
                    href="/register"
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};
