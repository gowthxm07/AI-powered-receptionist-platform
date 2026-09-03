'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  Menu,
  LogOut,
  User as UserIcon,
  Shield,
  Loader2,
} from 'lucide-react';

interface TopbarProps {
  onMenuClick: () => void;
  title?: string;
  businessSelector?: React.ReactNode;
}

export const Topbar: React.FC<TopbarProps> = ({
  onMenuClick,
  title = 'Overview',
  businessSelector,
}) => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left section: Hamburger button & Page Title / Business Selector */}
      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <h1 className="text-sm sm:text-base font-semibold text-white tracking-tight hidden lg:block">
            {title}
          </h1>

          {/* Business Selector Component Injection */}
          {businessSelector && <div className="flex-shrink-0">{businessSelector}</div>}
        </div>
      </div>

      {/* Right section: User info badge & Logout button */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* User profile card */}
        <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <UserIcon className="w-3.5 h-3.5" />
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-slate-200 font-semibold text-xs leading-none">
              {user?.name || 'User'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono leading-tight mt-0.5">
              {user?.role === 'ADMIN' ? 'Administrator' : 'Owner'}
            </span>
          </div>
          {user?.role && (
            <span className="sm:hidden px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Shield className="w-3 h-3 inline mr-0.5" />
              {user.role}
            </span>
          )}
        </div>

        {/* Logout action */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-all disabled:opacity-50"
          title="Sign out of your account"
        >
          {isLoggingOut ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
              <span className="hidden sm:inline">Signing out...</span>
            </>
          ) : (
            <>
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Sign Out</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
