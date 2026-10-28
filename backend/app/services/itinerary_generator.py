from datetime import date, timedelta
from typing import List, Dict, Any
import random

# Curated high-res Unsplash destination cover images
DESTINATION_COVERS: Dict[str, str] = {
    "tokyo": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80",
    "kyoto": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
    "paris": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
    "rome": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80",
    "bali": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
    "london": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80",
    "new york": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80",
    "amalfi coast": "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
    "santorini": "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80",
    "barcelona": "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=80",
    "swiss alps": "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1200&q=80",
    "banff": "https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?auto=format&fit=crop&w=1200&q=80",
    "dubai": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",
    "singapore": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80",
    "default": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
}

def get_destination_cover(destination: str) -> str:
    dest_lower = destination.lower()
    for key, url in DESTINATION_COVERS.items():
        if key in dest_lower:
            return url
    return DESTINATION_COVERS["default"]

class ItineraryGenerator:
    """
    Part 1 Foundation Itinerary Planner.
    Generates structured, realistic day-wise itineraries with activities,
    recommendations, and budget distributions based on user preferences.
    Prepared for LLM / AI enhancement handoff in Part 2.
    """

    @staticmethod
    def generate_baseline_itinerary(
        destination: str,
        start_date: date,
        end_date: date,
        travelers: int,
        budget: float,
        currency: str,
        travel_style: str,
        interests: List[str],
        pace: str,
        accommodation_pref: str = "Hotel",
        dietary_pref: str = "None",
        accessibility_req: str = "None",
        additional_notes: str = ""
    ) -> List[Dict[str, Any]]:
        
        duration_days = max(1, (end_date - start_date).days + 1)
        # Cap duration safely to prevent runaway memory if user chooses a 100-day range
        duration_days = min(duration_days, 14)

        # Style cost multiplier
        cost_multiplier = {
            "budget": 0.5,
            "balanced": 1.0,
            "luxury": 2.2
        }.get(travel_style, 1.0)

        # Activities count per day based on pace
        activities_per_day = {
            "relaxed": 2,
            "balanced": 3,
            "packed": 4
        }.get(pace, 3)

        daily_activity_budget = (budget * 0.45) / max(1, duration_days)

        days_data = []

        day_themes = [
            ("Arrival & City Orientation", "Settle in, take a leisurely stroll around the historic center, and enjoy authentic local dinner."),
            ("Historic Landmarks & Cultural Heritage", "Immerse in the iconic architectural gems, museum exhibitions, and historic squares."),
            ("Gastronomy & Local Markets", "Taste signature street eats, visit vibrant artisan food markets, and experience a guided tasting."),
            ("Scenic Viewpoints & Nature Exploration", "Escape into beautiful parks, panoramic lookout points, and serene natural escapes."),
            ("Art, Crafts & Modern Wonders", "Discover trend-setting design districts, contemporary galleries, and boutique shopping spots."),
            ("Hidden Gems & Neighborhood Life", "Wander off the beaten path into charming alleys, artisan workshops, and cozy cafes."),
            ("Grand Finale & Farewell Evening", "Capture final memories, shop for handcrafted souvenirs, and celebrate with a scenic dinner cruise.")
        ]

        for day_idx in range(duration_days):
            current_date = start_date + timedelta(days=day_idx)
            day_num = day_idx + 1
            theme_idx = day_idx % len(day_themes)
            theme_title, theme_summary = day_themes[theme_idx]

            # Generate day-level recommendations
            accommodation_note = f"{accommodation_pref or 'Boutique Hotel'} in central {destination} (quiet district, convenient access to public transit)."
            dietary_note = f"Handpicked restaurants catering to {dietary_pref if dietary_pref and dietary_pref != 'None' else 'all dietary preferences'}, featuring authentic regional recipes."
            transport_note = f"Walking & metro recommended for {destination}. Average transfer between points: 15-20 mins."
            
            if accessibility_req and accessibility_req != "None":
                transport_note += f" Selected routes verified for {accessibility_req}."

            activities = []

            # Slots for activities
            time_slots = [
                ("09:30 AM", "Morning"),
                ("01:00 PM", "Afternoon"),
                ("04:30 PM", "Late Afternoon"),
                ("07:30 PM", "Evening")
            ]

            selected_slots = time_slots[:activities_per_day]

            for act_idx, (clock_time, period) in enumerate(selected_slots):
                act_category = "sightseeing"
                if act_idx == 0:
                    # Morning activity
                    if "culture" in interests or "sightseeing" in interests:
                        act_title = f"{destination} Architectural Heritage Tour"
                        act_desc = f"Guided walk through famous landmarks and historic quarters of {destination}. Insightful narration of local history."
                        act_category = "culture"
                        base_cost = 25.0
                    elif "nature" in interests:
                        act_title = f"Morning Stroll through {destination} Botanical Gardens"
                        act_desc = "Peaceful morning nature walk amongst ancient trees and landscaped gardens."
                        act_category = "nature"
                        base_cost = 15.0
                    else:
                        act_title = f"Discovery Walk in Downtown {destination}"
                        act_desc = "Orientation stroll through vibrant promenades and iconic plazas."
                        act_category = "sightseeing"
                        base_cost = 10.0
                elif act_idx == 1:
                    # Afternoon activity
                    if "food" in interests:
                        act_title = f"Local Flavor & Food Tasting Market in {destination}"
                        act_desc = f"Sample artisanal specialties and street delicacies. Recommendations tailored to: {dietary_pref}."
                        act_category = "dining"
                        base_cost = 35.0
                    elif "adventure" in interests:
                        act_title = f"{destination} Active Discovery & Scenic Trail"
                        act_desc = "Exciting exploration with panoramic viewpoint photo stops."
                        act_category = "adventure"
                        base_cost = 30.0
                    elif "shopping" in interests:
                        act_title = f"Artisan Boutiques & Crafts Promenade"
                        act_desc = "Explore unique handmade goods, textiles, and independent local designer shops."
                        act_category = "shopping"
                        base_cost = 20.0
                    else:
                        act_title = f"{destination} Masterpiece Gallery & Museum Visit"
                        act_desc = "Explore world-renowned exhibitions and local art collections."
                        act_category = "sightseeing"
                        base_cost = 22.0
                elif act_idx == 2:
                    # Late Afternoon / Sunset
                    if "relaxation" in interests:
                        act_title = f"Tea House & Scenic Sunset Lounge"
                        act_desc = "Relax with specialty brews and a tranquil view of the sunset over the city skyline."
                        act_category = "relaxation"
                        base_cost = 18.0
                    elif "sightseeing" in interests or "nature" in interests:
                        act_title = f"{destination} Panoramic Observation Deck"
                        act_desc = "Golden hour skyline views offering 360-degree photography angles."
                        act_category = "sightseeing"
                        base_cost = 28.0
                    else:
                        act_title = f"Riverside / Harbor Promenade Walk"
                        act_desc = "Lively waterside walk with street musicians and historic architecture."
                        act_category = "relaxation"
                        base_cost = 12.0
                else:
                    # Evening activity
                    if "nightlife" in interests:
                        act_title = f"{destination} Rooftop Jazz & Craft Cocktail Experience"
                        act_desc = "Vibrant evening atmosphere featuring live music and signature drinks."
                        act_category = "nightlife"
                        base_cost = 45.0
                    elif "food" in interests:
                        act_title = f"Signature Chef's Dinner Experience"
                        act_desc = f"Curated dinner highlighting {destination}'s culinary heritage. {dietary_pref} accommodations ensured."
                        act_category = "dining"
                        base_cost = 55.0
                    else:
                        act_title = f"Evening Illuminated Monuments Walk"
                        act_desc = "Spectacular view of illuminated landmarks after dark, followed by a cozy dessert stop."
                        act_category = "sightseeing"
                        base_cost = 15.0

                est_cost = round(base_cost * cost_multiplier, 2)

                activities.append({
                    "time_slot": clock_time,
                    "title": act_title,
                    "description": act_desc,
                    "location": f"{destination} Central District",
                    "category": act_category,
                    "estimated_cost": est_cost,
                    "currency": currency,
                    "booking_url": "",
                    "order_index": act_idx
                })

            days_data.append({
                "day_number": day_num,
                "date": current_date,
                "title": f"Day {day_num}: {theme_title}",
                "summary": theme_summary,
                "accommodation": accommodation_note,
                "dining_recommendations": dietary_note,
                "transportation_notes": transport_note,
                "activities": activities
            })

        return days_data
