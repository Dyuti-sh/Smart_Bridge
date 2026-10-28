import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  Users,
  Compass,
  ArrowLeft,
  RefreshCw,
  Edit3,
  Printer,
  Trash2,
  Hotel,
  Utensils,
  Navigation,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Landmark,
  Trees,
  ShoppingBag,
  Moon,
  Info,
  Plus,
  Cloud,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { CURRENCIES, INTEREST_OPTIONS } from '../utils/constants';

const CATEGORY_ICONS = {
  sightseeing: Landmark,
  dining: Utensils,
  culture: Landmark,
  adventure: Compass,
  nature: Trees,
  relaxation: Sparkles,
  shopping: ShoppingBag,
  nightlife: Moon,
};

const CATEGORIES = [
  'sightseeing',
  'dining',
  'culture',
  'adventure',
  'nature',
  'relaxation',
  'shopping',
  'nightlife'
];

export default function TripDetailsPage({ tripId, onBack, onTripDeleted }) {
  const toast = useToast();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // AI Full Generation State
  const [isAIGenModalOpen, setIsAIGenModalOpen] = useState(false);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiProgressMessage, setAiProgressMessage] = useState('Connecting to WanderWise AI...');

  // Single Day Regeneration State
  const [isDayGenModalOpen, setIsDayGenModalOpen] = useState(false);
  const [dayCustomPrompt, setDayCustomPrompt] = useState('');
  const [isDayGenerating, setIsDayGenerating] = useState(false);

  // Full Plan Baseline Regenerate Modal
  const [isRegenConfirmOpen, setIsRegenConfirmOpen] = useState(false);
  const [regeneratingBaseline, setRegeneratingBaseline] = useState(false);

  // Edit Trip Modal
  const [isEditTripModalOpen, setIsEditTripModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    budget: 0,
    status: 'planned',
    additional_notes: '',
  });
  const [updatingTrip, setUpdatingTrip] = useState(false);

  // Delete Trip Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState(false);

  // Add Activity Modal
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [activityFormData, setActivityFormData] = useState({
    time_slot: '10:00 AM',
    title: '',
    description: '',
    location: '',
    category: 'sightseeing',
    estimated_cost: 0,
  });
  const [addingActivity, setAddingActivity] = useState(false);

  // Edit Activity Modal
  const [activityToEdit, setActivityToEdit] = useState(null);
  const [editActivityForm, setEditActivityForm] = useState({
    time_slot: '',
    title: '',
    description: '',
    location: '',
    category: 'sightseeing',
    estimated_cost: 0,
  });
  const [updatingActivity, setUpdatingActivity] = useState(false);

  // Delete Activity Modal
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [deletingActivity, setDeletingActivity] = useState(false);

  // Edit Day Notes Modal
  const [isEditDayModalOpen, setIsEditDayModalOpen] = useState(false);
  const [editDayForm, setEditDayForm] = useState({
    title: '',
    summary: '',
    accommodation: '',
    dining_recommendations: '',
    transportation_notes: '',
    accommodation_cost: 0,
    dining_cost: 0,
    transport_cost: 0,
  });
  const [updatingDay, setUpdatingDay] = useState(false);

  // Shifting AI progress messages
  useEffect(() => {
    if (!isAIGenerating) return;
    const messages = [
      'Connecting to AI engine & loading preferences...',
      'Analyzing destination, dates, and group parameters...',
      'Structuring personalized day-wise schedule...',
      'Estimating realistic budgets for accommodation, food & transit...',
      'Validating travel times, proximity & output schema...',
      'Finalizing and saving itinerary to database...'
    ];
    let idx = 0;
    setAiProgressMessage(messages[0]);
    const timer = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setAiProgressMessage(messages[idx]);
    }, 3500);
    return () => clearInterval(timer);
  }, [isAIGenerating]);

  const fetchTripDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTrip(tripId);
      setTrip(data);
      setEditFormData({
        title: data.title || '',
        budget: data.budget || 0,
        status: data.status || 'planned',
        additional_notes: data.additional_notes || '',
      });
    } catch (err) {
      setError(err.message || 'Failed to retrieve trip itinerary from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tripId) {
      fetchTripDetails();
    }
  }, [tripId]);

  // Full AI Itinerary Generation
  const handleAIGenerate = async () => {
    if (isAIGenerating) return; // Prevent duplicate clicks
    setIsAIGenerating(true);
    try {
      const updated = await api.generateAIItinerary(tripId, aiCustomPrompt.trim());
      setTrip(updated);
      setIsAIGenModalOpen(false);
      setAiCustomPrompt('');
      toast.success('AI itinerary generated successfully and saved to cloud!');
    } catch (err) {
      toast.error(err.message || 'AI generation failed. Please verify API configuration.');
    } finally {
      setIsAIGenerating(false);
    }
  };

  // Single Day AI Regeneration
  const handleRegenerateDay = async () => {
    if (isDayGenerating) return;
    const currentDay = trip?.days?.[activeDayIndex];
    if (!currentDay) return;

    setIsDayGenerating(true);
    try {
      const updated = await api.generateAIDay(tripId, currentDay.day_number, dayCustomPrompt.trim());
      setTrip(updated);
      setIsDayGenModalOpen(false);
      setDayCustomPrompt('');
      toast.success(`Day ${currentDay.day_number} regenerated with fresh AI recommendations!`);
    } catch (err) {
      toast.error(err.message || 'Failed to regenerate day.');
    } finally {
      setIsDayGenerating(false);
    }
  };

  // Baseline Template Regeneration
  const handleRegenerateBaseline = async () => {
    setRegeneratingBaseline(true);
    try {
      const refreshedTrip = await api.regenerateItinerary(tripId);
      setTrip(refreshedTrip);
      setIsRegenConfirmOpen(false);
      toast.success('Itinerary reset to baseline recommendations.');
    } catch (err) {
      toast.error(err.message || 'Could not regenerate itinerary.');
    } finally {
      setRegeneratingBaseline(false);
    }
  };

  // Edit Trip Metadata
  const handleUpdateTrip = async (e) => {
    e.preventDefault();
    setUpdatingTrip(true);
    try {
      const updated = await api.updateTrip(tripId, {
        title: editFormData.title,
        budget: Number(editFormData.budget),
        status: editFormData.status,
        additional_notes: editFormData.additional_notes,
      });
      setTrip(updated);
      setIsEditTripModalOpen(false);
      toast.success('Trip details updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update trip.');
    } finally {
      setUpdatingTrip(false);
    }
  };

  // Delete Trip
  const handleDeleteTrip = async () => {
    setDeletingTrip(true);
    try {
      await api.deleteTrip(tripId);
      toast.success('Trip deleted.');
      setIsDeleteModalOpen(false);
      onTripDeleted();
    } catch (err) {
      toast.error(err.message || 'Failed to delete trip.');
    } finally {
      setDeletingTrip(false);
    }
  };

  // Add Activity
  const handleAddActivity = async (e) => {
    e.preventDefault();
    const currentDay = trip?.days?.[activeDayIndex];
    if (!currentDay) return;

    setAddingActivity(true);
    try {
      const updated = await api.addActivity(tripId, currentDay.id, {
        ...activityFormData,
        estimated_cost: Number(activityFormData.estimated_cost || 0),
        currency: trip.currency || 'USD',
      });
      setTrip(updated);
      setIsAddActivityOpen(false);
      setActivityFormData({
        time_slot: '10:00 AM',
        title: '',
        description: '',
        location: '',
        category: 'sightseeing',
        estimated_cost: 0,
      });
      toast.success('Activity added and budget recalculated!');
    } catch (err) {
      toast.error(err.message || 'Failed to add activity.');
    } finally {
      setAddingActivity(false);
    }
  };

  // Edit Activity
  const openEditActivityModal = (act) => {
    setActivityToEdit(act);
    setEditActivityForm({
      time_slot: act.time_slot || '',
      title: act.title || '',
      description: act.description || '',
      location: act.location || '',
      category: act.category || 'sightseeing',
      estimated_cost: act.estimated_cost || 0,
    });
  };

  const handleUpdateActivity = async (e) => {
    e.preventDefault();
    if (!activityToEdit) return;

    setUpdatingActivity(true);
    try {
      const updated = await api.updateActivity(tripId, activityToEdit.id, {
        ...editActivityForm,
        estimated_cost: Number(editActivityForm.estimated_cost || 0),
      });
      setTrip(updated);
      setActivityToEdit(null);
      toast.success('Activity updated and budget recalculated!');
    } catch (err) {
      toast.error(err.message || 'Failed to update activity.');
    } finally {
      setUpdatingActivity(false);
    }
  };

  // Delete Activity
  const handleDeleteActivity = async () => {
    if (!activityToDelete) return;
    setDeletingActivity(true);
    try {
      const updated = await api.deleteActivity(tripId, activityToDelete.id);
      setTrip(updated);
      setActivityToDelete(null);
      toast.success('Activity removed and budget updated!');
    } catch (err) {
      toast.error(err.message || 'Failed to remove activity.');
    } finally {
      setDeletingActivity(false);
    }
  };

  // Edit Day Notes
  const openEditDayModal = () => {
    const currentDay = trip?.days?.[activeDayIndex];
    if (!currentDay) return;
    setEditDayForm({
      title: currentDay.title || '',
      summary: currentDay.summary || '',
      accommodation: currentDay.accommodation || '',
      dining_recommendations: currentDay.dining_recommendations || '',
      transportation_notes: currentDay.transportation_notes || '',
      accommodation_cost: currentDay.accommodation_cost || 0,
      dining_cost: currentDay.dining_cost || 0,
      transport_cost: currentDay.transport_cost || 0,
    });
    setIsEditDayModalOpen(true);
  };

  const handleUpdateDay = async (e) => {
    e.preventDefault();
    const currentDay = trip?.days?.[activeDayIndex];
    if (!currentDay) return;

    setUpdatingDay(true);
    try {
      const updated = await api.updateDay(tripId, currentDay.id, {
        ...editDayForm,
        accommodation_cost: Number(editDayForm.accommodation_cost || 0),
        dining_cost: Number(editDayForm.dining_cost || 0),
        transport_cost: Number(editDayForm.transport_cost || 0),
      });
      setTrip(updated);
      setIsEditDayModalOpen(false);
      toast.success('Day guidance and costs updated!');
    } catch (err) {
      toast.error(err.message || 'Failed to update day.');
    } finally {
      setUpdatingDay(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 bg-slate-200 rounded-3xl" />
        <div className="h-12 bg-slate-100 rounded-xl w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-80 bg-slate-100 rounded-2xl" />
          <div className="md:col-span-2 h-80 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <Card className="text-center py-16 px-6 max-w-xl mx-auto space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-xl font-bold text-navy-900">Unable to Load Itinerary</h3>
        <p className="text-sm text-slate-500">{error || 'Trip record not found.'}</p>
        <div className="pt-2 flex justify-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack} icon={ArrowLeft}>
            Back to Dashboard
          </Button>
          <Button variant="teal" size="sm" onClick={fetchTripDetails}>
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  const days = trip.days || [];
  const currentDay = days[activeDayIndex] || days[0];
  const budgetUtilization = trip.budget > 0
    ? Math.round((trip.estimated_total_cost / trip.budget) * 100)
    : 0;
  const costPerTraveler = trip.travelers > 0
    ? Math.round(trip.estimated_total_cost / trip.travelers)
    : trip.estimated_total_cost;

  return (
    <div className="space-y-8 pb-16">
      {/* Top Navigation & Action Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={ArrowLeft}
            onClick={onBack}
            className="font-medium text-xs shadow-subtle"
          >
            Back to Dashboard
          </Button>

          {/* Cloud Synced Indicator */}
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Saved to Supabase
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* AI Generator Button */}
          <Button
            variant="teal"
            size="sm"
            icon={Sparkles}
            onClick={() => setIsAIGenModalOpen(true)}
            disabled={isAIGenerating}
            className="text-xs font-bold shadow-subtle bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
          >
            {trip.ai_generated ? 'Re-Generate with AI' : 'Generate with AI'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={Printer}
            onClick={() => window.print()}
            className="text-xs"
            title="Print or Save PDF"
          >
            Export / Print
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={Edit3}
            onClick={() => setIsEditTripModalOpen(true)}
            className="text-xs"
          >
            Edit Trip
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={() => setIsRegenConfirmOpen(true)}
            className="text-xs text-slate-500 hover:text-navy-900"
            title="Reset to Template"
          >
            Reset Plan
          </Button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200"
            title="Delete Trip"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Destination Overview Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200/90 shadow-card bg-slate-900 text-white min-h-[290px] flex flex-col justify-end p-6 sm:p-10">
        <img
          src={
            trip.cover_image_url ||
            'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80'
          }
          alt={trip.destination}
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/95 via-navy-950/60 to-transparent" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="navy" size="md" className="bg-white/20 backdrop-blur-md text-white border-white/20">
              <MapPin className="w-3.5 h-3.5 text-teal-300" />
              {trip.destination}
            </Badge>

            {trip.ai_generated ? (
              <Badge variant="primary" size="md" className="bg-gradient-to-r from-teal-500/40 to-emerald-500/40 backdrop-blur-md text-teal-100 border-teal-300/40 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                AI Generated ({trip.ai_model || 'Nemotron Bolt'})
              </Badge>
            ) : (
              <Badge variant="neutral" size="md" className="bg-white/10 backdrop-blur-md text-slate-300 border-white/10">
                Baseline Draft
              </Badge>
            )}

            <Badge variant="neutral" size="md" className="bg-white/10 backdrop-blur-md text-slate-200 border-white/10 capitalize">
              {trip.travel_style} Style • {trip.pace} Pace
            </Badge>

            <Badge
              variant={trip.status === 'completed' ? 'success' : 'sky'}
              size="md"
              className="capitalize ml-auto"
            >
              Status: {trip.status}
            </Badge>
          </div>

          <div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              {trip.title || `Trip to ${trip.destination}`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              {trip.additional_notes || `Personalized day-wise itinerary designed for ${trip.destination}.`}
            </p>
          </div>

          {/* Quick Info Bar */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 text-xs sm:text-sm text-slate-200 border-t border-white/10">
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 text-teal-400" />
              <span>{trip.start_date} → {trip.end_date}</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <Clock className="w-4 h-4 text-teal-400" />
              <span>{trip.duration_days} Days / {Math.max(1, trip.duration_days - 1)} Nights</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <Users className="w-4 h-4 text-teal-400" />
              <span>{trip.travelers} {trip.travelers === 1 ? 'Traveler' : 'Travelers'}</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <DollarSign className="w-4 h-4 text-teal-400" />
              <span>Allocated Budget: {trip.budget?.toLocaleString()} {trip.currency}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Honest AI Recommendation Notice (Requirement 2) */}
      <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 text-xs text-amber-900 leading-relaxed">
          <p className="font-bold text-amber-950">
            Honest Travel Estimates & Verification Notice
          </p>
          <p className="mt-0.5 text-amber-800">
            {trip.disclaimer || (
              "All ticket prices, dining costs, attraction opening hours, and transport timings are AI-generated estimates and not confirmed bookings. Venues, ticket availability, and local transit schedules must be verified directly with official operators before travel."
            )}
          </p>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Itinerary Days & Activities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Day Navigation Tabs */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-subtle flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-2 overflow-x-auto">
              {days.map((day, idx) => (
                <button
                  key={day.id || idx}
                  onClick={() => setActiveDayIndex(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    activeDayIndex === idx
                      ? 'bg-navy-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-navy-900 hover:bg-slate-50'
                  }`}
                >
                  Day {day.day_number}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() => setIsAddActivityOpen(true)}
              className="text-xs font-semibold shrink-0"
            >
              Add Activity
            </Button>
          </div>

          {/* Active Day Content */}
          {currentDay && (
            <div className="space-y-6">
              {/* Day Header Card with Regenerate & Edit Controls */}
              <Card className="border-teal-200/80 bg-gradient-to-r from-teal-50/60 via-white to-white space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="primary" size="sm">
                      Day {currentDay.day_number} • {currentDay.date}
                    </Badge>
                    <span className="text-xs font-semibold text-slate-500">
                      {currentDay.activities?.length || 0} Activities Scheduled
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={RefreshCw}
                      onClick={() => setIsDayGenModalOpen(true)}
                      className="text-xs font-semibold hover:border-teal-400"
                    >
                      Regenerate Day {currentDay.day_number}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Edit3}
                      onClick={openEditDayModal}
                      className="text-xs text-slate-500"
                    >
                      Edit Notes
                    </Button>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-navy-900">{currentDay.title}</h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1">
                    {currentDay.summary || "Explore carefully planned highlights curated for today's itinerary."}
                  </p>
                </div>

                {/* Day Cost Summary Pill */}
                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
                  <span>Est. Stay: <strong>${currentDay.accommodation_cost || currentDay.estimated_accommodation_cost || 0}</strong></span>
                  <span>•</span>
                  <span>Est. Food: <strong>${currentDay.dining_cost || currentDay.estimated_dining_cost || 0}</strong></span>
                  <span>•</span>
                  <span>Est. Transit: <strong>${currentDay.transport_cost || currentDay.estimated_transport_cost || 0}</strong></span>
                </div>
              </Card>

              {/* Day Activities List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Day {currentDay.day_number} Schedule
                  </h3>
                  <button
                    onClick={() => setIsAddActivityOpen(true)}
                    className="text-xs text-teal-700 hover:text-teal-800 font-bold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Activity
                  </button>
                </div>

                {currentDay.activities && currentDay.activities.length > 0 ? (
                  currentDay.activities.map((act, actIndex) => {
                    const CategoryIcon = CATEGORY_ICONS[act.category] || Landmark;

                    return (
                      <div
                        key={act.id || actIndex}
                        className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-subtle hover:border-slate-300 transition-all space-y-3 group"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-navy-50 text-navy-900 text-xs font-bold">
                              {act.time_slot}
                            </span>
                            <Badge variant="neutral" size="sm" icon={CategoryIcon} className="capitalize">
                              {act.category}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                              Est. {act.estimated_cost} {act.currency || trip.currency}
                            </span>

                            <button
                              onClick={() => openEditActivityModal(act)}
                              className="p-1 text-slate-400 hover:text-navy-900 rounded-lg hover:bg-slate-50 transition-colors"
                              title="Edit Activity"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setActivityToDelete(act)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                              title="Delete Activity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-navy-900">{act.title}</h4>
                          <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                            {act.description}
                          </p>
                        </div>

                        {act.location && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1 border-t border-slate-100 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{act.location}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <Card className="text-center py-10 space-y-3 border-dashed border-2">
                    <p className="text-xs text-slate-400">No activities scheduled for Day {currentDay.day_number} yet.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Plus}
                      onClick={() => setIsAddActivityOpen(true)}
                      className="text-xs"
                    >
                      Add Activity to Day {currentDay.day_number}
                    </Button>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Complete Budget Management & Guidance */}
        <div className="space-y-6">
          {/* Requirement 4: Budget Management Card */}
          <Card className="space-y-4 border-slate-200/90 shadow-subtle">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-navy-900">Budget Management</h3>
              </div>
              <Badge variant="primary" size="sm">{trip.currency || 'USD'}</Badge>
            </div>

            {/* Over Budget Warning Banner */}
            {trip.is_over_budget && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900">
                  <p className="font-bold">Budget Warning</p>
                  <p className="mt-0.5">
                    Estimated total expenses exceed your planned budget by{' '}
                    <strong className="font-bold">
                      {Math.abs(trip.remaining_budget)?.toLocaleString()} {trip.currency}
                    </strong>. Consider trimming activities or choosing more affordable stays.
                  </p>
                </div>
              </div>
            )}

            {/* Itemized Budget Breakdown */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Total Planned Budget:</span>
                <span className="font-extrabold text-navy-900 text-sm">
                  {trip.budget?.toLocaleString()} {trip.currency}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <Hotel className="w-3.5 h-3.5 text-teal-600" />
                  Estimated Accommodation:
                </span>
                <span className="font-semibold text-slate-800">
                  {trip.estimated_accommodation_cost?.toLocaleString()} {trip.currency}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-sky-600" />
                  Estimated Dining / Food:
                </span>
                <span className="font-semibold text-slate-800">
                  {trip.estimated_food_cost?.toLocaleString()} {trip.currency}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-navy-700" />
                  Estimated Transportation:
                </span>
                <span className="font-semibold text-slate-800">
                  {trip.estimated_transport_cost?.toLocaleString()} {trip.currency}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-teal-700" />
                  Estimated Activities Total:
                </span>
                <span className="font-semibold text-slate-800">
                  {trip.estimated_activities_cost?.toLocaleString()} {trip.currency}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold">
                <span className="text-navy-900">Total Estimated Expenses:</span>
                <span className="text-base text-teal-800">
                  {trip.estimated_total_cost?.toLocaleString()} {trip.currency}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 font-semibold">Remaining Budget:</span>
                <span
                  className={`text-sm font-extrabold ${
                    trip.remaining_budget < 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {trip.remaining_budget >= 0 ? '+' : ''}
                  {trip.remaining_budget?.toLocaleString()} {trip.currency}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Est. Per Traveler ({trip.travelers} pax):</span>
                <span>~{costPerTraveler?.toLocaleString()} {trip.currency}</span>
              </div>

              {/* Budget Utilization Bar */}
              <div className="pt-3 space-y-1">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Budget Utilization</span>
                  <span className="font-semibold text-navy-900">{budgetUtilization}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      trip.is_over_budget ? 'bg-rose-500' : budgetUtilization > 85 ? 'bg-amber-500' : 'bg-teal-600'
                    }`}
                    style={{ width: `${Math.min(100, budgetUtilization)}%` }}
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-400 italic pt-2">
                Calculated from saved itinerary data. Amounts represent planning estimates rather than actual payments.
              </p>
            </div>
          </Card>

          {/* Curated Recommendations Guidance Card */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-navy-900">Day {currentDay?.day_number} Guidance</h3>
              </div>
              <button
                onClick={openEditDayModal}
                className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
              >
                Edit
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Accommodation */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                <div className="flex items-center gap-2 font-bold text-navy-900">
                  <Hotel className="w-4 h-4 text-teal-600" />
                  Accommodation Guidance
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {currentDay?.accommodation || `${trip.accommodation_pref || 'Hotel'} in a central, walkable district of ${trip.destination}.`}
                </p>
              </div>

              {/* Dining */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                <div className="flex items-center gap-2 font-bold text-navy-900">
                  <Utensils className="w-4 h-4 text-sky-600" />
                  Dining & Cuisine
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {currentDay?.dining_recommendations || `Local culinary hotspots with options for ${trip.dietary_pref || 'all diets'}.`}
                </p>
              </div>

              {/* Transportation */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                <div className="flex items-center gap-2 font-bold text-navy-900">
                  <Navigation className="w-4 h-4 text-navy-800" />
                  Transit & Mobility
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {currentDay?.transportation_notes || `Local transit & walking recommended for ${trip.destination}.`}
                </p>
              </div>
            </div>
          </Card>

          {/* User Preferences Card */}
          <Card className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Trip Preferences
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {trip.interests?.map((interest) => (
                <Badge key={interest} variant="neutral" size="sm" className="capitalize">
                  {interest}
                </Badge>
              ))}
              {trip.dietary_pref && trip.dietary_pref !== 'None / Flexible' && (
                <Badge variant="primary" size="sm">
                  Diet: {trip.dietary_pref}
                </Badge>
              )}
              {trip.accessibility_req && trip.accessibility_req !== 'None' && (
                <Badge variant="sky" size="sm">
                  Access: {trip.accessibility_req}
                </Badge>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* =========================================================================
          MODALS & DIALOGS
          ========================================================================= */}

      {/* 1. Full AI Generation Modal */}
      <Modal
        isOpen={isAIGenModalOpen}
        onClose={() => !isAIGenerating && setIsAIGenModalOpen(false)}
        title="Generate Itinerary with AI"
        subtitle={`Powered by WanderWise AI for ${trip.destination}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            WanderWise AI will analyze your dates, budget ({trip.budget} {trip.currency}), style, and group size to generate a complete, day-wise schedule with dining, stay, and transit recommendations.
          </p>

          <div>
            <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
              Custom Wishes or Instructions (Optional)
            </label>
            <textarea
              rows="3"
              disabled={isAIGenerating}
              placeholder="e.g. Focus on historic temples in the morning, authentic ramen spots for dinner, and scenic photo spots..."
              value={aiCustomPrompt}
              onChange={(e) => setAiCustomPrompt(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Progress Indicator */}
          {isAIGenerating && (
            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
                <Sparkles className="w-4 h-4 text-teal-600 animate-spin" />
                <span>Generating Your Itinerary...</span>
              </div>
              <p className="text-xs text-teal-800 animate-pulse">{aiProgressMessage}</p>
              <div className="w-full bg-teal-200/50 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-teal-600 rounded-full animate-indeterminate" style={{ width: '70%' }} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              disabled={isAIGenerating}
              onClick={() => setIsAIGenModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="teal"
              size="sm"
              icon={Sparkles}
              isLoading={isAIGenerating}
              disabled={isAIGenerating}
              onClick={handleAIGenerate}
              className="font-bold bg-gradient-to-r from-teal-600 to-emerald-600"
            >
              {isAIGenerating ? 'Generating...' : 'Start AI Generation'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2. Regenerate Single Day Modal */}
      <Modal
        isOpen={isDayGenModalOpen}
        onClose={() => !isDayGenerating && setIsDayGenModalOpen(false)}
        title={`Regenerate Day ${currentDay?.day_number}`}
        subtitle={`Fresh AI ideas for ${currentDay?.date}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-600">
            This will only recreate the schedule for <strong className="text-navy-900">Day {currentDay?.day_number}</strong> while keeping all other days exactly as they are.
          </p>

          <div>
            <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
              Instructions for this Day (Optional)
            </label>
            <textarea
              rows="3"
              disabled={isDayGenerating}
              placeholder="e.g. Change to indoor art galleries, peaceful botanical gardens, and an authentic local café..."
              value={dayCustomPrompt}
              onChange={(e) => setDayCustomPrompt(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {isDayGenerating && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-2 text-xs text-teal-800">
              <RefreshCw className="w-4 h-4 text-teal-600 animate-spin shrink-0" />
              <span>Regenerating Day {currentDay?.day_number} with AI recommendations...</span>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              disabled={isDayGenerating}
              onClick={() => setIsDayGenModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="teal"
              size="sm"
              icon={RefreshCw}
              isLoading={isDayGenerating}
              disabled={isDayGenerating}
              onClick={handleRegenerateDay}
              className="font-bold"
            >
              Regenerate Day
            </Button>
          </div>
        </div>
      </Modal>

      {/* 3. Add Activity Modal */}
      <Modal
        isOpen={isAddActivityOpen}
        onClose={() => setIsAddActivityOpen(false)}
        title={`Add Activity to Day ${currentDay?.day_number}`}
        subtitle="Schedule a new attraction, meal, or experience"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAddActivity} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
                Time Slot <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 10:00 AM or Morning"
                value={activityFormData.time_slot}
                onChange={(e) => setActivityFormData({ ...activityFormData, time_slot: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={activityFormData.category}
                onChange={(e) => setActivityFormData({ ...activityFormData, category: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 capitalize"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
              Activity Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Shibuya Sky Observation Deck"
              value={activityFormData.title}
              onChange={(e) => setActivityFormData({ ...activityFormData, title: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
                Location
              </label>
              <input
                type="text"
                placeholder="e.g. Shibuya, Tokyo"
                value={activityFormData.location}
                onChange={(e) => setActivityFormData({ ...activityFormData, location: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
                Est. Cost ({trip.currency})
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={activityFormData.estimated_cost}
                onChange={(e) => setActivityFormData({ ...activityFormData, estimated_cost: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
              Description & Notes
            </label>
            <textarea
              rows="3"
              placeholder="e.g. Enjoy panoramic 360-degree views of Tokyo skyline at sunset..."
              value={activityFormData.description}
              onChange={(e) => setActivityFormData({ ...activityFormData, description: e.target.value })}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setIsAddActivityOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="teal"
              size="sm"
              type="submit"
              isLoading={addingActivity}
              className="font-bold"
            >
              Add Activity
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Edit Activity Modal */}
      <Modal
        isOpen={Boolean(activityToEdit)}
        onClose={() => setActivityToEdit(null)}
        title="Edit Activity"
        subtitle="Modify schedule, cost, or description"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleUpdateActivity} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
                Time Slot
              </label>
              <input
                type="text"
                required
                value={editActivityForm.time_slot}
                onChange={(e) => setEditActivityForm({ ...editActivityForm, time_slot: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={editActivityForm.category}
                onChange={(e) => setEditActivityForm({ ...editActivityForm, category: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 capitalize"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
              Title
            </label>
            <input
              type="text"
              required
              value={editActivityForm.title}
              onChange={(e) => setEditActivityForm({ ...editActivityForm, title: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
                Location
              </label>
              <input
                type="text"
                value={editActivityForm.location}
                onChange={(e) => setEditActivityForm({ ...editActivityForm, location: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
                Est. Cost ({trip.currency})
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={editActivityForm.estimated_cost}
                onChange={(e) => setEditActivityForm({ ...editActivityForm, estimated_cost: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows="3"
              value={editActivityForm.description}
              onChange={(e) => setEditActivityForm({ ...editActivityForm, description: e.target.value })}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setActivityToEdit(null)}
            >
              Cancel
            </Button>
            <Button
              variant="teal"
              size="sm"
              type="submit"
              isLoading={updatingActivity}
              className="font-bold"
            >
              Save Activity
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Delete Activity Confirmation Modal */}
      <Modal
        isOpen={Boolean(activityToDelete)}
        onClose={() => setActivityToDelete(null)}
        title="Remove Activity"
        subtitle="Confirm removal"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-600">
            Are you sure you want to remove <strong className="text-navy-900">"{activityToDelete?.title}"</strong> from Day {currentDay?.day_number}? Your itinerary budget totals will be recalculated automatically.
          </p>
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              disabled={deletingActivity}
              onClick={() => setActivityToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={deletingActivity}
              onClick={handleDeleteActivity}
            >
              Remove Activity
            </Button>
          </div>
        </div>
      </Modal>

      {/* 6. Edit Day Notes Modal */}
      <Modal
        isOpen={isEditDayModalOpen}
        onClose={() => setIsEditDayModalOpen(false)}
        title={`Edit Day ${currentDay?.day_number} Guidance & Notes`}
        subtitle="Update summary, lodging, dining, transit and estimated day costs"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleUpdateDay} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
              Day Title
            </label>
            <input
              type="text"
              required
              value={editDayForm.title}
              onChange={(e) => setEditDayForm({ ...editDayForm, title: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
              Day Summary
            </label>
            <textarea
              rows="2"
              value={editDayForm.summary}
              onChange={(e) => setEditDayForm({ ...editDayForm, summary: e.target.value })}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
              Accommodation Guidance
            </label>
            <input
              type="text"
              value={editDayForm.accommodation}
              onChange={(e) => setEditDayForm({ ...editDayForm, accommodation: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
              Dining Recommendations
            </label>
            <input
              type="text"
              value={editDayForm.dining_recommendations}
              onChange={(e) => setEditDayForm({ ...editDayForm, dining_recommendations: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
              Transportation Notes
            </label>
            <input
              type="text"
              value={editDayForm.transportation_notes}
              onChange={(e) => setEditDayForm({ ...editDayForm, transportation_notes: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stay Cost</label>
              <input
                type="number"
                min="0"
                value={editDayForm.accommodation_cost}
                onChange={(e) => setEditDayForm({ ...editDayForm, accommodation_cost: e.target.value })}
                className="w-full px-2 py-1.5 text-xs bg-slate-50 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Food Cost</label>
              <input
                type="number"
                min="0"
                value={editDayForm.dining_cost}
                onChange={(e) => setEditDayForm({ ...editDayForm, dining_cost: e.target.value })}
                className="w-full px-2 py-1.5 text-xs bg-slate-50 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transit Cost</label>
              <input
                type="number"
                min="0"
                value={editDayForm.transport_cost}
                onChange={(e) => setEditDayForm({ ...editDayForm, transport_cost: e.target.value })}
                className="w-full px-2 py-1.5 text-xs bg-slate-50 border rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setIsEditDayModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="teal"
              size="sm"
              type="submit"
              isLoading={updatingDay}
              className="font-bold"
            >
              Save Day
            </Button>
          </div>
        </form>
      </Modal>

      {/* 7. Reset Plan Baseline Confirmation Modal */}
      <Modal
        isOpen={isRegenConfirmOpen}
        onClose={() => setIsRegenConfirmOpen(false)}
        title="Reset Itinerary Plan"
        subtitle="Confirmation required"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-600">
            Are you sure you want to reset all days to the baseline template schedule? Any custom edits you made will be replaced.
          </p>
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              disabled={regeneratingBaseline}
              onClick={() => setIsRegenConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="teal"
              size="sm"
              isLoading={regeneratingBaseline}
              onClick={handleRegenerateBaseline}
              className="font-bold"
            >
              Reset Plan
            </Button>
          </div>
        </div>
      </Modal>

      {/* 8. Edit Trip Modal */}
      <Modal
        isOpen={isEditTripModalOpen}
        onClose={() => setIsEditTripModalOpen(false)}
        title="Edit Trip Details"
        subtitle="Update budget, status, or itinerary notes"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleUpdateTrip} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
              Trip Title
            </label>
            <input
              type="text"
              required
              value={editFormData.title}
              onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
                Budget ({trip.currency})
              </label>
              <input
                type="number"
                min="0"
                value={editFormData.budget}
                onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
                Trip Status
              </label>
              <select
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
              >
                <option value="draft">Draft</option>
                <option value="planned">Planned</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
              Notes
            </label>
            <textarea
              rows="3"
              value={editFormData.additional_notes}
              onChange={(e) => setEditFormData({ ...editFormData, additional_notes: e.target.value })}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setIsEditTripModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="teal"
              size="sm"
              type="submit"
              isLoading={updatingTrip}
              className="font-bold"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* 9. Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Trip"
        subtitle="Permanent action"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-600">
            Are you sure you want to delete <strong className="text-navy-900">{trip.title || trip.destination}</strong>? All generated day-by-day activities and cost records will be permanently removed.
          </p>
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              disabled={deletingTrip}
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={deletingTrip}
              onClick={handleDeleteTrip}
            >
              Delete Trip
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
