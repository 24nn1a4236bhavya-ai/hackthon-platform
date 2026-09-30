import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Trophy, Gavel, Shield, LogOut, LogIn, UserPlus, ChevronDown, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from './RoleBadge';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, quickDemoLogin } = useAuth();
  const navigate = useNavigate();
  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);

  const handleDemoSwitch = async (role: any) => {
    setIsDemoMenuOpen(false);
    await quickDemoLogin(role);
    navigate(0); // refresh active view
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2.5 text-white hover:opacity-90 transition">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              OpenHack
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-brand-950/80 text-brand-300 border border-brand-800/60 ml-1">
              Local & Offline
            </span>
          </Link>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-300">
          <Link
            to="/hackathons"
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-900 transition flex items-center gap-1.5"
          >
            <Trophy className="w-4 h-4 text-brand-400" />
            Hackathons
          </Link>
          <Link
            to="/gallery"
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-900 transition flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Project Showcase
          </Link>
          {user && ['JUDGE', 'ORGANIZER', 'ADMIN'].includes(user.role) && (
            <Link
              to="/judging"
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-900 transition flex items-center gap-1.5"
            >
              <Gavel className="w-4 h-4 text-cyan-400" />
              Judge Portal
            </Link>
          )}
          {user && user.role === 'ADMIN' && (
            <Link
              to="/admin"
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-900 transition flex items-center gap-1.5"
            >
              <Shield className="w-4 h-4 text-purple-400" />
              Admin
            </Link>
          )}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Persona Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsDemoMenuOpen(!isDemoMenuOpen)}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-brand-500/50 text-slate-200 hover:text-white transition shadow-sm"
              title="Instantly switch demo users"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Switch Demo User</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isDemoMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1">
                  1-Click Role Switch
                </div>
                <button
                  onClick={() => handleDemoSwitch('admin')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-purple-400">Admin</div>
                    <div className="text-[10px] text-slate-400">admin@example.local</div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300">ADMIN</span>
                </button>
                <button
                  onClick={() => handleDemoSwitch('organizer')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-amber-400">Sarah (Organizer)</div>
                    <div className="text-[10px] text-slate-400">organizer@example.local</div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300">ORGANIZER</span>
                </button>
                <button
                  onClick={() => handleDemoSwitch('judge1')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-cyan-400">Dr. Vance (Judge 1)</div>
                    <div className="text-[10px] text-slate-400">judge1@example.local</div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300">JUDGE</span>
                </button>
                <button
                  onClick={() => handleDemoSwitch('judge2')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-cyan-400">Elena (Judge 2)</div>
                    <div className="text-[10px] text-slate-400">judge2@example.local</div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300">JUDGE</span>
                </button>
                <button
                  onClick={() => handleDemoSwitch('participant')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-emerald-400">Alex (Participant)</div>
                    <div className="text-[10px] text-slate-400">participant@example.local</div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300">PARTICIPANT</span>
                </button>
              </div>
            )}
          </div>

          {/* User profile or Auth links */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-200">{user.full_name}</span>
                <RoleBadge role={user.role} size="sm" />
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 rounded-lg transition flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                Login
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition shadow-md shadow-brand-600/30 flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
