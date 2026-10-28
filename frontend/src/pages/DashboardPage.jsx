import React, { useState, useEffect } from 'react';
import {
  Plus,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  Users,
  Compass,
  Trash2,
  Edit3,
  ArrowRight,
  Search,
  Filter,
  Sparkles,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

export default function DashboardPage({ onNavigate, onSelectTrip }) {
  const { user } = useAuth();
  const toast = useToast();

  const [trips, setTrips] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Delete trip modal state
  const [tripToDelete, setTripToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Edit trip modal state
  const [tripToEdit, setTripToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    budget: 0,
    status: 'planned',
    additional_notes: '',
  });
  const [updating, setUpdating] = useState(false);

  // Regenerate modal state
  const [tripToRegenerate, setTripToRegenerate] = useState(null);
  const [regenCustomPrompt, setRegenCustomPrompt] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tripsData, statsData] = await Promise.all([
        api.getTrips(),
        api.getStats().catch(() => null),
      ]);
      setTrips(tripsData || []);
      setStats(statsData);
    } catch (err) {
      setError(err.message || 'Failed to load trips from FastAPI backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDeleteTrip = async () => {
    if (!tripToDelete) return;
    setDeleting(true);
    try {
      await api.deleteTrip(tripToDelete.id);
      toast.success(`Deleted "${tripToDelete.title || tripToDelete.destination}".`);
      setTrips((prev) => prev.filter((t) => t.id !== tripToDelete.id));
      setTripToDelete(null);
      // Refresh stats
      api.getStats().then(setStats).catch(() => {});
    } catch (err) {
      toast.error(err.message || 'Could not delete trip.');
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (trip) => {
    setTripToEdit(trip);
    setEditFormData({
      title: trip.title || '',
      budget: trip.budget || 0,
      status: trip.status || 'planned',
      additional_notes: trip.additional_notes || '',
    });
  };

  const handleUpdateTrip = async (e) => {
    e.preventDefault();
    if (!tripToEdit) return;
    setUpdating(true);
    try {
      const updated = await api.updateTrip(tripToEdit.id, {
        title: editFormData.title,
        budget: Number(editFormData.budget),
        status: editFormData.status,
        additional_notes: editFormData.additional_notes,
      });
      toast.success(`Updated "${updated.title || updated.destination}".`);
      setTrips((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
      setTripToEdit(null);
      api.getStats().then(setStats).catch(() => {});
    } catch (err) {
      toast.error(err.message || 'Failed to update trip.');
    } finally {
      setUpdating(false);
    }
  };

  const handleRegenerateTrip = async () => {
    if (!tripToRegenerate) return;
    setRegenerating(true);
    try {
      const updated = await api.generateAIItinerary(tripToRegenerate.id, regenCustomPrompt.trim());
      toast.success(`AI itinerary regenerated for "${updated.destination}"!`);
      setTrips((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
      setTripToRegenerate(null);
      setRegenCustomPrompt('');
    } catch (err) {
      toast.error(err.message || 'Could not regenerate trip.');
    } finally {
      setRegenerating(false);
    }
  };

  // Filtered and sorted trips
  const filteredTrips = trips
    .filter((t) => {
      const matchesSearch =
        !searchFilter.trim() ||
        (t.destination && t.destination.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (t.title && t.title.toLowerCase().includes(searchFilter.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesStyle = styleFilter === 'all' || t.travel_style === styleFilter;
      return matchesSearch && matchesStatus && matchesStyle;
    })
    .sort((a, b) => {
      if (sortBy === 'budget_high') return (b.budget || 0) - (a.budget || 0);
      if (sortBy === 'duration') return (b.duration_days || 0) - (a.duration_days || 0);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

  return (
    <div className="space-y-8">
      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
              Welcome back, {user?.user_metadata?.full_name || 'Explorer'}!
            </h1>
            <Badge variant="navy" size="sm">Travel Dashboard</Badge>
          </div>
          <p className="text-sm text-slate-500">
            Track your upcoming adventures, manage itineraries, and budget effectively.
          </p>
        </div>

        <Button
          variant="teal"
          size="md"
          icon={Plus}
          onClick={() => onNavigate('builder')}
          className="font-semibold shadow-sm shrink-0 bg-gradient-to-r from-teal-600 to-emerald-600"
        >
          Create New Trip
        </Button>
      </div>

      {/* Quick Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card padding="p-5" className="border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Trips
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-navy-900 mt-2">
            {stats ? stats.total_trips : trips.length}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">All recorded itineraries</span>
        </Card>

        <Card padding="p-5" className="border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Upcoming
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-navy-900 mt-2">
            {stats ? stats.upcoming_trips : trips.filter((t) => t.status === 'planned').length}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">Ready for departure</span>
        </Card>

        <Card padding="p-5" className="border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Budget
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-navy-900 mt-2">
            ${stats ? stats.total_budget_planned?.toLocaleString() : '0'}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">Planned across trips</span>
        </Card>

        <Card padding="p-5" className="border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Destinations
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-navy-900 mt-2">
            {stats ? stats.destinations_count : new Set(trips.map((t) => t.destination?.toLowerCase())).size}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">Unique cities explored</span>
        </Card>
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search trips by destination or title..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              {[
                { id: 'all', label: 'All Status' },
                { id: 'planned', label: 'Planned' },
                { id: 'ongoing', label: 'Ongoing' },
                { id: 'completed', label: 'Completed' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === tab.id
                      ? 'bg-navy-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-navy-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Travel Style Filter */}
            <select
              value={styleFilter}
              onChange={(e) => setStyleFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:bg-white"
            >
              <option value="all">All Styles</option>
              <option value="budget">Budget</option>
              <option value="balanced">Balanced</option>
              <option value="luxury">Luxury</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:bg-white"
            >
              <option value="newest">Sort: Newest</option>
              <option value="budget_high">Sort: Budget (High-Low)</option>
              <option value="duration">Sort: Duration</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-rose-800">
            <p className="font-semibold text-rose-900">Backend Connection Error</p>
            <p className="mt-0.5">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 animate-pulse shadow-subtle"
            >
              <div className="h-44 bg-slate-100 rounded-xl" />
              <div className="h-5 bg-slate-100 rounded w-2/3" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-9 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredTrips.length === 0 ? (
        /* Empty State */
        <Card className="text-center py-16 px-6 max-w-2xl mx-auto space-y-5 border-dashed border-2">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
            <Compass className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-navy-900">
              {searchFilter || statusFilter !== 'all' || styleFilter !== 'all'
                ? 'No matching trips found'
                : 'No trips planned yet'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              {searchFilter || statusFilter !== 'all' || styleFilter !== 'all'
                ? 'Try modifying your search query or clear your active filters.'
                : 'Start your journey by creating and generating your first custom travel itinerary with WanderWise AI.'}
            </p>
          </div>

          <div className="pt-2">
            <Button
              variant="teal"
              size="md"
              icon={Plus}
              onClick={() => onNavigate('builder')}
              className="font-semibold shadow-sm"
            >
              Create Your First Trip
            </Button>
          </div>
        </Card>
      ) : (
        /* Trip Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips.map((trip) => (
            <div
              key={trip.id}
              className="group bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-subtle hover:shadow-card hover:border-slate-300 transition-all duration-200 flex flex-col justify-between"
            >
              {/* Cover Image & Badges */}
              <div className="relative h-44 overflow-hidden bg-slate-100">
                <img
                  src={
                    trip.cover_image_url ||
                    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'
                  }
                  alt={trip.destination}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <Badge variant="navy" size="sm" className="bg-navy-900/85 backdrop-blur-md text-white border-none font-bold">
                    {trip.destination}
                  </Badge>
                  {trip.ai_generated && (
                    <Badge variant="primary" size="sm" className="bg-teal-600/90 backdrop-blur-md text-white border-none font-semibold">
                      <Sparkles className="w-3 h-3 text-teal-200" />
                      AI
                    </Badge>
                  )}
                </div>
                <div className="absolute top-3 right-3">
                  <Badge
                    variant={
                      trip.status === 'completed'
                        ? 'success'
                        : trip.status === 'ongoing'
                        ? 'sky'
                        : 'primary'
                    }
                    size="sm"
                    className="capitalize font-semibold shadow-subtle"
                  >
                    {trip.status}
                  </Badge>
                </div>
              </div>

              {/* Card Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h3
                    onClick={() => onSelectTrip(trip.id)}
                    className="text-base font-bold text-navy-900 hover:text-teal-600 transition-colors cursor-pointer line-clamp-1"
                  >
                    {trip.title || `Trip to ${trip.destination}`}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {trip.start_date} → {trip.end_date}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-slate-700">
                      {trip.duration_days ? `${trip.duration_days} Days` : ''}
                    </span>
                  </div>
                </div>

                {/* Key Metrics Pill Bar */}
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Planned Budget</span>
                    <span className="font-extrabold text-navy-900">
                      {trip.budget?.toLocaleString()} {trip.currency || 'USD'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Travel Style</span>
                    <span className="font-semibold text-slate-700 capitalize">
                      {trip.travel_style || 'Balanced'}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons (Open, Edit, Regenerate, Delete) */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <Button
                    variant="teal"
                    size="sm"
                    className="flex-1 font-semibold text-xs"
                    icon={ArrowRight}
                    iconPosition="right"
                    onClick={() => onSelectTrip(trip.id)}
                  >
                    Open Plan
                  </Button>

                  <button
                    onClick={() => openEditModal(trip)}
                    className="p-2 text-slate-400 hover:text-navy-900 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Edit Trip Details"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setTripToRegenerate(trip)}
                    className="p-2 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-colors"
                    title="Regenerate Plan with AI"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setTripToDelete(trip)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200"
                    title="Delete Trip"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(tripToDelete)}
        onClose={() => setTripToDelete(null)}
        title="Confirm Trip Deletion"
        subtitle="This action cannot be undone"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-600">
            Are you sure you want to delete{' '}
            <strong className="text-navy-900">
              "{tripToDelete?.title || tripToDelete?.destination}"
            </strong>
            ? All day-wise itinerary activities and stored records will be permanently removed.
          </p>
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              disabled={deleting}
              onClick={() => setTripToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={deleting}
              onClick={handleDeleteTrip}
            >
              Yes, Delete Trip
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Trip Modal */}
      <Modal
        isOpen={Boolean(tripToEdit)}
        onClose={() => setTripToEdit(null)}
        title="Edit Trip Details"
        subtitle={`Update ${tripToEdit?.destination} trip`}
        maxWidth="max-w-md"
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
                Budget ({tripToEdit?.currency || 'USD'})
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
                Status
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
              Trip Notes
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
              onClick={() => setTripToEdit(null)}
            >
              Cancel
            </Button>
            <Button
              variant="teal"
              size="sm"
              type="submit"
              isLoading={updating}
              className="font-bold"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Regenerate AI Modal */}
      <Modal
        isOpen={Boolean(tripToRegenerate)}
        onClose={() => !regenerating && setTripToRegenerate(null)}
        title="Regenerate Itinerary with AI"
        subtitle={`Fresh AI schedule for ${tripToRegenerate?.destination}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            WanderWise AI will recreate the day-wise itinerary for <strong className="text-navy-900">{tripToRegenerate?.title || tripToRegenerate?.destination}</strong>. Existing activities will be refreshed.
          </p>

          <div>
            <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1">
              Custom Instructions (Optional)
            </label>
            <textarea
              rows="3"
              disabled={regenerating}
              placeholder="e.g. Focus on outdoor nature walks, historic museums, and budget street eats..."
              value={regenCustomPrompt}
              onChange={(e) => setRegenCustomPrompt(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              disabled={regenerating}
              onClick={() => setTripToRegenerate(null)}
            >
              Cancel
            </Button>
            <Button
              variant="teal"
              size="sm"
              icon={Sparkles}
              isLoading={regenerating}
              disabled={regenerating}
              onClick={handleRegenerateTrip}
              className="font-bold bg-gradient-to-r from-teal-600 to-emerald-600"
            >
              {regenerating ? 'Regenerating...' : 'Regenerate Now'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
