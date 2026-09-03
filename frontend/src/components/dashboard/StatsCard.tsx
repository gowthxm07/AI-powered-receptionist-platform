'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'info';
  colorScheme?: 'indigo' | 'emerald' | 'blue' | 'purple' | 'amber';
  loading?: boolean;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeVariant = 'default',
  colorScheme = 'indigo',
  loading = false,
}) => {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      text: 'text-indigo-400',
      gradient: 'from-indigo-500/10 to-transparent',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      gradient: 'from-emerald-500/10 to-transparent',
    },
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-400',
      gradient: 'from-blue-500/10 to-transparent',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      text: 'text-purple-400',
      gradient: 'from-purple-500/10 to-transparent',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      gradient: 'from-amber-500/10 to-transparent',
    },
  };

  const badgeStyles = {
    default: 'bg-slate-800 text-slate-300 border-slate-700/60',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    info: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  };

  const scheme = colorMap[colorScheme];

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-3 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 w-28 bg-slate-800 rounded-lg"></div>
          <div className="w-9 h-9 bg-slate-800 rounded-xl"></div>
        </div>
        <div className="h-8 w-16 bg-slate-800 rounded-lg"></div>
        <div className="h-3 w-36 bg-slate-800 rounded"></div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900/80 border border-slate-800/90 p-5 hover:border-slate-700/80 transition-all duration-200 shadow-sm group">
      {/* Subtle background glow */}
      <div
        className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-gradient-to-br ${scheme.gradient} blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-300`}
      />

      <div className="relative z-10 flex flex-col justify-between h-full space-y-3">
        <div className="flex items-start justify-between">
          <span className="text-xs font-medium text-slate-400 tracking-wide uppercase">
            {title}
          </span>
          <div
            className={`w-9 h-9 rounded-xl ${scheme.bg} border ${scheme.border} flex items-center justify-center ${scheme.text} group-hover:scale-105 transition-transform`}
          >
            <Icon className="w-5 h-5" />
          </div>
        </div>

        <div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {value}
          </div>

          <div className="flex items-center justify-between mt-1 text-xs">
            {subtitle && <span className="text-slate-400 truncate">{subtitle}</span>}
            {badge && (
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeStyles[badgeVariant]}`}
              >
                {badge}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
