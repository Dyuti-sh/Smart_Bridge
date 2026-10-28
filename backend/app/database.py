import sqlite3
import json
import logging
from datetime import datetime, date
from typing import Dict, Any, List, Optional
import uuid

from app.config import settings

logger = logging.getLogger("wanderwise.database")

# Optional Supabase client import
supabase_client = None
if settings.is_supabase_configured:
    try:
        from supabase import create_client, Client
        key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_ANON_KEY
        supabase_client = create_client(settings.SUPABASE_URL, key)
        logger.info("Successfully connected to Supabase client.")
    except Exception as e:
        logger.warning(f"Could not initialize Supabase client: {e}. Falling back to SQLite local database.")

class DatabaseManager:
    """
    Unified database access layer supporting both:
    1. Supabase PostgreSQL (Cloud production)
    2. SQLite (Zero-dependency local persistence for development & reliable testing)
    """

    def __init__(self):
        self.sqlite_path = settings.SQLITE_DB_PATH
        self._init_sqlite()

    def is_supabase_active(self) -> bool:
        return bool(supabase_client is not None and settings.is_supabase_configured)

    def get_status_info(self) -> Dict[str, Any]:
        return {
            "mode": "supabase" if self.is_supabase_active() else "sqlite_local",
            "supabase_configured": settings.is_supabase_configured,
            "sqlite_path": self.sqlite_path,
            "connected": True
        }

    def _get_sqlite_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.sqlite_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _init_sqlite(self):
        """Initializes tables in SQLite matching Supabase schema with Part 2 AI & budget columns."""
        conn = self._get_sqlite_conn()
        cursor = conn.cursor()

        cursor.executescript("""
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT,
            avatar_url TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS trips (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            destination TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            travelers INTEGER NOT NULL DEFAULT 1,
            budget REAL NOT NULL DEFAULT 0.0,
            currency TEXT NOT NULL DEFAULT 'USD',
            travel_style TEXT NOT NULL DEFAULT 'balanced',
            interests TEXT NOT NULL DEFAULT '[]',
            pace TEXT NOT NULL DEFAULT 'balanced',
            accommodation_pref TEXT,
            dietary_pref TEXT,
            accessibility_req TEXT,
            additional_notes TEXT,
            status TEXT NOT NULL DEFAULT 'planned',
            cover_image_url TEXT,
            estimated_accommodation_cost REAL DEFAULT 0.0,
            estimated_food_cost REAL DEFAULT 0.0,
            estimated_transport_cost REAL DEFAULT 0.0,
            ai_generated INTEGER DEFAULT 0,
            ai_provider TEXT DEFAULT '',
            ai_model TEXT DEFAULT '',
            disclaimer TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS itinerary_days (
            id TEXT PRIMARY KEY,
            trip_id TEXT NOT NULL,
            day_number INTEGER NOT NULL,
            date TEXT NOT NULL,
            title TEXT NOT NULL,
            summary TEXT,
            accommodation TEXT,
            dining_recommendations TEXT,
            transportation_notes TEXT,
            accommodation_cost REAL DEFAULT 0.0,
            dining_cost REAL DEFAULT 0.0,
            transport_cost REAL DEFAULT 0.0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS itinerary_activities (
            id TEXT PRIMARY KEY,
            day_id TEXT NOT NULL,
            time_slot TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            location TEXT,
            category TEXT NOT NULL DEFAULT 'sightseeing',
            estimated_cost REAL NOT NULL DEFAULT 0.0,
            currency TEXT DEFAULT 'USD',
            booking_url TEXT,
            order_index INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (day_id) REFERENCES itinerary_days(id) ON DELETE CASCADE
        );
        """)

        # Add missing columns if updating existing database from Part 1
        cursor.execute("PRAGMA table_info(trips)")
        existing_trip_cols = [row["name"] for row in cursor.fetchall()]
        trip_cols_to_add = [
            ("estimated_accommodation_cost", "REAL DEFAULT 0.0"),
            ("estimated_food_cost", "REAL DEFAULT 0.0"),
            ("estimated_transport_cost", "REAL DEFAULT 0.0"),
            ("ai_generated", "INTEGER DEFAULT 0"),
            ("ai_provider", "TEXT DEFAULT ''"),
            ("ai_model", "TEXT DEFAULT ''"),
            ("disclaimer", "TEXT DEFAULT ''"),
        ]
        for col_name, col_type in trip_cols_to_add:
            if col_name not in existing_trip_cols:
                try:
                    cursor.execute(f"ALTER TABLE trips ADD COLUMN {col_name} {col_type}")
                except Exception:
                    pass

        cursor.execute("PRAGMA table_info(itinerary_days)")
        existing_day_cols = [row["name"] for row in cursor.fetchall()]
        day_cols_to_add = [
            ("accommodation_cost", "REAL DEFAULT 0.0"),
            ("dining_cost", "REAL DEFAULT 0.0"),
            ("transport_cost", "REAL DEFAULT 0.0"),
        ]
        for col_name, col_type in day_cols_to_add:
            if col_name not in existing_day_cols:
                try:
                    cursor.execute(f"ALTER TABLE itinerary_days ADD COLUMN {col_name} {col_type}")
                except Exception:
                    pass

        # Ensure demo profile exists for seamless dev mode
        cursor.execute("SELECT id FROM profiles WHERE id = ?", (settings.DEFAULT_DEV_USER_ID,))
        if not cursor.fetchone():
            now_iso = datetime.utcnow().isoformat()
            cursor.execute(
                "INSERT INTO profiles (id, email, full_name, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (settings.DEFAULT_DEV_USER_ID, settings.DEFAULT_DEV_USER_EMAIL, settings.DEFAULT_DEV_USER_NAME, "", now_iso, now_iso)
            )

        conn.commit()
        conn.close()

    # --------------------------------------------------------------------------
    # TRIPS CRUD
    # --------------------------------------------------------------------------
    def create_trip(self, trip_data: Dict[str, Any]) -> Dict[str, Any]:
        trip_id = str(uuid.uuid4())
        now_iso = datetime.utcnow().isoformat()
        
        user_id = trip_data.get("user_id") or settings.DEFAULT_DEV_USER_ID
        title = trip_data.get("title") or f"Trip to {trip_data['destination']}"
        interests_json = json.dumps(trip_data.get("interests", []))

        # Check if Supabase is active
        if self.is_supabase_active():
            try:
                payload = {
                    "id": trip_id,
                    "user_id": user_id,
                    "title": title,
                    "destination": trip_data["destination"],
                    "start_date": str(trip_data["start_date"]),
                    "end_date": str(trip_data["end_date"]),
                    "travelers": int(trip_data.get("travelers", 1)),
                    "budget": float(trip_data.get("budget", 0.0)),
                    "currency": trip_data.get("currency", "USD"),
                    "travel_style": trip_data.get("travel_style", "balanced"),
                    "interests": trip_data.get("interests", []),
                    "pace": trip_data.get("pace", "balanced"),
                    "accommodation_pref": trip_data.get("accommodation_pref", "Hotel"),
                    "dietary_pref": trip_data.get("dietary_pref", "None"),
                    "accessibility_req": trip_data.get("accessibility_req", "None"),
                    "additional_notes": trip_data.get("additional_notes", ""),
                    "status": trip_data.get("status", "planned"),
                    "cover_image_url": trip_data.get("cover_image_url", ""),
                    "created_at": now_iso,
                    "updated_at": now_iso
                }
                res = supabase_client.table("trips").insert(payload).execute()
                if res.data and len(res.data) > 0:
                    created = res.data[0]
                    if isinstance(created.get("interests"), str):
                        try:
                            created["interests"] = json.loads(created["interests"])
                        except Exception:
                            created["interests"] = []
                    return created
            except Exception as e:
                logger.error(f"Supabase create_trip error: {e}. Writing to SQLite.", exc_info=True)

        # Fallback / Local SQLite execution
        conn = self._get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO trips (
                id, user_id, title, destination, start_date, end_date, travelers,
                budget, currency, travel_style, interests, pace, accommodation_pref,
                dietary_pref, accessibility_req, additional_notes, status, cover_image_url,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            trip_id,
            user_id,
            title,
            trip_data["destination"],
            str(trip_data["start_date"]),
            str(trip_data["end_date"]),
            int(trip_data.get("travelers", 1)),
            float(trip_data.get("budget", 0.0)),
            trip_data.get("currency", "USD"),
            trip_data.get("travel_style", "balanced"),
            interests_json,
            trip_data.get("pace", "balanced"),
            trip_data.get("accommodation_pref", "Hotel"),
            trip_data.get("dietary_pref", "None"),
            trip_data.get("accessibility_req", "None"),
            trip_data.get("additional_notes", ""),
            trip_data.get("status", "planned"),
            trip_data.get("cover_image_url", ""),
            now_iso,
            now_iso
        ))
        conn.commit()
        conn.close()

        return self.get_trip(trip_id)

    def get_trips(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve list of trips."""
        if self.is_supabase_active():
            try:
                query = supabase_client.table("trips").select("*").order("created_at", desc=True)
                if user_id:
                    query = query.eq("user_id", user_id)
                res = query.execute()
                if res.data:
                    for row in res.data:
                        if isinstance(row.get("interests"), str):
                            try:
                                row["interests"] = json.loads(row["interests"])
                            except Exception:
                                row["interests"] = []
                        row["ai_generated"] = bool(row.get("ai_generated"))
                    return res.data
            except Exception as e:
                logger.warning(f"Supabase get_trips error: {e}. Querying SQLite.")

        conn = self._get_sqlite_conn()
        cursor = conn.cursor()
        if user_id:
            cursor.execute("SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
        else:
            cursor.execute("SELECT * FROM trips ORDER BY created_at DESC")
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()

        for r in rows:
            try:
                r["interests"] = json.loads(r.get("interests") or "[]")
            except Exception:
                r["interests"] = []
            r["ai_generated"] = bool(r.get("ai_generated"))
        return rows

    def get_trip(self, trip_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a specific trip with all its days and activities."""
        trip = None

        if self.is_supabase_active():
            try:
                res = supabase_client.table("trips").select("*").eq("id", trip_id).execute()
                if res.data and len(res.data) > 0:
                    trip = res.data[0]
                    if isinstance(trip.get("interests"), str):
                        try:
                            trip["interests"] = json.loads(trip["interests"])
                        except Exception:
                            trip["interests"] = []
                    
                    trip["ai_generated"] = bool(trip.get("ai_generated"))
                    
                    # Fetch days
                    days_res = supabase_client.table("itinerary_days").select("*").eq("trip_id", trip_id).order("day_number").execute()
                    days = days_res.data or []
                    for d in days:
                        act_res = supabase_client.table("itinerary_activities").select("*").eq("day_id", d["id"]).order("order_index").execute()
                        d["activities"] = act_res.data or []
                    trip["days"] = days
                    return trip
            except Exception as e:
                logger.warning(f"Supabase get_trip error: {e}. Falling back to SQLite.")

        conn = self._get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM trips WHERE id = ?", (trip_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return None

        trip = dict(row)
        try:
            trip["interests"] = json.loads(trip.get("interests") or "[]")
        except Exception:
            trip["interests"] = []

        trip["ai_generated"] = bool(trip.get("ai_generated"))

        # Get days
        cursor.execute("SELECT * FROM itinerary_days WHERE trip_id = ? ORDER BY day_number ASC", (trip_id,))
        days = [dict(d) for d in cursor.fetchall()]

        for d in days:
            cursor.execute("SELECT * FROM itinerary_activities WHERE day_id = ? ORDER BY order_index ASC", (d["id"],))
            d["activities"] = [dict(a) for a in cursor.fetchall()]

        trip["days"] = days
        conn.close()
        return trip

    def update_trip(self, trip_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a trip's editable fields."""
        now_iso = datetime.utcnow().isoformat()
        updates["updated_at"] = now_iso

        if "interests" in updates and isinstance(updates["interests"], list):
            supabase_interests = updates["interests"]
            sqlite_interests = json.dumps(updates["interests"])
        else:
            supabase_interests = updates.get("interests")
            sqlite_interests = json.dumps([])

        if self.is_supabase_active():
            try:
                supa_payload = dict(updates)
                if "start_date" in supa_payload:
                    supa_payload["start_date"] = str(supa_payload["start_date"])
                if "end_date" in supa_payload:
                    supa_payload["end_date"] = str(supa_payload["end_date"])
                if supabase_interests is not None:
                    supa_payload["interests"] = supabase_interests
                
                supabase_client.table("trips").update(supa_payload).eq("id", trip_id).execute()
            except Exception as e:
                logger.warning(f"Supabase update_trip error: {e}. Falling back to SQLite.")

        conn = self._get_sqlite_conn()
        cursor = conn.cursor()

        fields = []
        values = []
        for k, v in updates.items():
            if k == "interests":
                fields.append("interests = ?")
                values.append(sqlite_interests)
            elif k in ("start_date", "end_date"):
                fields.append(f"{k} = ?")
                values.append(str(v))
            else:
                fields.append(f"{k} = ?")
                values.append(v)

        if fields:
            values.append(trip_id)
            sql = f"UPDATE trips SET {', '.join(fields)} WHERE id = ?"
            cursor.execute(sql, tuple(values))
            conn.commit()

        conn.close()
        return self.get_trip(trip_id)

    def delete_trip(self, trip_id: str) -> bool:
        """Deletes a trip and cascades to its days and activities."""
        if self.is_supabase_active():
            try:
                supabase_client.table("trips").delete().eq("id", trip_id).execute()
            except Exception as e:
                logger.warning(f"Supabase delete_trip error: {e}")

        conn = self._get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM trips WHERE id = ?", (trip_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted

    # --------------------------------------------------------------------------
    # ITINERARY DAYS & ACTIVITIES PERSISTENCE
    # --------------------------------------------------------------------------
    def save_itinerary_days_and_activities(self, trip_id: str, days_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Saves generated day-wise itinerary and nested activities."""
        # Clear existing days for this trip
        self.delete_trip_days(trip_id)

        saved_days = []
        now_iso = datetime.utcnow().isoformat()

        conn = self._get_sqlite_conn()
        cursor = conn.cursor()

        for day_dict in days_data:
            day_id = str(uuid.uuid4())
            day_num = int(day_dict["day_number"])
            day_date = str(day_dict["date"])
            day_title = day_dict["title"]
            day_summary = day_dict.get("summary", "")
            accommodation = day_dict.get("accommodation", "")
            dining = day_dict.get("dining_recommendations", "")
            transport = day_dict.get("transportation_notes", "")
            accom_cost = float(day_dict.get("accommodation_cost") or day_dict.get("estimated_accommodation_cost") or 0.0)
            dining_cost = float(day_dict.get("dining_cost") or day_dict.get("estimated_dining_cost") or 0.0)
            transport_cost = float(day_dict.get("transport_cost") or day_dict.get("estimated_transport_cost") or 0.0)

            # SQLite day insert
            cursor.execute("""
                INSERT INTO itinerary_days (
                    id, trip_id, day_number, date, title, summary,
                    accommodation, dining_recommendations, transportation_notes,
                    accommodation_cost, dining_cost, transport_cost, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                day_id, trip_id, day_num, day_date, day_title, day_summary,
                accommodation, dining, transport, accom_cost, dining_cost, transport_cost, now_iso
            ))

            if self.is_supabase_active():
                try:
                    supabase_client.table("itinerary_days").insert({
                        "id": day_id,
                        "trip_id": trip_id,
                        "day_number": day_num,
                        "date": day_date,
                        "title": day_title,
                        "summary": day_summary,
                        "accommodation": accommodation,
                        "dining_recommendations": dining,
                        "transportation_notes": transport,
                        "accommodation_cost": accom_cost,
                        "dining_cost": dining_cost,
                        "transport_cost": transport_cost,
                        "created_at": now_iso
                    }).execute()
                except Exception as e:
                    logger.warning(f"Supabase insert day error: {e}")

            activities_saved = []
            for act in day_dict.get("activities", []):
                act_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO itinerary_activities (
                        id, day_id, time_slot, title, description, location,
                        category, estimated_cost, currency, booking_url, order_index, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    act_id, day_id, act["time_slot"], act["title"], act.get("description", ""),
                    act.get("location", ""), act.get("category", "sightseeing"),
                    float(act.get("estimated_cost", 0.0)), act.get("currency", "USD"),
                    act.get("booking_url", ""), int(act.get("order_index", 0)), now_iso
                ))

                if self.is_supabase_active():
                    try:
                        supabase_client.table("itinerary_activities").insert({
                            "id": act_id,
                            "day_id": day_id,
                            "time_slot": act["time_slot"],
                            "title": act["title"],
                            "description": act.get("description", ""),
                            "location": act.get("location", ""),
                            "category": act.get("category", "sightseeing"),
                            "estimated_cost": float(act.get("estimated_cost", 0.0)),
                            "currency": act.get("currency", "USD"),
                            "booking_url": act.get("booking_url", ""),
                            "order_index": int(act.get("order_index", 0)),
                            "created_at": now_iso
                        }).execute()
                    except Exception as e:
                        logger.warning(f"Supabase insert activity error: {e}")

                act_copy = dict(act)
                act_copy["id"] = act_id
                act_copy["day_id"] = day_id
                activities_saved.append(act_copy)

            day_copy = dict(day_dict)
            day_copy["id"] = day_id
            day_copy["trip_id"] = trip_id
            day_copy["accommodation_cost"] = accom_cost
            day_copy["dining_cost"] = dining_cost
            day_copy["transport_cost"] = transport_cost
            day_copy["activities"] = activities_saved
            saved_days.append(day_copy)

        conn.commit()
        conn.close()
        return saved_days

    def delete_trip_days(self, trip_id: str):
        """Clears days and cascades activities for a given trip."""
        if self.is_supabase_active():
            try:
                supabase_client.table("itinerary_days").delete().eq("trip_id", trip_id).execute()
            except Exception as e:
                logger.warning(f"Supabase delete days error: {e}")

        conn = self._get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM itinerary_days WHERE trip_id = ?", (trip_id,))
        conn.commit()
        conn.close()

    # --------------------------------------------------------------------------
    # SINGLE DAY & ACTIVITY GRANULAR CRUD (Part 2)
    # --------------------------------------------------------------------------
    def get_day(self, day_id: str) -> Optional[Dict[str, Any]]:
        if self.is_supabase_active():
            try:
                res = supabase_client.table("itinerary_days").select("*").eq("id", day_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Supabase get_day error: {e}")

        conn = self._get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM itinerary_days WHERE id = ?", (day_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def update_day(self, day_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if self.is_supabase_active():
            try:
                supabase_client.table("itinerary_days").update(updates).eq("id", day_id).execute()
            except Exception as e:
                logger.warning(f"Supabase update_day error: {e}")

        conn = self._get_sqlite_conn()
        cursor = conn.cursor()

        fields = []
        values = []
        for k, v in updates.items():
            if v is not None:
                fields.append(f"{k} = ?")
                values.append(v)

        if fields:
            values.append(day_id)
            cursor.execute(f"UPDATE itinerary_days SET {', '.join(fields)} WHERE id = ?", tuple(values))
            conn.commit()

        conn.close()
        return self.get_day(day_id)

    def save_single_day(self, trip_id: str, day_data: Dict[str, Any]) -> Dict[str, Any]:
        """Replaces a single day's plan and activities while preserving other days."""
        day_num = int(day_data["day_number"])
        day_date = str(day_data["date"])
        now_iso = datetime.utcnow().isoformat()

        conn = self._get_sqlite_conn()
        cursor = conn.cursor()

        # Find existing day if any
        cursor.execute("SELECT id FROM itinerary_days WHERE trip_id = ? AND day_number = ?", (trip_id, day_num))
        existing = cursor.fetchone()

        accom_cost = float(day_data.get("estimated_accommodation_cost") or day_data.get("accommodation_cost") or 0.0)
        dining_cost = float(day_data.get("estimated_dining_cost") or day_data.get("dining_cost") or 0.0)
        transport_cost = float(day_data.get("estimated_transport_cost") or day_data.get("transport_cost") or 0.0)
        
        if existing:
            day_id = existing["id"]
            cursor.execute("""
                UPDATE itinerary_days SET
                    title = ?, summary = ?, accommodation = ?, dining_recommendations = ?,
                    transportation_notes = ?, accommodation_cost = ?, dining_cost = ?, transport_cost = ?
                WHERE id = ?
            """, (
                day_data["title"], day_data.get("summary", ""), day_data.get("accommodation", ""),
                day_data.get("dining_recommendations", ""), day_data.get("transportation_notes", ""),
                accom_cost, dining_cost, transport_cost, day_id
            ))
            cursor.execute("DELETE FROM itinerary_activities WHERE day_id = ?", (day_id,))

            if self.is_supabase_active():
                try:
                    supabase_client.table("itinerary_days").update({
                        "title": day_data["title"],
                        "summary": day_data.get("summary", ""),
                        "accommodation": day_data.get("accommodation", ""),
                        "dining_recommendations": day_data.get("dining_recommendations", ""),
                        "transportation_notes": day_data.get("transportation_notes", ""),
                        "accommodation_cost": accom_cost,
                        "dining_cost": dining_cost,
                        "transport_cost": transport_cost,
                    }).eq("id", day_id).execute()
                    supabase_client.table("itinerary_activities").delete().eq("day_id", day_id).execute()
                except Exception as e:
                    logger.warning(f"Supabase update single day error: {e}")
        else:
            day_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO itinerary_days (
                    id, trip_id, day_number, date, title, summary, accommodation,
                    dining_recommendations, transportation_notes, accommodation_cost, dining_cost, transport_cost, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                day_id, trip_id, day_num, day_date, day_data["title"], day_data.get("summary", ""),
                day_data.get("accommodation", ""), day_data.get("dining_recommendations", ""),
                day_data.get("transportation_notes", ""),
                accom_cost, dining_cost, transport_cost, now_iso
            ))
            if self.is_supabase_active():
                try:
                    supabase_client.table("itinerary_days").insert({
                        "id": day_id,
                        "trip_id": trip_id,
                        "day_number": day_num,
                        "date": day_date,
                        "title": day_data["title"],
                        "summary": day_data.get("summary", ""),
                        "accommodation": day_data.get("accommodation", ""),
                        "dining_recommendations": day_data.get("dining_recommendations", ""),
                        "transportation_notes": day_data.get("transportation_notes", ""),
                        "accommodation_cost": accom_cost,
                        "dining_cost": dining_cost,
                        "transport_cost": transport_cost,
                        "created_at": now_iso
                    }).execute()
                except Exception as e:
                    logger.warning(f"Supabase insert single day error: {e}")

        saved_acts = []
        for idx, act in enumerate(day_data.get("activities", [])):
            act_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO itinerary_activities (
                    id, day_id, time_slot, title, description, location,
                    category, estimated_cost, currency, booking_url, order_index, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                act_id, day_id, act["time_slot"], act["title"], act.get("description", ""),
                act.get("location", ""), act.get("category", "sightseeing"),
                float(act.get("estimated_cost", 0.0)), act.get("currency", "USD"),
                act.get("booking_url", ""), idx, now_iso
            ))

            if self.is_supabase_active():
                try:
                    supabase_client.table("itinerary_activities").insert({
                        "id": act_id,
                        "day_id": day_id,
                        "time_slot": act["time_slot"],
                        "title": act["title"],
                        "description": act.get("description", ""),
                        "location": act.get("location", ""),
                        "category": act.get("category", "sightseeing"),
                        "estimated_cost": float(act.get("estimated_cost", 0.0)),
                        "currency": act.get("currency", "USD"),
                        "booking_url": act.get("booking_url", ""),
                        "order_index": idx,
                        "created_at": now_iso
                    }).execute()
                except Exception as e:
                    logger.warning(f"Supabase insert single day activity error: {e}")

            act_copy = dict(act)
            act_copy["id"] = act_id
            act_copy["day_id"] = day_id
            saved_acts.append(act_copy)

        conn.commit()
        conn.close()

        res_day = dict(day_data)
        res_day["id"] = day_id
        res_day["trip_id"] = trip_id
        res_day["activities"] = saved_acts
        return res_day

    def get_activity(self, activity_id: str) -> Optional[Dict[str, Any]]:
        if self.is_supabase_active():
            try:
                res = supabase_client.table("itinerary_activities").select("*").eq("id", activity_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Supabase get_activity error: {e}")

        conn = self._get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM itinerary_activities WHERE id = ?", (activity_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def add_activity(self, day_id: str, act_data: Dict[str, Any]) -> Dict[str, Any]:
        act_id = str(uuid.uuid4())
        now_iso = datetime.utcnow().isoformat()
        conn = self._get_sqlite_conn()
        cursor = conn.cursor()

        # Get highest order index
        cursor.execute("SELECT MAX(order_index) as max_idx FROM itinerary_activities WHERE day_id = ?", (day_id,))
        row = cursor.fetchone()
        next_idx = (row["max_idx"] + 1) if row and row["max_idx"] is not None else 0

        cursor.execute("""
            INSERT INTO itinerary_activities (
                id, day_id, time_slot, title, description, location,
                category, estimated_cost, currency, booking_url, order_index, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            act_id, day_id, act_data["time_slot"], act_data["title"], act_data.get("description", ""),
            act_data.get("location", ""), act_data.get("category", "sightseeing"),
            float(act_data.get("estimated_cost", 0.0)), act_data.get("currency", "USD"),
            act_data.get("booking_url", ""), next_idx, now_iso
        ))
        conn.commit()
        conn.close()

        if self.is_supabase_active():
            try:
                supabase_client.table("itinerary_activities").insert({
                    "id": act_id,
                    "day_id": day_id,
                    "time_slot": act_data["time_slot"],
                    "title": act_data["title"],
                    "description": act_data.get("description", ""),
                    "location": act_data.get("location", ""),
                    "category": act_data.get("category", "sightseeing"),
                    "estimated_cost": float(act_data.get("estimated_cost", 0.0)),
                    "currency": act_data.get("currency", "USD"),
                    "booking_url": act_data.get("booking_url", ""),
                    "order_index": next_idx,
                    "created_at": now_iso
                }).execute()
            except Exception as e:
                logger.warning(f"Supabase add_activity error: {e}")

        act_data["id"] = act_id
        act_data["day_id"] = day_id
        act_data["order_index"] = next_idx
        return act_data

    def update_activity(self, activity_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if self.is_supabase_active():
            try:
                supabase_client.table("itinerary_activities").update(updates).eq("id", activity_id).execute()
            except Exception as e:
                logger.warning(f"Supabase update_activity error: {e}")

        conn = self._get_sqlite_conn()
        cursor = conn.cursor()

        fields = []
        values = []
        for k, v in updates.items():
            if v is not None:
                fields.append(f"{k} = ?")
                values.append(v)

        if fields:
            values.append(activity_id)
            cursor.execute(f"UPDATE itinerary_activities SET {', '.join(fields)} WHERE id = ?", tuple(values))
            conn.commit()

        conn.close()
        return self.get_activity(activity_id)

    def delete_activity(self, activity_id: str) -> bool:
        if self.is_supabase_active():
            try:
                supabase_client.table("itinerary_activities").delete().eq("id", activity_id).execute()
            except Exception as e:
                logger.warning(f"Supabase delete_activity error: {e}")

        conn = self._get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM itinerary_activities WHERE id = ?", (activity_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted

    def get_trip_stats(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Calculates aggregated dashboard metrics."""
        trips = self.get_trips(user_id)
        total = len(trips)
        today = date.today().isoformat()
        
        upcoming = 0
        completed = 0
        total_budget = 0.0
        destinations = set()
        primary_currency = "USD"

        for t in trips:
            if t.get("currency"):
                primary_currency = t["currency"]
            total_budget += float(t.get("budget", 0.0))
            if t.get("destination"):
                destinations.add(t["destination"].strip().lower())
            
            status = t.get("status")
            start = str(t.get("start_date", ""))
            end = str(t.get("end_date", ""))
            
            if status == "completed" or (end and end < today):
                completed += 1
            else:
                upcoming += 1

        return {
            "total_trips": total,
            "upcoming_trips": upcoming,
            "completed_trips": completed,
            "total_budget_planned": round(total_budget, 2),
            "destinations_count": len(destinations),
            "primary_currency": primary_currency
        }

db = DatabaseManager()
