'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Briefcase,
  Calendar,
  Bot,
  Mic,
  Settings,
  X,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  isReady?: boolean;
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    isReady: true,
  },
  {
    name: 'Customers',
    href: '/dashboard/customers',
    icon: Users,
    isReady: true,
  },
  {
    name: 'Staff Roster',
    href: '/dashboard/staff',
    icon: UserCheck,
    isReady: true,
  },
  {
    name: 'Services',
    href: '/dashboard/services',
    icon: Briefcase,
    isReady: true,
  },
  {
    name: 'Appointments',
    href: '/dashboard/appointments',
    icon: Calendar,
    isReady: true,
  },
  {
    name: 'AI Receptionist',
    href: '/dashboard/ai-receptionist',
    icon: Bot,
    isReady: true,
  },
  {
    name: 'Voice Reception',
    href: '/voice',
    icon: Mic,
    isReady: true,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    isReady: true,
  },
];


export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();

  const isCurrent = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800/80">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80">
        <Link href="/dashboard" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-white tracking-tight leading-none">
              Smart Receptionist
            </span>
            <span className="text-[10px] text-indigo-400 font-medium mt-0.5 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              Multi-Tenant AI
            </span>
          </div>
        </Link>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        <div className="px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Management
        </div>

        {navItems.map((item) => {
          const active = isCurrent(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                active
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/80 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    active ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </div>

              {item.badge && (
                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800/90 text-slate-400 border border-slate-700/60">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer System Status Banner */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 flex items-center space-x-3">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-slate-200 truncate">System Status</p>
            <p className="text-[10px] text-emerald-400 truncate">All Systems Operational</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-950 z-10 shadow-2xl">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
