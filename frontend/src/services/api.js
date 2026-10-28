import { authService } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Attach Supabase auth token if available
  try {
    const session = await authService.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
      headers['X-User-Id'] = session.user.id;
    }
  } catch (err) {
    // Non-blocking in dev mode
  }

  const config = {
    ...options,
    headers,
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    throw new Error(
      `Cannot connect to FastAPI backend at ${API_BASE_URL}. Ensure the backend is running with 'uvicorn app.main:app --reload'.`
    );
  }

  // Handle No Content response
  if (response.status === 204) {
    return null;
  }

  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    data = null;
  }

  if (!response.ok) {
    let errorMsg = 'An unexpected error occurred';
    if (data && typeof data === 'object') {
      if (typeof data.detail === 'string') {
        errorMsg = data.detail;
      } else if (Array.isArray(data.detail)) {
        // FastAPI / Pydantic validation error array
        errorMsg = data.detail.map((err) => `${err.loc?.slice(1)?.join('.') || 'field'}: ${err.msg}`).join(', ');
      }
    }
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // System Health & AI Provider Status
  async getHealth() {
    return request('/health');
  },

  // Trips CRUD
  async getTrips(allUsers = false) {
    const query = allUsers ? '?all_users=true' : '';
    return request(`/trips${query}`);
  },

  async getTrip(tripId) {
    return request(`/trips/${tripId}`);
  },

  async createTrip(tripData) {
    return request('/trips', {
      method: 'POST',
      body: JSON.stringify(tripData),
    });
  },

  async updateTrip(tripId, updates) {
    return request(`/trips/${tripId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteTrip(tripId) {
    return request(`/trips/${tripId}`, {
      method: 'DELETE',
    });
  },

  // Baseline Template Regeneration
  async regenerateItinerary(tripId) {
    return request(`/trips/${tripId}/regenerate`, {
      method: 'POST',
    });
  },

  // Part 2: Generative AI Endpoints
  async generateAIItinerary(tripId, customInstructions = '') {
    return request(`/trips/${tripId}/generate`, {
      method: 'POST',
      body: JSON.stringify({ custom_instructions: customInstructions }),
    });
  },

  async generateAIDay(tripId, dayNumber, customInstructions = '') {
    return request(`/trips/${tripId}/generate-day`, {
      method: 'POST',
      body: JSON.stringify({
        day_number: Number(dayNumber),
        custom_instructions: customInstructions,
      }),
    });
  },

  // Part 2: Granular Interactive Itinerary Management
  async updateDay(tripId, dayId, dayUpdates) {
    return request(`/trips/${tripId}/days/${dayId}`, {
      method: 'PUT',
      body: JSON.stringify(dayUpdates),
    });
  },

  async addActivity(tripId, dayId, activityData) {
    return request(`/trips/${tripId}/days/${dayId}/activities`, {
      method: 'POST',
      body: JSON.stringify(activityData),
    });
  },

  async updateActivity(tripId, activityId, activityUpdates) {
    return request(`/trips/${tripId}/activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(activityUpdates),
    });
  },

  async deleteActivity(tripId, activityId) {
    return request(`/trips/${tripId}/activities/${activityId}`, {
      method: 'DELETE',
    });
  },

  async getStats() {
    return request('/trips/stats/summary');
  },
};
