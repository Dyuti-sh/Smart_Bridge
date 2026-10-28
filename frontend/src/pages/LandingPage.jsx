import React, { useState } from 'react';
import { Search, Compass, Sparkles, MapPin, Calendar, DollarSign, ArrowRight, ShieldCheck, Star } from 'lucide-react';
import { POPULAR_DESTINATIONS } from '../utils/constants';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';

export default function LandingPage({ onPlanTrip, onSelectDestination }) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onPlanTrip(searchQuery.trim());
    } else {
      onPlanTrip();
    }
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:py-20 bg-gradient-to-b from-white via-slate-50 to-slate-50/50 border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <Badge variant="primary" size="md" icon={Sparkles} className="mx-auto shadow-subtle">
            WanderWise AI v1.0 • Intelligent Itinerary Planner
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-navy-900 tracking-tight leading-[1.15]">
            Your Next Adventure, <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-sky-600">
              Planned by AI.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            Generate bespoke, day-by-day itineraries tailored to your dates, budget, pace, and passions. From hidden culinary gems to scenic trails, travel smarter with zero guesswork.
          </p>

          {/* Destination Search & CTA Form */}
          <form
            onSubmit={handleSearchSubmit}
            className="max-w-2xl mx-auto mt-8 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-card flex flex-col sm:flex-row gap-2.5"
          >
            <div className="flex-1 flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <MapPin className="w-5 h-5 text-teal-600 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Where to? (e.g. Kyoto, Paris, Swiss Alps, Bali)..."
                className="w-full bg-transparent text-sm font-medium text-navy-900 placeholder:text-slate-400 outline-none"
              />
            </div>
            <Button
              type="submit"
              variant="teal"
              size="lg"
              icon={Sparkles}
              className="text-sm sm:text-base font-semibold px-7 shadow-sm"
            >
              Plan My Trip
            </Button>
          </form>

          {/* Quick Destination Tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-400">Popular:</span>
            {['Kyoto', 'Amalfi Coast', 'Swiss Alps', 'Paris', 'Bali', 'Banff'].map((dest) => (
              <button
                key={dest}
                type="button"
                onClick={() => onSelectDestination(dest)}
                className="px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-teal-500 hover:text-teal-700 transition-colors shadow-subtle"
              >
                {dest}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-navy-900">
            Engineered for Effortless Exploration
          </h2>
          <p className="text-sm text-slate-600">
            Everything you need to transform an idea into a seamless, time-optimized travel plan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="space-y-4 hover:border-teal-300 transition-all">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-navy-900">Personalized Day-by-Day Plans</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Receive structured morning, afternoon, and evening schedules with realistic activity durations, travel times, and pace controls.
            </p>
          </Card>

          <Card className="space-y-4 hover:border-teal-300 transition-all">
            <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-navy-900">Intelligent Budget Allocation</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Keep expenses under control with itemized activity cost projections, accommodation tier guidance, and dining estimates.
            </p>
          </Card>

          <Card className="space-y-4 hover:border-teal-300 transition-all">
            <div className="w-12 h-12 rounded-xl bg-navy-50 border border-navy-200 text-navy-800 flex items-center justify-center">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-navy-900">Smart Local Recommendations</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Tailored suggestions matching dietary habits, accessibility needs, and interests—from culinary street tours to scenic viewpoints.
            </p>
          </Card>
        </div>
      </section>

      {/* Curated Destination Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-navy-900">
              Curated World Destinations
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Select any iconic locale to generate a ready-to-customize itinerary in seconds.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPlanTrip()}
            icon={ArrowRight}
            iconPosition="right"
          >
            Custom Destination
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {POPULAR_DESTINATIONS.map((dest) => (
            <div
              key={dest.name}
              className="group bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-subtle hover:shadow-card hover:border-slate-300 transition-all duration-200 flex flex-col"
            >
              {/* Image Banner */}
              <div className="relative h-48 overflow-hidden bg-slate-100">
                <img
                  src={dest.image}
                  alt={dest.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3">
                  <Badge variant="navy" size="sm" className="bg-navy-900/80 backdrop-blur-md text-white border-none">
                    {dest.tag}
                  </Badge>
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full text-xs font-semibold text-slate-800 shadow-sm">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{dest.rating}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-navy-900 group-hover:text-teal-600 transition-colors">
                    {dest.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                    {dest.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {dest.days}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    From {dest.avgBudget}
                  </span>
                </div>

                <Button
                  variant="teal"
                  size="sm"
                  className="w-full font-semibold"
                  icon={Sparkles}
                  onClick={() => onSelectDestination(dest.query)}
                >
                  Plan Trip to {dest.query}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Call To Action Banner */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-teal-900 rounded-3xl p-8 sm:p-12 text-center text-white space-y-5 shadow-elevated">
          <Badge variant="primary" size="md" className="bg-teal-500/20 text-teal-300 border-teal-500/30 mx-auto">
            Ready to Travel Smarter?
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Build Your First AI-Powered Itinerary Today
          </h2>
          <p className="max-w-xl mx-auto text-sm sm:text-base text-slate-300">
            No endless forum browsing. No spreadsheet clutter. Create a personalized, day-by-day travel plan in under 60 seconds.
          </p>
          <div className="pt-2">
            <Button
              variant="teal"
              size="lg"
              icon={Sparkles}
              onClick={() => onPlanTrip()}
              className="font-bold text-base px-8 shadow-card"
            >
              Start Planning Now
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
