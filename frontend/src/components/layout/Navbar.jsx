import React, { useState, useEffect } from 'react';
import { Compass, Sparkles, Plus, User, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import AuthModal from '../auth/AuthModal';

export default function Navbar({ currentView, onNavigate }) {
  const { user, isSupabaseConfigured } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState({ online: false, mode: 'checking' });

  useEffect(() => {
    let isMounted = true;
    const checkBackend = async () => {
      try {
        const data = await api.getHealth();
        if (isMounted) {
          setHealthStatus({
            online: true,
            mode: data.database_mode,
            supabase_connected: data.supabase_connected,
          });
        }
      } catch (err) {
        if (isMounted) {
          setHealthStatus({ online: false, mode: 'offline' });
        }
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => onNavigate('landing')}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-navy-900 to-teal-700 flex items-center justify-center text-white shadow-subtle group-hover:scale-105 transition-transform">
                <Compass className="w-5 h-5 text-teal-300" />
              </div>
              <div>
                <span className="text-lg font-bold text-navy-900 tracking-tight flex items-center gap-1.5">
                  WanderWise <span className="text-teal-600 font-extrabold text-sm px-1.5 py-0.5 bg-teal-50 border border-teal-200 rounded-md">AI</span>
                </span>
                <span className="block text-[10px] text-slate-500 font-medium tracking-wide">
                  Personalized Travel Planner
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => onNavigate('landing')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  currentView === 'landing'
                    ? 'bg-slate-100 text-navy-900'
                    : 'text-slate-600 hover:text-navy-900 hover:bg-slate-50'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => onNavigate('dashboard')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  currentView === 'dashboard'
                    ? 'bg-slate-100 text-navy-900'
                    : 'text-slate-600 hover:text-navy-900 hover:bg-slate-50'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => onNavigate('builder')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  currentView === 'builder'
                    ? 'bg-slate-100 text-navy-900'
                    : 'text-slate-600 hover:text-navy-900 hover:bg-slate-50'
                }`}
              >
                Trip Builder
              </button>
            </nav>

            {/* Right Action Area */}
            <div className="flex items-center gap-3">
              {/* API / Database Health Indicator */}
              <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600">
                <span
                  className={`w-2 h-2 rounded-full ${
                    healthStatus.online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span>
                  {healthStatus.online
                    ? healthStatus.mode === 'supabase'
                      ? 'Supabase Cloud'
                      : 'Local SQLite (Dev)'
                    : 'API Disconnected'}
                </span>
              </div>

              {/* User Account / Auth Button */}
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-subtle"
                title="Account & Database Settings"
              >
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-xs font-bold">
                  {user?.email ? user.email.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                </div>
                <span className="hidden sm:inline max-w-[110px] truncate">
                  {user?.user_metadata?.full_name || (user?.isDev ? 'Explorer' : user?.email?.split('@')[0] || 'Sign In')}
                </span>
                {user?.isDev && (
                  <span className="text-[10px] px-1 bg-amber-100 text-amber-800 rounded font-normal">
                    Dev
                  </span>
                )}
              </button>

              {/* Create Trip CTA */}
              <Button
                variant="teal"
                size="sm"
                icon={Plus}
                onClick={() => onNavigate('builder')}
                className="font-semibold text-xs"
              >
                Plan Trip
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
