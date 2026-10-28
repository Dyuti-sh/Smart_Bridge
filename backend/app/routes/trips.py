from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Header, Query
from app.config import settings
from app.schemas.trip import (
    TripCreate,
    TripUpdate,
    TripResponse,
    TripSummaryResponse,
    TripStatsResponse,
    GenerateItineraryRequest,
    DayRegenerateRequest,
    DayUpdate,
    ActivityCreate,
    ActivityUpdate
)
from app.services.trip_service import TripService
from app.services.ai_service import AIServiceError

router = APIRouter(prefix="/trips", tags=["Trips"])

def extract_user_id(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)
) -> str:
    """
    Extracts the user ID from Supabase JWT (if provided), 
    or X-User-Id header, or falls back to standard Dev User ID.
    """
    if x_user_id and len(x_user_id.strip()) > 5:
        return x_user_id.strip()

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            import jwt
            payload = jwt.decode(token, options={"verify_signature": False})
            if "sub" in payload and payload["sub"]:
                return str(payload["sub"])
        except Exception:
            pass

    return settings.DEFAULT_DEV_USER_ID

@router.get("", response_model=List[TripSummaryResponse])
def get_trips(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    all_users: bool = Query(False, description="Filter for admin/dev preview")
):
    """Retrieve all trips for the current user."""
    user_id = None if all_users else extract_user_id(authorization, x_user_id)
    trips = TripService.get_trips(user_id=user_id)
    return trips

@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
def create_trip(
    trip_in: TripCreate,
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)
):
    """Create a new trip and generate its baseline day-by-day structured itinerary."""
    user_id = extract_user_id(authorization, x_user_id)
    try:
        created_trip = TripService.create_trip(trip_in, user_id=user_id)
        return created_trip
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the trip: {str(e)}"
        )

@router.get("/stats/summary", response_model=TripStatsResponse)
def get_stats(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)
):
    """Get aggregated dashboard stats for the current user."""
    user_id = extract_user_id(authorization, x_user_id)
    stats = TripService.get_stats(user_id=user_id)
    return stats

@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(trip_id: str):
    """Retrieve details for a specific trip, including day-by-day activities."""
    trip = TripService.get_trip(trip_id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip with ID '{trip_id}' not found."
        )
    return trip

@router.put("/{trip_id}", response_model=TripResponse)
def update_trip(
    trip_id: str,
    updates: TripUpdate,
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)
):
    """Update trip details (destination, dates, budget, travel style, status, notes)."""
    user_id = extract_user_id(authorization, x_user_id)
    try:
        updated_trip = TripService.update_trip(trip_id, updates, user_id=user_id)
        if not updated_trip:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Trip '{trip_id}' not found.")
        return updated_trip
    except AIServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{trip_id}", status_code=status.HTTP_200_OK)
def delete_trip(
    trip_id: str,
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)
):
    """Delete a trip and all its associated itinerary days and activities."""
    user_id = extract_user_id(authorization, x_user_id)
    try:
        success = TripService.delete_trip(trip_id, user_id=user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete trip."
            )
        return {"message": "Trip deleted successfully", "id": trip_id}
    except AIServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/{trip_id}/regenerate", response_model=TripResponse)
def regenerate_itinerary(
    trip_id: str,
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)
):
    """Regenerates baseline day-by-day structured activities for the given trip."""
    user_id = extract_user_id(authorization, x_user_id)
    try:
        refreshed_trip = TripService.regenerate_itinerary(trip_id, user_id=user_id)
        return refreshed_trip
    except AIServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ------------------------------------------------------------------------------
# PART 2: GENERATIVE AI & INTERACTIVE MANAGEMENT ENDPOINTS
# ------------------------------------------------------------------------------
@router.post("/{trip_id}/generate", response_model=TripResponse)
async def generate_ai_itinerary(
    trip_id: str,
    req: Optional[GenerateItineraryRequest] = None,
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)
):
    """
    Executes real Generative AI itinerary planning for a trip.
    Generates a personalized day-wise schedule with activities, budget breakdown,
    honest travel notes, and saves the verified output to the database.
    """
    user_id = extract_user_id(authorization, x_user_id)
    custom_notes = req.custom_instructions if req else ""
    try:
        updated_trip = await TripService.generate_ai_itinerary(
            trip_id,
            custom_instructions=custom_notes,
            user_id=user_id
        )
        return updated_trip
    except AIServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during AI generation: {str(e)}"
        )

@router.post("/{trip_id}/generate-day", response_model=TripResponse)
async def generate_ai_day(
    trip_id: str,
    req: DayRegenerateRequest,
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)
):
    """
    Regenerates a single specific day with AI while preserving all other days.
    """
    user_id = extract_user_id(authorization, x_user_id)
    try:
        updated_trip = await TripService.generate_ai_day(
            trip_id=trip_id,
            day_number=req.day_number,
            custom_instructions=req.custom_instructions,
            user_id=user_id
        )
        return updated_trip
    except AIServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error regenerating Day {req.day_number}: {str(e)}"
        )

@router.put("/{trip_id}/days/{day_id}", response_model=TripResponse)
def update_day(
    trip_id: str,
    day_id: str,
    updates: DayUpdate,
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)
):
    """
    Update day-level details (summary, accommodation guidance, dining notes, transit notes, or day costs).
    """
    user_id = extract_user_id(authorization, x_user_id)
    try:
        updated_trip = TripService.update_day(trip_id, day_id, updates, user_id=user_id)
        return updated_trip
    except AIServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/{trip_id}/days/{day_id}/activities", response_model=TripResponse)
def add_activity(
    trip_id: str,
    day_id: str,
    activity: ActivityCreate,
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)
):
    """Add a new scheduled activity to a specific day."""
    user_id = extract_user_id(authorization, x_user_id)
    try:
        updated_trip = TripService.add_activity(trip_id, day_id, activity, user_id=user_id)
        return updated_trip
    except AIServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{trip_id}/activities/{activity_id}", response_model=TripResponse)
def update_activity(
    trip_id: str,
    activity_id: str,
    updates: ActivityUpdate,
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)
):
    """
    Edit an activity's title, description, time slot, location, category, or estimated cost.
    Recalculates budget totals automatically.
    """
    user_id = extract_user_id(authorization, x_user_id)
    try:
        updated_trip = TripService.update_activity(trip_id, activity_id, updates, user_id=user_id)
        return updated_trip
    except AIServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{trip_id}/activities/{activity_id}", response_model=TripResponse)
def delete_activity(
    trip_id: str,
    activity_id: str,
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)
):
    """Delete an activity from a day and recalculate budget totals."""
    user_id = extract_user_id(authorization, x_user_id)
    try:
        updated_trip = TripService.delete_activity(trip_id, activity_id, user_id=user_id)
        return updated_trip
    except AIServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
