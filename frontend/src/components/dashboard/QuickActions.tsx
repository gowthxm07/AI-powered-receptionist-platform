'use client';

import React from 'react';
import Link from 'next/link';
import { UserPlus, UserCheck, PlusSquare, CalendarPlus, ArrowUpRight } from 'lucide-react';

interface QuickActionItem {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  colorScheme: 'indigo' | 'emerald' | 'blue' | 'purple';
}

const actions: QuickActionItem[] = [
  {
    title: 'Register Customer',
    description: 'Add a new caller record to this business directory.',
    href: '/dashboard/customers',
    icon: UserPlus,
    colorScheme: 'emerald',
  },
  {
    title: 'Onboard Staff',
    description: 'Add a specialist to your active service roster.',
    href: '/dashboard/staff',
    icon: UserCheck,
    colorScheme: 'blue',
  },
  {
    title: 'Create Service',
    description: 'Configure a new bookable appointment offering.',
    href: '/dashboard/services',
    icon: PlusSquare,
    colorScheme: 'purple',
  },
  {
    title: 'Book Appointment',
    description: 'Schedule a manual or AI-assisted calendar slot.',
    href: '/dashboard/appointments',
    icon: CalendarPlus,
    colorScheme: 'indigo',
  },
];

export const QuickActions: React.FC = () => {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      text: 'text-indigo-400',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
    },
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-400',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      text: 'text-purple-400',
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Quick Operations</h3>
          <p className="text-xs text-slate-400">Shortcuts to core business workflows</p>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">Interactive navigation</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((act) => {
          const scheme = colorMap[act.colorScheme];
          const Icon = act.icon;

          return (
            <Link
              key={act.title}
              href={act.href}
              className="relative overflow-hidden rounded-2xl bg-slate-900/70 border border-slate-800/80 p-4 hover:border-slate-700 hover:bg-slate-900 transition-all duration-200 group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`w-9 h-9 rounded-xl ${scheme.bg} border ${scheme.border} flex items-center justify-center ${scheme.text} group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
              </div>

              <div className="mt-3">
                <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {act.title}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                  {act.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
