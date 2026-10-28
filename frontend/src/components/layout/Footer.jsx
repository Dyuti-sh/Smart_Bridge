import React from 'react';
import { Compass, Globe } from 'lucide-react';

export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-white border-t border-slate-200/80 mt-auto py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3 text-center md:text-left">
            <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center text-teal-300">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-navy-900 tracking-tight">
                WanderWise AI
              </p>
              <p className="text-xs text-slate-500">
                Personalized Travel Itinerary Planner
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600">
            <button onClick={() => onNavigate('landing')} className="hover:text-teal-600 transition-colors">
              Explore
            </button>
            <button onClick={() => onNavigate('dashboard')} className="hover:text-teal-600 transition-colors">
              Dashboard
            </button>
            <button onClick={() => onNavigate('builder')} className="hover:text-teal-600 transition-colors">
              Trip Builder
            </button>
          </div>

          {/* Tech Stack Pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-500">
            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">React + Vite</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">Tailwind CSS</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">FastAPI</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">Supabase</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} WanderWise AI. Full-Stack Project Foundation (Part 1). Built for reliable demonstration.
        </div>
      </div>
    </footer>
  );
}
