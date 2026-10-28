import sys
from pathlib import Path
from datetime import date, timedelta
import time

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

def run_part2_tests():
    print("==================================================")
    print(" Running WanderWise AI Part 2 Backend Tests...")
    print("==================================================")
    
    client = TestClient(app)
    
    # 1. Health Endpoint with AI status
    print("\n[1/8] Testing GET /api/health for AI provider detection...")
    resp = client.get("/api/health")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    health = resp.json()
    print(f" -> AI Configured: {health['ai_configured']}")
    print(f" -> AI Provider: {health['ai_provider']}")
    print(f" -> AI Model: {health['ai_model']}")
    assert health["ai_configured"] is True, "AI should be configured with NVIDIA key in .env"
    assert health["ai_provider"] == "nvidia"

    # 2. Create Base Trip
    print("\n[2/8] Creating test trip for AI generation...")
    start = date.today() + timedelta(days=20)
    end = start + timedelta(days=1)  # 2-day trip
    create_payload = {
        "title": "Tokyo High-Tech & Food Discovery",
        "destination": "Tokyo",
        "start_date": str(start),
        "end_date": str(end),
        "travelers": 2,
        "budget": 2000.0,
        "currency": "USD",
        "travel_style": "balanced",
        "interests": ["sightseeing", "food", "culture"],
        "pace": "balanced",
        "accommodation_pref": "Boutique Hotel in Shibuya",
        "dietary_pref": "None / Flexible",
        "accessibility_req": "None",
        "additional_notes": "Interested in Shibuya, Akihabara, and authentic ramen."
    }
    resp = client.post("/api/trips", json=create_payload)
    assert resp.status_code == 201
    trip = resp.json()
    trip_id = trip["id"]
    print(f" -> Created Trip ID: {trip_id}")
    print(f" -> Initial AI Generated Flag: {trip.get('ai_generated')}")

    # 3. Test Real AI Itinerary Generation (POST /api/trips/{trip_id}/generate)
    print(f"\n[3/8] Testing POST /api/trips/{trip_id}/generate with live NVIDIA NIM...")
    gen_payload = {
        "custom_instructions": "Focus on historic Asakusa on morning Day 1, and teamLab planets on Day 2."
    }
    resp = client.post(f"/api/trips/{trip_id}/generate", json=gen_payload)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    ai_trip = resp.json()
    assert ai_trip["ai_generated"] is True, "ai_generated must be True"
    assert ai_trip["ai_provider"] == "nvidia"
    print(f" -> AI Generated Flag: {ai_trip['ai_generated']}")
    print(f" -> Provider: {ai_trip['ai_provider']}")
    print(f" -> Model: {ai_trip['ai_model']}")
    print(f" -> Disclaimer: {ai_trip['disclaimer'][:70]}...")
    print(f" -> Days Count: {len(ai_trip['days'])}")
    
    # Verify budget breakdown
    print(f" -> Est. Activities Total: ${ai_trip['estimated_activities_cost']}")
    print(f" -> Est. Accommodation Total: ${ai_trip['estimated_accommodation_cost']}")
    print(f" -> Est. Food Total: ${ai_trip['estimated_food_cost']}")
    print(f" -> Est. Transport Total: ${ai_trip['estimated_transport_cost']}")
    print(f" -> Est. Total Cost: ${ai_trip['estimated_total_cost']}")
    print(f" -> Remaining Budget: ${ai_trip['remaining_budget']}")
    print(f" -> Is Over Budget: {ai_trip['is_over_budget']}")
    assert ai_trip["estimated_total_cost"] > 0
    assert len(ai_trip["days"]) == 2

    # Verify that trip is persisted in DB and can be retrieved
    retrieved = client.get(f"/api/trips/{trip_id}").json()
    assert retrieved["ai_generated"] is True
    assert len(retrieved["days"]) == 2

    # 4. Test Single Day AI Regeneration (POST /api/trips/{trip_id}/generate-day)
    time.sleep(1)
    print(f"\n[4/8] Testing POST /api/trips/{trip_id}/generate-day (Regenerate Day 2)...")
    day_payload = {
        "day_number": 2,
        "custom_instructions": "Change Day 2 to focus on art galleries in Roppongi and peaceful Meiji Shrine."
    }
    resp = client.post(f"/api/trips/{trip_id}/generate-day", json=day_payload)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    regen_trip = resp.json()
    day2 = next(d for d in regen_trip["days"] if d["day_number"] == 2)
    print(f" -> Regenerated Day 2 Title: {day2['title']}")
    print(f" -> Day 2 Activities Count: {len(day2['activities'])}")
    assert len(day2["activities"]) > 0

    # 5. Test Granular Interactive Operations (Add, Edit, Delete Activity)
    print(f"\n[5/8] Testing Granular Activity CRUD...")
    target_day = regen_trip["days"][0]
    day_id = target_day["id"]
    
    # 5a. Add custom activity
    print(f" -> Adding activity to Day 1 ({day_id})...")
    act_create = {
        "time_slot": "08:00 PM",
        "title": "Late Night Shibuya Crossing & Photography Walk",
        "description": "Capture iconic neon reflections from the magnet rooftop view.",
        "location": "Shibuya Crossing, Tokyo",
        "category": "nightlife",
        "estimated_cost": 15.0,
        "currency": "USD"
    }
    resp = client.post(f"/api/trips/{trip_id}/days/{day_id}/activities", json=act_create)
    assert resp.status_code == 200
    trip_after_add = resp.json()
    day1_after_add = next(d for d in trip_after_add["days"] if d["id"] == day_id)
    added_act = next(a for a in day1_after_add["activities"] if a["title"] == act_create["title"])
    added_act_id = added_act["id"]
    print(f"    Added Activity ID: {added_act_id}")

    # 5b. Edit activity
    print(f" -> Editing activity {added_act_id}...")
    act_update = {
        "title": "VIP Shibuya Crossing Sky View & Cocktail",
        "estimated_cost": 45.0
    }
    resp = client.put(f"/api/trips/{trip_id}/activities/{added_act_id}", json=act_update)
    assert resp.status_code == 200
    trip_after_edit = resp.json()
    day1_after_edit = next(d for d in trip_after_edit["days"] if d["id"] == day_id)
    edited_act = next(a for a in day1_after_edit["activities"] if a["id"] == added_act_id)
    assert edited_act["title"] == "VIP Shibuya Crossing Sky View & Cocktail"
    assert edited_act["estimated_cost"] == 45.0
    print(f"    Updated Activity Title: {edited_act['title']}, Cost: {edited_act['estimated_cost']}")

    # 5c. Delete activity
    print(f" -> Deleting activity {added_act_id}...")
    resp = client.delete(f"/api/trips/{trip_id}/activities/{added_act_id}")
    assert resp.status_code == 200
    trip_after_delete = resp.json()
    day1_after_delete = next(d for d in trip_after_delete["days"] if d["id"] == day_id)
    assert not any(a["id"] == added_act_id for a in day1_after_delete["activities"])
    print("    Activity deleted and confirmed removed from day.")

    # 6. Test Budget Management & Over-Budget Calculation
    print("\n[6/8] Testing Budget Calculations & Over-Budget Detection...")
    # Add an expensive activity that pushes itinerary over budget ($2000)
    expensive_act = {
        "time_slot": "09:00 PM",
        "title": "Helicopter Night Flight over Tokyo Bay & Skyline",
        "description": "Private chartered helicopter night flight.",
        "location": "Tokyo Heliport",
        "category": "adventure",
        "estimated_cost": 2500.0,
        "currency": "USD"
    }
    resp = client.post(f"/api/trips/{trip_id}/days/{day_id}/activities", json=expensive_act)
    assert resp.status_code == 200
    over_budget_trip = resp.json()
    print(f" -> Total Budget: ${over_budget_trip['budget']}")
    print(f" -> Total Estimated Cost: ${over_budget_trip['estimated_total_cost']}")
    print(f" -> Remaining Budget: ${over_budget_trip['remaining_budget']}")
    print(f" -> Is Over Budget: {over_budget_trip['is_over_budget']}")
    assert over_budget_trip["is_over_budget"] is True, "Trip should be marked over-budget"
    assert over_budget_trip["remaining_budget"] < 0, "Remaining budget should be negative"

    # 7. Test Ownership & Authentication Restrictions
    print("\n[7/8] Testing Authentication and Ownership Restrictions...")
    # Create trip belonging to user_owner_1
    user_1_headers = {"X-User-Id": "11111111-1111-1111-1111-111111111111"}
    user_2_headers = {"X-User-Id": "22222222-2222-2222-2222-222222222222"}
    
    owner_trip_payload = dict(create_payload)
    owner_trip_payload["title"] = "User 1 Private Voyage"
    resp = client.post("/api/trips", json=owner_trip_payload, headers=user_1_headers)
    assert resp.status_code == 201
    user_1_trip_id = resp.json()["id"]
    print(f" -> Created Trip for User 1: {user_1_trip_id}")

    # User 2 tries to update User 1's trip
    resp = client.put(f"/api/trips/{user_1_trip_id}", json={"title": "Hacked Title"}, headers=user_2_headers)
    assert resp.status_code == 403, f"Expected 403 Forbidden, got {resp.status_code}"
    print(" -> Confirmed: User 2 cannot modify User 1's trip (HTTP 403 Forbidden).")

    # User 2 tries to delete User 1's trip
    resp = client.delete(f"/api/trips/{user_1_trip_id}", headers=user_2_headers)
    assert resp.status_code == 403, f"Expected 403 Forbidden, got {resp.status_code}"
    print(" -> Confirmed: User 2 cannot delete User 1's trip (HTTP 403 Forbidden).")

    # User 2 tries to generate AI on User 1's trip
    resp = client.post(f"/api/trips/{user_1_trip_id}/generate", json={}, headers=user_2_headers)
    assert resp.status_code == 403, f"Expected 403 Forbidden, got {resp.status_code}"
    print(" -> Confirmed: User 2 cannot generate AI on User 1's trip (HTTP 403 Forbidden).")

    # Clean up User 1 trip using User 1's credentials
    resp = client.delete(f"/api/trips/{user_1_trip_id}", headers=user_1_headers)
    assert resp.status_code == 200

    # 8. Test Error Handling & Missing Key Scenarios
    print("\n[8/8] Testing Missing Key & API Failure Scenarios...")
    # 8a. 404 for non-existent trip
    resp = client.post("/api/trips/00000000-0000-0000-0000-000000000000/generate", json={})
    assert resp.status_code == 404
    print(" -> Correctly returned 404 for non-existent trip generation.")

    # 8b. Missing AI API key simulation
    original_key = settings.NVIDIA_API_KEY
    try:
        settings.NVIDIA_API_KEY = ""
        resp = client.post(f"/api/trips/{trip_id}/generate", json={})
        assert resp.status_code == 400
        assert "No AI API key configured" in resp.json()["detail"]
        print(" -> Correctly returned 400 Bad Request with helpful error when AI API key is missing.")
    finally:
        settings.NVIDIA_API_KEY = original_key

    # Clean up test trip
    client.delete(f"/api/trips/{trip_id}")
    print(" -> Cleaned up base test trip.")

    print("\n==================================================")
    print(" ALL PART 2 BACKEND TESTS PASSED SUCCESSFULLY! ")
    print("==================================================")

if __name__ == "__main__":
    run_part2_tests()
