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
    "Reasoning constraint: Keep internal reasoning under 30 words. Do not deliberate. Output JSON immediately.\n"
    "RULES:\n"
    "1. Keep activity descriptions brief and punchy (1-2 sentences).\n"
    "2. All prices must be marked as estimates.\n"
    "3. Adhere strictly to the requested JSON schema."
)

user_prompt = """
Generate a structured 2-day itinerary for Tokyo.
Travelers: 2. Budget: 2000.0 USD. Style: balanced. Pace: 2 activities per day.
Interests: sightseeing, food. Stay: Boutique Hotel. Diet: None.
Notes: Shibuya and ramen.

OUTPUT FORMAT (JSON only):
{
  "destination": "Tokyo",
  "days": [
    {
      "day_number": 1,
      "date": "2026-11-18",
      "title": "Day 1: Historic Tokyo",
      "summary": "Brief summary",
      "accommodation": "Boutique hotel in Shibuya",
      "dining_recommendations": "Local ramen spots",
      "transportation_notes": "Subway transit",
      "estimated_accommodation_cost": 120.0,
      "estimated_dining_cost": 50.0,
      "estimated_transport_cost": 20.0,
      "activities": [
        {
          "time_slot": "09:30 AM",
          "title": "Senso-ji Temple",
          "description": "Historic Buddhist temple in Asakusa.",
          "location": "Asakusa, Tokyo",
          "category": "sightseeing",
          "estimated_cost": 10.0
        },
        {
          "time_slot": "02:00 PM",
          "title": "Tokyo Skytree",
          "description": "Panoramic observation tower.",
          "location": "Sumida, Tokyo",
          "category": "sightseeing",
          "estimated_cost": 25.0
        }
      ]
    }
  ],
  "budget_breakdown": {
    "estimated_accommodation_total": 240.0,
    "estimated_food_total": 100.0,
    "estimated_transport_total": 40.0,
    "estimated_activities_total": 70.0,
    "estimated_grand_total": 450.0,
    "remaining_budget": 1550.0,
    "is_over_budget": false
  },
  "general_tips": ["Use Suica card"],
  "disclaimer": "All prices and hours are estimates."
}
Ensure exactly 2 days in the array.
"""

payload = {
    "model": model,
    "messages": [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ],
    "max_tokens": 8192,
    "temperature": 0.1
}

print("Testing concise 2-day plan...")
t0 = time.time()
resp = httpx.post(url, headers=headers, json=payload, timeout=120.0)
print(f"Status: {resp.status_code} in {round(time.time() - t0, 2)}s")
if resp.status_code == 200:
    ch = resp.json()["choices"][0]
    print("Finish reason:", ch.get("finish_reason"))
    content = ch["message"].get("content")
    print("Has content?:", bool(content))
    print("Content len:", len(content) if content else 0)
