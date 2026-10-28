import sys
from pathlib import Path
from datetime import date, timedelta

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from app.main import app

def run_tests():
    print("==================================================")
    print(" Running WanderWise AI Backend Tests...")
    print("==================================================")
    
    client = TestClient(app)
    
    # 1. Health Endpoint
    print("\n[1/7] Testing GET /api/health...")
    resp = client.get("/api/health")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    health_data = resp.json()
    print(f" -> Status: {health_data['status']}")
    print(f" -> Database Mode: {health_data['database_mode']}")
    print(f" -> Supabase Configured: {health_data['supabase_connected']}")

    # 2. Trip Creation with Auto-Generated Day-Wise Itinerary
    print("\n[2/7] Testing POST /api/trips...")
    start = date.today() + timedelta(days=14)
    end = start + timedelta(days=4)  # 5-day trip
    payload = {
        "title": "Kyoto Cultural & Culinary Journey",
        "destination": "Kyoto",
        "start_date": str(start),
        "end_date": str(end),
        "travelers": 2,
        "budget": 2800.0,
        "currency": "USD",
        "travel_style": "balanced",
        "interests": ["sightseeing", "food", "culture", "relaxation"],
        "pace": "balanced",
        "accommodation_pref": "Boutique Traditional Ryokan",
        "dietary_pref": "Vegetarian options preferred",
        "accessibility_req": "Step-free where possible",
        "additional_notes": "Want to experience tea ceremony and bamboo grove early morning."
    }
    
    resp = client.post("/api/trips", json=payload)
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    trip = resp.json()
    trip_id = trip["id"]
    print(f" -> Created Trip ID: {trip_id}")
    print(f" -> Duration: {trip['duration_days']} days")
    print(f" -> Days count: {len(trip['days'])}")
    assert len(trip["days"]) == 5, f"Expected 5 days, got {len(trip['days'])}"
    
    # Verify activities inside days
    first_day = trip["days"][0]
    print(f" -> Day 1 Title: {first_day['title']}")
    print(f" -> Day 1 Activities count: {len(first_day['activities'])}")
    assert len(first_day["activities"]) > 0, "Activities should not be empty!"
    print(f" -> Day 1 First Activity: {first_day['activities'][0]['time_slot']} - {first_day['activities'][0]['title']}")
    print(f" -> Estimated Total Cost: {trip['estimated_total_cost']} {trip['currency']}")

    # 3. Retrieve All Trips
    print("\n[3/7] Testing GET /api/trips...")
    resp = client.get("/api/trips")
    assert resp.status_code == 200
    trips_list = resp.json()
    print(f" -> Retrieved {len(trips_list)} trips.")
    assert any(t["id"] == trip_id for t in trips_list), "Created trip should be in list"

    # 4. Retrieve Specific Trip by ID
    print(f"\n[4/7] Testing GET /api/trips/{trip_id}...")
    resp = client.get(f"/api/trips/{trip_id}")
    assert resp.status_code == 200
    fetched_trip = resp.json()
    assert fetched_trip["id"] == trip_id
    assert fetched_trip["destination"] == "Kyoto"

    # 5. Update Trip
    print(f"\n[5/7] Testing PUT /api/trips/{trip_id}...")
    update_payload = {
        "title": "Kyoto Cherry Blossom Special Experience",
        "budget": 3200.0,
        "status": "planned"
    }
    resp = client.put(f"/api/trips/{trip_id}", json=update_payload)
    assert resp.status_code == 200
    updated_trip = resp.json()
    assert updated_trip["title"] == "Kyoto Cherry Blossom Special Experience"
    assert updated_trip["budget"] == 3200.0
    print(f" -> Updated Title: {updated_trip['title']}")
    print(f" -> Updated Budget: {updated_trip['budget']}")

    # 6. Trip Statistics
    print("\n[6/7] Testing GET /api/trips/stats/summary...")
    resp = client.get("/api/trips/stats/summary")
    assert resp.status_code == 200
    stats = resp.json()
    print(f" -> Total Trips: {stats['total_trips']}")
    print(f" -> Upcoming: {stats['upcoming_trips']}")
    print(f" -> Total Budget Planned: {stats['total_budget_planned']} {stats['primary_currency']}")
    assert stats["total_trips"] >= 1

    # 7. Delete Trip
    print(f"\n[7/7] Testing DELETE /api/trips/{trip_id}...")
    resp = client.delete(f"/api/trips/{trip_id}")
    assert resp.status_code == 200
    print(f" -> Deleted Response: {resp.json()['message']}")

    # Verify deleted
    resp = client.get(f"/api/trips/{trip_id}")
    assert resp.status_code == 404
    print(" -> Confirmed 404 Not Found after deletion.")

    print("\n==================================================")
    print(" ALL BACKEND API TESTS PASSED SUCCESSFULLY! ")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
