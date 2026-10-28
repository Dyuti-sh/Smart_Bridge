import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import TripBuilderPage from './pages/TripBuilderPage';
import TripDetailsPage from './pages/TripDetailsPage';

function MainApp() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'dashboard' | 'builder' | 'trip-details'
  const [activeTripId, setActiveTripId] = useState(null);
  const [prefilledDestination, setPrefilledDestination] = useState('');

  const handleNavigate = (view, tripId = null) => {
    setCurrentView(view);
    if (tripId) {
      setActiveTripId(tripId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlanTrip = (destination = '') => {
    setPrefilledDestination(destination);
    setCurrentView('builder');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTrip = (tripId) => {
    setActiveTripId(tripId);
    setCurrentView('trip-details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTripCreated = (newTripId) => {
    setActiveTripId(newTripId);
    setCurrentView('trip-details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTripDeleted = () => {
    setActiveTripId(null);
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navigation */}
      <Navbar currentView={currentView} onNavigate={handleNavigate} />

      {/* Main Content Area */}
      {currentView === 'landing' ? (
        <main className="flex-1">
          <LandingPage
            onPlanTrip={handlePlanTrip}
            onSelectDestination={handlePlanTrip}
          />
        </main>
      ) : (
        <div className="flex-1 flex max-w-7xl w-full mx-auto">
          {/* Desktop Sidebar Navigation */}
          <Sidebar
            currentView={currentView}
            onNavigate={handleNavigate}
            activeTripId={activeTripId}
          />

          {/* Subpage Container */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
            {currentView === 'dashboard' && (
              <DashboardPage
                onNavigate={handleNavigate}
                onSelectTrip={handleSelectTrip}
              />
            )}

            {currentView === 'builder' && (
              <TripBuilderPage
                initialDestination={prefilledDestination}
                onTripCreated={handleTripCreated}
                onCancel={() => handleNavigate('dashboard')}
              />
            )}

            {currentView === 'trip-details' && activeTripId && (
              <TripDetailsPage
                tripId={activeTripId}
                onBack={() => handleNavigate('dashboard')}
                onTripDeleted={handleTripDeleted}
              />
            )}
          </main>
        </div>
      )}

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}
