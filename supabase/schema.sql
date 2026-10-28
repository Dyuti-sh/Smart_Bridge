-- ==============================================================================
-- WanderWise AI - Database Schema for Supabase
-- Part 1 & Part 2: Schema, Foreign Keys, RLS Policies, AI & Budget Columns, and Triggers
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- Extends Supabase auth.users with public profile information
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 2. TRIPS TABLE
-- Stores primary trip metadata, user preferences, budget, and dates
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- references auth.users(id) or profiles(id)
    title TEXT NOT NULL,
    destination TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    travelers INTEGER NOT NULL DEFAULT 1 CHECK (travelers > 0),
    budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (budget >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    travel_style TEXT NOT NULL DEFAULT 'balanced' CHECK (travel_style IN ('budget', 'balanced', 'luxury')),
    interests TEXT[] NOT NULL DEFAULT '{}',
    pace TEXT NOT NULL DEFAULT 'balanced' CHECK (pace IN ('relaxed', 'balanced', 'packed')),
    accommodation_pref TEXT,
    dietary_pref TEXT,
    accessibility_req TEXT,
    additional_notes TEXT,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('draft', 'planned', 'ongoing', 'completed')),
    cover_image_url TEXT,
    
    -- Part 2: Budget Breakdown & AI metadata
    estimated_accommodation_cost NUMERIC(12, 2) DEFAULT 0.00,
    estimated_food_cost NUMERIC(12, 2) DEFAULT 0.00,
    estimated_transport_cost NUMERIC(12, 2) DEFAULT 0.00,
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_provider TEXT DEFAULT '',
    ai_model TEXT DEFAULT '',
    disclaimer TEXT DEFAULT '',
    
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON public.trips(start_date);

-- -----------------------------------------------------------------------------
-- 3. ITINERARY_DAYS TABLE
-- Stores day-by-day structure for a trip
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.itinerary_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL CHECK (day_number > 0),
    date DATE NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    accommodation TEXT,
    dining_recommendations TEXT,
    transportation_notes TEXT,
    
    -- Part 2: Day-level cost estimates
    accommodation_cost NUMERIC(10, 2) DEFAULT 0.00,
    dining_cost NUMERIC(10, 2) DEFAULT 0.00,
    transport_cost NUMERIC(10, 2) DEFAULT 0.00,
    
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE (trip_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_itinerary_days_trip_id ON public.itinerary_days(trip_id);

-- -----------------------------------------------------------------------------
-- 4. ITINERARY_ACTIVITIES TABLE
-- Individual scheduled activities, sights, meals, and adventures per day
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.itinerary_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_id UUID NOT NULL REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
    time_slot TEXT NOT NULL, -- e.g. "09:00 AM", "Morning", "Afternoon", "Evening"
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    category TEXT NOT NULL DEFAULT 'sightseeing', -- sightseeing, dining, adventure, culture, relaxation, shopping, nightlife
    estimated_cost NUMERIC(10, 2) DEFAULT 0.00 CHECK (estimated_cost >= 0),
    currency TEXT DEFAULT 'USD',
    booking_url TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activities_day_id ON public.itinerary_activities(day_id);

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict isolation: users can only see and modify their own trips & activities
-- -----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_activities ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Trips policies
CREATE POLICY "Users can view own trips" 
    ON public.trips FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trips" 
    ON public.trips FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips" 
    ON public.trips FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" 
    ON public.trips FOR DELETE 
    USING (auth.uid() = user_id);

-- Itinerary Days policies (cascaded via trip ownership)
CREATE POLICY "Users can view own trip days" 
    ON public.itinerary_days FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.trips 
        WHERE public.trips.id = public.itinerary_days.trip_id 
        AND public.trips.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own trip days" 
    ON public.itinerary_days FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.trips 
        WHERE public.trips.id = public.itinerary_days.trip_id 
        AND public.trips.user_id = auth.uid()
    ));

CREATE POLICY "Users can update own trip days" 
    ON public.itinerary_days FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM public.trips 
        WHERE public.trips.id = public.itinerary_days.trip_id 
        AND public.trips.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete own trip days" 
    ON public.itinerary_days FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM public.trips 
        WHERE public.trips.id = public.itinerary_days.trip_id 
        AND public.trips.user_id = auth.uid()
    ));

-- Itinerary Activities policies (cascaded via day -> trip ownership)
CREATE POLICY "Users can view own activities" 
    ON public.itinerary_activities FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.itinerary_days 
        JOIN public.trips ON public.trips.id = public.itinerary_days.trip_id
        WHERE public.itinerary_days.id = public.itinerary_activities.day_id 
        AND public.trips.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own activities" 
    ON public.itinerary_activities FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.itinerary_days 
        JOIN public.trips ON public.trips.id = public.itinerary_days.trip_id
        WHERE public.itinerary_days.id = public.itinerary_activities.day_id 
        AND public.trips.user_id = auth.uid()
    ));

CREATE POLICY "Users can update own activities" 
    ON public.itinerary_activities FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM public.itinerary_days 
        JOIN public.trips ON public.trips.id = public.itinerary_days.trip_id
        WHERE public.itinerary_days.id = public.itinerary_activities.day_id 
        AND public.trips.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete own activities" 
    ON public.itinerary_activities FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM public.itinerary_days 
        JOIN public.trips ON public.trips.id = public.itinerary_days.trip_id
        WHERE public.itinerary_days.id = public.itinerary_activities.day_id 
        AND public.trips.user_id = auth.uid()
    ));

-- -----------------------------------------------------------------------------
-- 6. AUTOMATIC PROFILE CREATION TRIGGER
-- Whenever a new user signs up via Supabase Auth, populate public.profiles
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for auto-updating updated_at timestamp on trips
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_trips_updated_at ON public.trips;
CREATE TRIGGER trigger_trips_updated_at
    BEFORE UPDATE ON public.trips
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
