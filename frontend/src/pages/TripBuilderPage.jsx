import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Compass,
  Check,
  AlertCircle,
  HelpCircle,
  Clock,
  Heart,
  Landmark,
  Utensils,
  Building,
  Trees,
  ShoppingBag,
  Moon,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import {
  CURRENCIES,
  TRAVEL_STYLES,
  PACE_OPTIONS,
  INTEREST_OPTIONS,
  ACCOMMODATION_OPTIONS,
  DIETARY_OPTIONS,
  ACCESSIBILITY_OPTIONS,
} from '../utils/constants';

const INTEREST_ICON_MAP = {
  sightseeing: Landmark,
  food: Utensils,
  culture: Building,
  adventure: Compass,
  nature: Trees,
  relaxation: Sparkles,
  shopping: ShoppingBag,
  nightlife: Moon,
};

export default function TripBuilderPage({ initialDestination = '', onTripCreated, onCancel }) {
  const toast = useToast();

  // Form State
  const [destination, setDestination] = useState(initialDestination || '');
  const [title, setTitle] = useState('');
  
  // Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const twoWeeks = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(nextWeek);
  const [endDate, setEndDate] = useState(twoWeeks);
  
  // Travelers & Budget
  const [travelers, setTravelers] = useState(2);
  const [budget, setBudget] = useState(2500);
  const [currency, setCurrency] = useState('USD');
  
  // Style, Pace, Preferences
  const [travelStyle, setTravelStyle] = useState('balanced');
  const [interests, setInterests] = useState(['sightseeing', 'food', 'culture']);
  const [pace, setPace] = useState('balanced');
  const [accommodationPref, setAccommodationPref] = useState('Boutique Hotel');
  const [dietaryPref, setDietaryPref] = useState('None / Flexible');
  const [accessibilityReq, setAccessibilityReq] = useState('None');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Validation & Loading
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');

  // Duration in days calculation
  const calculateDuration = () => {
    if (!startDate || !endDate) return 1;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  };

  const durationDays = calculateDuration();

  const toggleInterest = (id) => {
    setInterests((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!destination.trim()) {
      newErrors.destination = 'Destination is required.';
    } else if (destination.trim().length < 2) {
      newErrors.destination = 'Please enter a valid city or destination name.';
    }

    if (!startDate) {
      newErrors.startDate = 'Start date is required.';
    }

    if (!endDate) {
      newErrors.endDate = 'End date is required.';
    } else if (startDate && endDate < startDate) {
      newErrors.endDate = 'End date cannot be earlier than start date.';
    }

    if (travelers < 1) {
      newErrors.travelers = 'Must have at least 1 traveler.';
    }

    if (budget < 0) {
      newErrors.budget = 'Budget cannot be negative.';
    }

    if (interests.length === 0) {
      newErrors.interests = 'Please select at least one interest.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please resolve the errors highlighted in the form.');
      return;
    }

    setLoading(true);
    setLoadingStep('Creating trip record in database...');

    const payload = {
      title: title.trim() || `Trip to ${destination.trim()}`,
      destination: destination.trim(),
      start_date: startDate,
      end_date: endDate,
      travelers: Number(travelers),
      budget: Number(budget),
      currency,
      travel_style: travelStyle,
      interests,
      pace,
      accommodation_pref: accommodationPref,
      dietary_pref: dietaryPref,
      accessibility_req: accessibilityReq,
      additional_notes: additionalNotes.trim(),
      status: 'planned',
    };

    try {
      const createdTrip = await api.createTrip(payload);
      
      // Step 2: Attempt immediate AI generation
      setLoadingStep('Connecting with AI model & generating personalized schedule...');
      try {
        await api.generateAIItinerary(createdTrip.id, additionalNotes.trim());
        toast.success(`AI Itinerary for ${createdTrip.destination} generated successfully!`);
      } catch (aiErr) {
        console.warn('Initial AI generation notice:', aiErr);
        toast.info(`Trip created with baseline plan. You can regenerate with AI anytime!`);
      }
      
      onTripCreated(createdTrip.id);
    } catch (err) {
      toast.error(err.message || 'Failed to create trip. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-subtle space-y-2">
        <Badge variant="primary" size="sm" icon={Sparkles}>
          Smart Trip Builder
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
          Design Your Custom Itinerary
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Configure your travel parameters below. WanderWise AI will build an organized day-by-day plan with scheduled activities, dining, and budget estimates.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Destination & Dates */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <MapPin className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-navy-900">Destination & Schedule</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1.5">
                Where are you heading? <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    if (errors.destination) setErrors((prev) => ({ ...prev, destination: null }));
                  }}
                  placeholder="e.g. Kyoto, Tokyo, Paris, Rome, Amalfi Coast, Bali..."
                  className={`w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border rounded-xl outline-none focus:bg-white transition-all ${
                    errors.destination
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-200'
                      : 'border-slate-200 focus:ring-2 focus:ring-teal-500'
                  }`}
                />
              </div>
              {errors.destination && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.destination}
                </p>
              )}

              {/* Quick Suggestions Chips */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span className="text-[11px] text-slate-400 font-medium">Suggestions:</span>
                {['Kyoto', 'Amalfi Coast', 'Swiss Alps', 'Paris', 'Bali', 'Banff', 'Tokyo', 'London'].map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => {
                      setDestination(city);
                      if (errors.destination) setErrors((prev) => ({ ...prev, destination: null }));
                    }}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-colors border ${
                      destination.toLowerCase() === city.toLowerCase()
                        ? 'bg-teal-50 border-teal-300 text-teal-800 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Trip Title (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trip Name <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={destination ? `Trip to ${destination}` : 'e.g. Summer Vacation, Honeymoon'}
                className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1.5">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="date"
                    min={todayStr}
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: null }));
                    }}
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                {errors.startDate && (
                  <p className="text-xs text-rose-600 mt-1">{errors.startDate}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1.5">
                  End Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="date"
                    min={startDate || todayStr}
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: null }));
                    }}
                    className={`w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border rounded-xl outline-none focus:bg-white ${
                      errors.endDate
                        ? 'border-rose-400 focus:ring-2 focus:ring-rose-200'
                        : 'border-slate-200 focus:ring-2 focus:ring-teal-500'
                    }`}
                  />
                </div>
                {errors.endDate && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.endDate}
                  </p>
                )}
              </div>
            </div>

            {/* Calculated duration badge */}
            <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200 flex items-center justify-between text-xs">
              <span className="text-teal-900 font-semibold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-600" />
                Calculated Trip Duration
              </span>
              <span className="font-extrabold text-teal-800 bg-white px-2.5 py-0.5 rounded-md border border-teal-200">
                {durationDays} {durationDays === 1 ? 'Day' : 'Days'}
              </span>
            </div>
          </div>
        </Card>

        {/* Section 2: Travelers & Budget */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <DollarSign className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-navy-900">Travelers & Budget</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Number of Travelers */}
            <div>
              <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1.5">
                Number of Travelers
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={travelers}
                    onChange={(e) => setTravelers(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                {/* Quick increment buttons */}
                <div className="flex items-center gap-1">
                  {[1, 2, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTravelers(num)}
                      className={`px-2.5 py-2 text-xs rounded-xl border font-semibold ${
                        travelers === num
                          ? 'bg-navy-900 text-white border-navy-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {num} {num === 1 ? 'Solo' : num === 2 ? 'Couple' : 'Group'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Total Budget & Currency */}
            <div>
              <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1.5">
                Total Budget
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={budget}
                    onChange={(e) => setBudget(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Section 3: Travel Style & Pace */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Compass className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-navy-900">Travel Style & Pace</h2>
          </div>

          {/* Travel Style Selector */}
          <div>
            <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-2">
              Select Travel Style
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TRAVEL_STYLES.map((style) => (
                <div
                  key={style.id}
                  onClick={() => setTravelStyle(style.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    travelStyle === style.id
                      ? 'bg-teal-50/60 border-teal-500 ring-2 ring-teal-500/20 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-navy-900">{style.title}</span>
                    <Badge variant={travelStyle === style.id ? 'primary' : 'neutral'} size="sm">
                      {style.badge}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">{style.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Preferred Pace */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-2">
              Preferred Daily Pace
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PACE_OPTIONS.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setPace(p.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    pace === p.id
                      ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span className="text-xs font-bold block mb-1">{p.title}</span>
                  <p
                    className={`text-[11px] leading-relaxed ${
                      pace === p.id ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {p.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Section 4: Interests Multi-Select */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-bold text-navy-900">Interests & Activities</h2>
            </div>
            <span className="text-xs text-slate-400">Select all that apply</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {INTEREST_OPTIONS.map((item) => {
              const isSelected = interests.includes(item.id);
              const Icon = INTEREST_ICON_MAP[item.id] || Compass;

              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => toggleInterest(item.id)}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                    isSelected
                      ? 'bg-teal-50 border-teal-400 text-teal-900 ring-1 ring-teal-400 shadow-subtle'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
          {errors.interests && (
            <p className="text-xs text-rose-600 mt-1">{errors.interests}</p>
          )}
        </Card>

        {/* Section 5: Accommodation & Dietary Preferences */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-navy-900">Preferences & Requirements</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Accommodation */}
            <div>
              <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1.5">
                Accommodation Type
              </label>
              <select
                value={accommodationPref}
                onChange={(e) => setAccommodationPref(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
              >
                {ACCOMMODATION_OPTIONS.map((acc) => (
                  <option key={acc} value={acc}>
                    {acc}
                  </option>
                ))}
              </select>
            </div>

            {/* Dietary Preference */}
            <div>
              <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1.5">
                Dietary Preference
              </label>
              <select
                value={dietaryPref}
                onChange={(e) => setDietaryPref(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
              >
                {DIETARY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Accessibility */}
            <div>
              <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1.5">
                Accessibility
              </label>
              <select
                value={accessibilityReq}
                onChange={(e) => setAccessibilityReq(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
              >
                {ACCESSIBILITY_OPTIONS.map((acc) => (
                  <option key={acc} value={acc}>
                    {acc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1.5">
              Additional Instructions / Special Requests
            </label>
            <textarea
              rows="3"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="e.g. Prefer early mornings, interested in visiting local tea shops, traveling with elderly parents, interested in photography viewpoints..."
              className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </Card>

        {/* Form Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200/80">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="teal"
            size="lg"
            isLoading={loading}
            icon={Sparkles}
            className="w-full sm:w-auto font-bold px-8 shadow-card"
          >
            Generate Complete Itinerary
          </Button>
        </div>

        {/* Live Loading Indicator Modal/Banner */}
        {loading && (
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-center gap-3 animate-pulse">
            <Sparkles className="w-5 h-5 text-teal-600 animate-spin shrink-0" />
            <div className="text-xs text-teal-900 font-medium">
              <span className="font-bold">WanderWise Planner Working:</span> {loadingStep}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
