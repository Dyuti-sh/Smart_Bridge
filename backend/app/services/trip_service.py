from datetime import date
from typing import List, Optional, Dict, Any
from app.config import settings
from app.database import db
from app.schemas.trip import (
    TripCreate,
    TripUpdate,
    DayUpdate,
    ActivityCreate,
    ActivityUpdate
)
from app.services.itinerary_generator import ItineraryGenerator, get_destination_cover
from app.services.ai_service import AIService, AIServiceError

class TripService:

    @staticmethod
    def _calculate_metrics(trip_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates trip duration, itemized budget breakdown
        (activities, accommodation, dining, transport, remaining), and over-budget status.
        """
        start = trip_data.get("start_date")
        end = trip_data.get("end_date")
        
        duration = 1
        if isinstance(start, str):
            try:
                start = date.fromisoformat(start)
            except Exception:
                pass
        if isinstance(end, str):
            try:
                end = date.fromisoformat(end)
            except Exception:
                pass

        if isinstance(start, date) and isinstance(end, date):
            duration = max(1, (end - start).days + 1)

        total_activities = 0.0
        total_accom = 0.0
        total_food = 0.0
        total_transport = 0.0

        for day in trip_data.get("days", []):
            total_accom += float(day.get("accommodation_cost") or day.get("estimated_accommodation_cost") or 0.0)
            total_food += float(day.get("dining_cost") or day.get("estimated_dining_cost") or 0.0)
            total_transport += float(day.get("transport_cost") or day.get("estimated_transport_cost") or 0.0)

            for act in day.get("activities", []):
                total_activities += float(act.get("estimated_cost", 0.0))

        # Fallback to top-level estimates if days don't have individual breakdown yet
        if total_accom == 0.0 and trip_data.get("estimated_accommodation_cost"):
            total_accom = float(trip_data["estimated_accommodation_cost"])
        if total_food == 0.0 and trip_data.get("estimated_food_cost"):
            total_food = float(trip_data["estimated_food_cost"])
        if total_transport == 0.0 and trip_data.get("estimated_transport_cost"):
            total_transport = float(trip_data["estimated_transport_cost"])

        grand_total = total_activities + total_accom + total_food + total_transport
        budget = float(trip_data.get("budget", 0.0))
        remaining = round(budget - grand_total, 2)

        trip_data["duration_days"] = duration
        trip_data["estimated_activities_cost"] = round(total_activities, 2)
        trip_data["estimated_accommodation_cost"] = round(total_accom, 2)
        trip_data["estimated_food_cost"] = round(total_food, 2)
        trip_data["estimated_transport_cost"] = round(total_transport, 2)
        trip_data["estimated_total_cost"] = round(grand_total, 2)
        trip_data["remaining_budget"] = remaining
        trip_data["is_over_budget"] = remaining < 0

        # AI metadata defaults
        trip_data["ai_generated"] = bool(trip_data.get("ai_generated"))
        trip_data["ai_provider"] = trip_data.get("ai_provider") or ""
        trip_data["ai_model"] = trip_data.get("ai_model") or ""
        trip_data["disclaimer"] = trip_data.get("disclaimer") or (
            "All prices, hours, and availability are estimated and not confirmed bookings. "
            "Please verify directly with venues."
        )

        return trip_data

    @classmethod
    def create_trip(cls, trip_in: TripCreate, user_id: str) -> Dict[str, Any]:
        trip_dict = trip_in.model_dump()
        trip_dict["user_id"] = user_id

        if not trip_dict.get("title"):
            trip_dict["title"] = f"Trip to {trip_in.destination}"

        if not trip_dict.get("cover_image_url"):
            trip_dict["cover_image_url"] = get_destination_cover(trip_in.destination)

        # 1. Save trip record
        created_trip = db.create_trip(trip_dict)
        trip_id = created_trip["id"]

        # 2. Generate baseline structured day-wise itinerary
        baseline_days = ItineraryGenerator.generate_baseline_itinerary(
            destination=trip_in.destination,
            start_date=trip_in.start_date,
            end_date=trip_in.end_date,
            travelers=trip_in.travelers,
            budget=trip_in.budget,
            currency=trip_in.currency,
            travel_style=trip_in.travel_style,
            interests=trip_in.interests,
            pace=trip_in.pace,
            accommodation_pref=trip_in.accommodation_pref or "Hotel",
            dietary_pref=trip_in.dietary_pref or "None",
            accessibility_req=trip_in.accessibility_req or "None",
            additional_notes=trip_in.additional_notes or ""
        )

        # 3. Persist generated days and activities
        db.save_itinerary_days_and_activities(trip_id, baseline_days)

        # 4. Fetch complete trip with days and activities
        complete_trip = db.get_trip(trip_id)
        return cls._calculate_metrics(complete_trip)

    @classmethod
    def get_trips(cls, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        raw_trips = db.get_trips(user_id)
        summaries = []
        for t in raw_trips:
            t_with_metrics = cls._calculate_metrics(dict(t))
            summaries.append(t_with_metrics)
        return summaries

    @classmethod
    def verify_trip_access(cls, trip_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Validates that a trip exists and belongs to the requesting user."""
        trip = db.get_trip(trip_id)
        if not trip:
            raise AIServiceError(f"Trip with ID '{trip_id}' not found.", status_code=404)
        if user_id and trip.get("user_id"):
            # Enforce ownership check
            if trip["user_id"] != user_id:
                raise AIServiceError("You do not have permission to modify this trip.", status_code=403)
        return trip

    @classmethod
    def get_trip(cls, trip_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        trip = db.get_trip(trip_id)
        if not trip:
            return None
        return cls._calculate_metrics(trip)

    @classmethod
    def update_trip(cls, trip_id: str, updates: TripUpdate, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        cls.verify_trip_access(trip_id, user_id)
        update_dict = updates.model_dump(exclude_unset=True)
        if not update_dict:
            return cls.get_trip(trip_id)

        # If destination changed and no cover URL was specified, update cover
        if "destination" in update_dict and "cover_image_url" not in update_dict:
            update_dict["cover_image_url"] = get_destination_cover(update_dict["destination"])

        updated = db.update_trip(trip_id, update_dict)
        if not updated:
            return None
        return cls._calculate_metrics(updated)

    @classmethod
    def delete_trip(cls, trip_id: str, user_id: Optional[str] = None) -> bool:
        cls.verify_trip_access(trip_id, user_id)
        return db.delete_trip(trip_id)

    @classmethod
    def regenerate_itinerary(cls, trip_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Baseline template regeneration (fallback or manual reset)."""
        trip = cls.verify_trip_access(trip_id, user_id)

        start_date = trip["start_date"]
        end_date = trip["end_date"]
        if isinstance(start_date, str):
            start_date = date.fromisoformat(start_date)
        if isinstance(end_date, str):
            end_date = date.fromisoformat(end_date)

        new_days = ItineraryGenerator.generate_baseline_itinerary(
            destination=trip["destination"],
            start_date=start_date,
            end_date=end_date,
            travelers=int(trip.get("travelers", 1)),
            budget=float(trip.get("budget", 1000.0)),
            currency=trip.get("currency", "USD"),
            travel_style=trip.get("travel_style", "balanced"),
            interests=trip.get("interests", []),
            pace=trip.get("pace", "balanced"),
            accommodation_pref=trip.get("accommodation_pref", "Hotel"),
            dietary_pref=trip.get("dietary_pref", "None"),
            accessibility_req=trip.get("accessibility_req", "None"),
            additional_notes=trip.get("additional_notes", "")
        )

        db.save_itinerary_days_and_activities(trip_id, new_days)
        refreshed = db.get_trip(trip_id)
        return cls._calculate_metrics(refreshed)

    # --------------------------------------------------------------------------
    # AI GENERATION METHODS (Part 2)
    # --------------------------------------------------------------------------
    @classmethod
    async def generate_ai_itinerary(
        cls,
        trip_id: str,
        custom_instructions: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes live AI generation using the configured provider (e.g. NVIDIA, OpenAI, Groq),
        validates the output with Pydantic, and stores the day-wise schedule in the database.
        """
        trip = cls.verify_trip_access(trip_id, user_id)

        # Call AI Service
        ai_itinerary = await AIService.generate_itinerary(trip, custom_instructions)

        # Convert generated Pydantic days to dicts for DB save
        days_to_save = [day.model_dump() for day in ai_itinerary.days]
        db.save_itinerary_days_and_activities(trip_id, days_to_save)

        # Update trip with AI metadata and budget summary
        bd = ai_itinerary.budget_breakdown
        db.update_trip(trip_id, {
            "ai_generated": 1,
            "ai_provider": settings.active_provider,
            "ai_model": settings.active_model,
            "disclaimer": ai_itinerary.disclaimer,
            "estimated_accommodation_cost": bd.estimated_accommodation_total,
            "estimated_food_cost": bd.estimated_food_total,
            "estimated_transport_cost": bd.estimated_transport_total,
        })

        complete_trip = db.get_trip(trip_id)
        return cls._calculate_metrics(complete_trip)

    @classmethod
    async def generate_ai_day(
        cls,
        trip_id: str,
        day_number: int,
        custom_instructions: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Regenerates a single specific day with AI while leaving other days intact.
        """
        trip = cls.verify_trip_access(trip_id, user_id)

        # Find target day's date
        target_day = None
        for d in trip.get("days", []):
            if int(d["day_number"]) == day_number:
                target_day = d
                break

        if not target_day:
            raise AIServiceError(f"Day {day_number} not found in trip '{trip_id}'.", status_code=404)

        ai_day = await AIService.generate_single_day(
            trip_data=trip,
            day_number=day_number,
            day_date=str(target_day["date"]),
            custom_instructions=custom_instructions
        )

        db.save_single_day(trip_id, ai_day.model_dump())
        complete_trip = db.get_trip(trip_id)
        return cls._calculate_metrics(complete_trip)

    # --------------------------------------------------------------------------
    # GRANULAR DAY & ACTIVITY OPERATIONS
    # --------------------------------------------------------------------------
    @classmethod
    def update_day(cls, trip_id: str, day_id: str, updates: DayUpdate, user_id: Optional[str] = None) -> Dict[str, Any]:
        cls.verify_trip_access(trip_id, user_id)
        day = db.get_day(day_id)
        if not day or day["trip_id"] != trip_id:
            raise AIServiceError(f"Day '{day_id}' not found on trip '{trip_id}'.", status_code=404)

        db.update_day(day_id, updates.model_dump(exclude_unset=True))
        complete_trip = db.get_trip(trip_id)
        return cls._calculate_metrics(complete_trip)

    @classmethod
    def add_activity(cls, trip_id: str, day_id: str, activity_in: ActivityCreate, user_id: Optional[str] = None) -> Dict[str, Any]:
        cls.verify_trip_access(trip_id, user_id)
        day = db.get_day(day_id)
        if not day or day["trip_id"] != trip_id:
            raise AIServiceError(f"Day '{day_id}' not found on trip '{trip_id}'.", status_code=404)

        db.add_activity(day_id, activity_in.model_dump())
        complete_trip = db.get_trip(trip_id)
        return cls._calculate_metrics(complete_trip)

    @classmethod
    def update_activity(cls, trip_id: str, activity_id: str, updates: ActivityUpdate, user_id: Optional[str] = None) -> Dict[str, Any]:
        cls.verify_trip_access(trip_id, user_id)
        act = db.get_activity(activity_id)
        if not act:
            raise AIServiceError(f"Activity '{activity_id}' not found.", status_code=404)

        day = db.get_day(act["day_id"])
        if not day or day["trip_id"] != trip_id:
            raise AIServiceError("Activity does not belong to the specified trip.", status_code=403)

        db.update_activity(activity_id, updates.model_dump(exclude_unset=True))
        complete_trip = db.get_trip(trip_id)
        return cls._calculate_metrics(complete_trip)

    @classmethod
    def delete_activity(cls, trip_id: str, activity_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        cls.verify_trip_access(trip_id, user_id)
        act = db.get_activity(activity_id)
        if not act:
            raise AIServiceError(f"Activity '{activity_id}' not found.", status_code=404)

        day = db.get_day(act["day_id"])
        if not day or day["trip_id"] != trip_id:
            raise AIServiceError("Activity does not belong to the specified trip.", status_code=403)

        db.delete_activity(activity_id)
        complete_trip = db.get_trip(trip_id)
        return cls._calculate_metrics(complete_trip)

    @staticmethod
    def get_stats(user_id: Optional[str] = None) -> Dict[str, Any]:
        return db.get_trip_stats(user_id)
