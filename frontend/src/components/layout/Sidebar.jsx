import React from 'react';
import { LayoutDashboard, PlusCircle, Compass, MapPin, Calendar, Database, ShieldCheck, ChevronRight } from 'lucide-react';
import Badge from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ currentView, onNavigate, activeTripId }) {
  const { isSupabaseConfigured, user } = useAuth();

  const NAV_ITEMS = [
    {
      id: 'dashboard',
      label: 'Trip Dashboard',
      icon: LayoutDashboard,
      description: 'Your saved & upcoming trips',
    },
    {
      id: 'builder',
      label: 'Smart Trip Builder',
      icon: PlusCircle,
      description: 'Create new personalized trip',
    },
    {
      id: 'landing',
      label: 'Explore Destinations',
      icon: Compass,
      description: 'Inspiration & curated guides',
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/80 min-h-[calc(100vh-4rem)] p-4 shrink-0">
      {/* Navigation Group */}
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all group ${
                isActive
                  ? 'bg-navy-900 text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-navy-900 hover:bg-slate-50'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-teal-600'
                }`}
              />
              <div className="flex-1 truncate">
                <div className="text-xs font-semibold leading-tight">{item.label}</div>
                <div
                  className={`text-[10px] truncate ${
                    isActive ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}

        {activeTripId && (
          <button
            onClick={() => onNavigate('trip-details', activeTripId)}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all group ${
              currentView === 'trip-details'
                ? 'bg-navy-900 text-white shadow-sm font-semibold'
                : 'text-slate-600 hover:text-navy-900 hover:bg-slate-50'
            }`}
          >
            <MapPin
              className={`w-4 h-4 shrink-0 ${
                currentView === 'trip-details' ? 'text-teal-400' : 'text-slate-400 group-hover:text-teal-600'
              }`}
            />
            <div className="flex-1 truncate">
              <div className="text-xs font-semibold leading-tight">Active Itinerary</div>
              <div className="text-[10px] text-teal-600 font-medium truncate">Day-by-Day View</div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
      </div>

      {/* Database & Environment Info Widget */}
      <div className="mt-auto pt-6 border-t border-slate-100">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 text-[11px] flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-teal-600" />
              Storage Layer
            </span>
            <Badge variant={isSupabaseConfigured ? 'success' : 'primary'} size="sm">
              {isSupabaseConfigured ? 'Supabase' : 'SQLite'}
            </Badge>
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            {isSupabaseConfigured
              ? 'Synced with Supabase PostgreSQL cloud tables and RLS.'
              : 'Local SQLite engine active with full CRUD persistence & foreign keys.'}
          </p>
        </div>

        <div className="mt-3 px-1 text-[11px] text-slate-400 text-center font-medium">
          WanderWise AI • v1.0.0
        </div>
      </div>
    </aside>
  );
}
