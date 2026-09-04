'use client';

import React from 'react';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';

export default function ConversationsPage() {
  return (
    <DashboardLayout title="Conversation Archives">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-2 text-xs font-medium text-slate-400 hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard Overview</span>
          </Link>
        </div>

        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Conversation History & Archives</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            Caller interactions and session logs are managed securely within your organization's database with zero-audio privacy protection.
          </p>
          <div className="pt-4">
            <Link
              href="/dashboard/ai-receptionist"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
            >
              <span>Go to AI Receptionist</span>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
