# WanderWise AI – Supabase Setup Guide

This folder contains the complete SQL schema migrations and policies required to configure Supabase for WanderWise AI.

---

## 1. Quick Setup in Supabase

1. Log in or create a free account at [https://supabase.com](https://supabase.com).
2. Create a new project (e.g. `wanderwise-ai`).
3. Navigate to **SQL Editor** in the left sidebar.
4. Click **New query**, open [schema.sql](./schema.sql), copy its entire content, paste it into the editor, and click **Run**.
5. Once completed, your database tables (`profiles`, `trips`, `itinerary_days`, `itinerary_activities`) and security policies will be active.

---

## 2. Obtain Your API Keys

1. In your Supabase project dashboard, navigate to **Project Settings** (gear icon) -> **API**.
2. Copy the following keys:
   - **Project URL** (e.g., `https://xyzcompany.supabase.co`)
   - **anon / public key** (safe for frontend use)
   - **service_role key** (secret key for backend administration)

---

## 3. Plug Keys into WanderWise AI

### In `backend/.env`:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_KEY=your-service-role-secret-key
```

### In `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000/api
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

---

## 4. Development Mode Fallback

If Supabase credentials are not provided, WanderWise AI automatically runs in **Development Mode**:
- Backend uses an embedded **SQLite database** (`wanderwise.db`) with the exact same relational tables, foreign key cascades, and full CRUD persistence.
- Frontend displays an informational setup banner and allows creating, editing, regenerating, and deleting trips without interruption.
