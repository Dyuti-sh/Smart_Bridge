from datetime import date, datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator
import uuid

TravelStyle = Literal["budget", "balanced", "luxury"]
Pace = Literal["relaxed", "balanced", "packed"]
TripStatus = Literal["draft", "planned", "ongoing", "completed"]

# ------------------------------------------------------------------------------
# ACTIVITY SCHEMAS
# ------------------------------------------------------------------------------
class ActivityBase(BaseModel):
    time_slot: str = Field(..., description="E.g. '09:00 AM', 'Morning', 'Afternoon', 'Evening'")
    title: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = Field(default="", max_length=1500)
    location: Optional[str] = Field(default="", max_length=200)
    category: str = Field(default="sightseeing", description="sightseeing, dining, adventure, culture, relaxation, shopping, nightlife")
    estimated_cost: float = Field(default=0.0, ge=0.0)
    currency: str = Field(default="USD", max_length=10)
    booking_url: Optional[str] = Field(default="")
    order_index: int = Field(default=0, ge=0)

class ActivityCreate(ActivityBase):
    pass

class ActivityUpdate(BaseModel):
    time_slot: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    category: Optional[str] = None
    estimated_cost: Optional[float] = None
    currency: Optional[str] = None
    booking_url: Optional[str] = None
    order_index: Optional[int] = None

class ActivityResponse(ActivityBase):
    id: str
    day_id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ------------------------------------------------------------------------------
# ITINERARY DAY SCHEMAS
# ------------------------------------------------------------------------------
class ItineraryDayBase(BaseModel):
    day_number: int = Field(..., ge=1)
    date: date
    title: str = Field(..., min_length=2, max_length=150)
    summary: Optional[str] = Field(default="", max_length=1500)
    accommodation: Optional[str] = Field(default="", max_length=500)
    dining_recommendations: Optional[str] = Field(default="", max_length=600)
    transportation_notes: Optional[str] = Field(default="", max_length=600)
    accommodation_cost: float = Field(default=0.0, ge=0.0)
    dining_cost: float = Field(default=0.0, ge=0.0)
    transport_cost: float = Field(default=0.0, ge=0.0)

class ItineraryDayCreate(ItineraryDayBase):
    activities: List[ActivityCreate] = []

class DayUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    accommodation: Optional[str] = None
    dining_recommendations: Optional[str] = None
    transportation_notes: Optional[str] = None
    accommodation_cost: Optional[float] = None
    dining_cost: Optional[float] = None
    transport_cost: Optional[float] = None

class ItineraryDayResponse(ItineraryDayBase):
    id: str
    trip_id: str
    created_at: Optional[datetime] = None
    activities: List[ActivityResponse] = []

    class Config:
        from_attributes = True


# ------------------------------------------------------------------------------
# TRIP SCHEMAS
# ------------------------------------------------------------------------------
class TripBase(BaseModel):
    title: Optional[str] = Field(default=None, max_length=150)
    destination: str = Field(..., min_length=2, max_length=120)
    start_date: date
    end_date: date
    travelers: int = Field(default=1, ge=1, le=50)
    budget: float = Field(default=1000.0, ge=0.0)
    currency: str = Field(default="USD", max_length=10)
    travel_style: TravelStyle = Field(default="balanced")
    interests: List[str] = Field(default_factory=lambda: ["sightseeing", "food"])
    pace: Pace = Field(default="balanced")
    accommodation_pref: Optional[str] = Field(default="Hotel", max_length=100)
    dietary_pref: Optional[str] = Field(default="None", max_length=150)
    accessibility_req: Optional[str] = Field(default="None", max_length=150)
    additional_notes: Optional[str] = Field(default="", max_length=2000)
    status: TripStatus = Field(default="planned")
    cover_image_url: Optional[str] = Field(default=None)

    @field_validator("end_date")
    @classmethod
    def validate_dates(cls, v: date, info) -> date:
        data = info.data
        if "start_date" in data and v < data["start_date"]:
            raise ValueError("End date cannot be earlier than start date.")
        return v

