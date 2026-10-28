import os, httpx, time, json
from dotenv import load_dotenv

load_dotenv('backend/.env')
api_key = os.getenv('NVIDIA_API_KEY')
model = os.getenv('NVIDIA_MODEL')
url = 'https://integrate.api.nvidia.com/v1/chat/completions'
headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}

system_prompt = (
    "You are WanderWise AI, a concise, honest travel planner. "
    "Output strictly valid JSON matching the schema. "
    "Reasoning constraint: Keep reasoning under 50 words. Do not deliberate. Output JSON immediately.\n"
    "RULES:\n"
    "1. Realistic schedule: Group morning, afternoon, and evening activities by nearby locations.\n"
    "2. Honest estimates: All ticket prices, dining, and transit must be clearly marked as estimates.\n"
    "3. Respect budget: Distribute the budget across days for accommodation, dining, transit, and activities.\n"
    "4. Output MUST adhere strictly to the requested JSON schema."
)

user_prompt = """
Generate a structured 3-day itinerary for Tokyo.
Dates: 2026-11-18 to 2026-11-20 (3 days).
Travelers: 2. Budget: 2000.0 USD. Style: balanced. Pace: balanced (3 activities per day).
Interests: sightseeing, food, culture. Stay: Boutique Hotel in Shibuya. Diet: None / Flexible. Access: None.
Notes: Interested in Shibuya, Akihabara, and authentic ramen.
Special Request: Focus on historic Asakusa on morning Day 1, and teamLab planets on Day 2.

OUTPUT FORMAT (JSON only):
{
  "destination": "Tokyo",
  "days": [
    {
      "day_number": 1,
      "date": "2026-11-18",
      "title": "Day 1: Arrival & Exploring Central District",
      "summary": "Brief summary of day...",
      "accommodation": "Recommended stay matching Boutique Hotel in Shibuya...",
      "dining_recommendations": "Lunch & dinner spots catering to None / Flexible...",
      "transportation_notes": "Transit directions and walking notes...",
      "estimated_accommodation_cost": 100.0,
      "estimated_dining_cost": 40.0,
      "estimated_transport_cost": 15.0,
      "activities": [
        {
          "time_slot": "09:30 AM",
          "title": "Landmark visit",
          "description": "Practical visit details...",
          "location": "Central Tokyo",
          "category": "sightseeing",
          "estimated_cost": 20.0
        }
      ]
    }
  ],
  "budget_breakdown": {
    "estimated_accommodation_total": 0.0,
    "estimated_food_total": 0.0,
    "estimated_transport_total": 0.0,
    "estimated_activities_total": 0.0,
    "estimated_grand_total": 0.0,
    "remaining_budget": 0.0,
    "is_over_budget": false
  },
  "general_tips": [
    "Practical travel tip 1",
    "Practical travel tip 2"
  ],
  "disclaimer": "All prices, hours, and availability are AI-generated estimates and not confirmed reservations or live transit schedules. Please verify with official venues."
}
Ensure exactly 3 days in the array.
"""

payload = {
    "model": model,
    "messages": [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ],
    "max_tokens": 16384,
    "temperature": 0.1
}

print(f"Calling {model} with max_tokens=16384...")
t0 = time.time()
resp = httpx.post(url, headers=headers, json=payload, timeout=120.0)
elapsed = round(time.time() - t0, 2)
print(f"Status: {resp.status_code} ({elapsed}s)")
if resp.status_code == 200:
    ch = resp.json()["choices"][0]
    print("Finish reason:", ch.get("finish_reason"))
    content = ch["message"].get("content")
    print("Has content?:", bool(content))
    reasoning = ch["message"].get("reasoning_content", "")
    print(f"Reasoning len: {len(reasoning)} chars")
    if content:
        print(f"Content len: {len(content)} chars")
        print("Content sample:\n", content[:300])
