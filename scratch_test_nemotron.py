import os, httpx, time, json
from dotenv import load_dotenv

load_dotenv('backend/.env')
api_key = os.getenv('NVIDIA_API_KEY')
model = os.getenv('NVIDIA_MODEL')
url = 'https://integrate.api.nvidia.com/v1/chat/completions'
headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}

system_prompt = (
    "You are WanderWise AI, a concise travel assistant. "
    "Output strictly valid JSON matching the schema. "
    "Keep reasoning under 50 words. Do not deliberate. Output JSON immediately."
)

schema_sample = {
    "days": [
        {
            "day_number": 1,
            "date": "2026-11-18",
            "title": "Day 1 Title",
            "summary": "Brief summary",
            "accommodation": "Recommended hotel",
            "dining_recommendations": "Lunch and dinner spots",
            "transportation_notes": "Transit tips",
            "estimated_accommodation_cost": 120.0,
            "estimated_dining_cost": 50.0,
            "estimated_transport_cost": 20.0,
            "activities": [
                {
                    "time_slot": "09:00 AM",
                    "title": "Morning Landmark",
                    "description": "Details",
                    "location": "Tokyo",
                    "category": "sightseeing",
                    "estimated_cost": 25.0
                }
            ]
        }
    ],
    "budget_breakdown": {
        "estimated_accommodation_total": 360.0,
        "estimated_food_total": 150.0,
        "estimated_transport_total": 60.0,
        "estimated_activities_total": 150.0,
        "estimated_grand_total": 720.0,
        "remaining_budget": 1280.0,
        "is_over_budget": False
    },
    "general_tips": ["Travel tip 1"],
    "disclaimer": "All prices are estimates."
}

user_prompt = f"Generate a 3-day Tokyo trip for 2 people. Total budget: 2000 USD. Output JSON matching this schema exactly:\n{json.dumps(schema_sample)}"

payload = {
    "model": model,
    "messages": [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ],
    "max_tokens": 6144,
    "temperature": 0.1
}

print(f"Calling {model} with max_tokens=6144...")
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