class TripCreate(TripBase):
    pass

class TripUpdate(BaseModel):
    title: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    travelers: Optional[int] = Field(default=None, ge=1, le=50)
    budget: Optional[float] = Field(default=None, ge=0.0)
    currency: Optional[str] = None
    travel_style: Optional[TravelStyle] = None
    interests: Optional[List[str]] = None
    pace: Optional[Pace] = None
    accommodation_pref: Optional[str] = None
    dietary_pref: Optional[str] = None
    accessibility_req: Optional[str] = None
    additional_notes: Optional[str] = None
    status: Optional[TripStatus] = None
    cover_image_url: Optional[str] = None

class TripSummaryResponse(BaseModel):
    id: str
    user_id: str
    title: str
    destination: str
    start_date: date
    end_date: date
    duration_days: int
    travelers: int
    budget: float
    currency: str
    travel_style: str
    status: str
    cover_image_url: Optional[str] = None
    ai_generated: bool = False
    ai_model: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class TripResponse(TripBase):
    id: str
    user_id: str
    duration_days: int
    
    # Detailed budget breakdown
    estimated_activities_cost: float = 0.0
    estimated_accommodation_cost: float = 0.0
    estimated_food_cost: float = 0.0
    estimated_transport_cost: float = 0.0
    estimated_total_cost: float = 0.0
    remaining_budget: float = 0.0
    is_over_budget: bool = False
    
    # AI metadata
    ai_generated: bool = False
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None
    disclaimer: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime
    days: List[ItineraryDayResponse] = []

    class Config:
        from_attributes = True


# ------------------------------------------------------------------------------
# AI GENERATION SCHEMAS
# ------------------------------------------------------------------------------
class GenerateItineraryRequest(BaseModel):
    custom_instructions: Optional[str] = Field(default="", max_length=1000)

class DayRegenerateRequest(BaseModel):
    day_number: int = Field(..., ge=1)
    custom_instructions: Optional[str] = Field(default="", max_length=1000)

class AIActivityItem(BaseModel):
    time_slot: str
    title: str
    description: str
    location: str
    category: str = "sightseeing"
    estimated_cost: float = 0.0

class AIGeneratedDay(BaseModel):
    day_number: int
    date: str
    title: str
    summary: str
    accommodation: str
    dining_recommendations: str
    transportation_notes: str
    estimated_accommodation_cost: float = 0.0
    estimated_dining_cost: float = 0.0
    estimated_transport_cost: float = 0.0
    activities: List[AIActivityItem] = []

class AIBudgetBreakdown(BaseModel):
    estimated_accommodation_total: float = 0.0
    estimated_food_total: float = 0.0
    estimated_transport_total: float = 0.0
    estimated_activities_total: float = 0.0
    estimated_grand_total: float = 0.0
    remaining_budget: float = 0.0
    is_over_budget: bool = False

class AIGeneratedItinerary(BaseModel):
    destination: str
    days: List[AIGeneratedDay]
    budget_breakdown: AIBudgetBreakdown
    general_tips: List[str] = []
    disclaimer: str = (
        "All prices, hours, and availability are AI-generated estimates and "
        "not confirmed reservations or live transit schedules. Please verify with official venues."
    )


# ------------------------------------------------------------------------------
# STATS & HEALTH
# ------------------------------------------------------------------------------
class TripStatsResponse(BaseModel):
    total_trips: int
    upcoming_trips: int
    completed_trips: int
    total_budget_planned: float
    destinations_count: int
    primary_currency: str

class HealthResponse(BaseModel):
    status: str
    app: str
    version: str
    database_mode: str  # "supabase" or "sqlite_local"
    supabase_connected: bool
    ai_configured: bool
    ai_provider: str
    ai_model: str
    timestamp: str
