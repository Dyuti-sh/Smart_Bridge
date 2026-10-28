import json
import re
import logging
from typing import Dict, Any, Optional, List
from datetime import date, timedelta
import httpx

from app.config import settings
from app.schemas.trip import (
    AIGeneratedItinerary,
    AIGeneratedDay,
    AIActivityItem,
    AIBudgetBreakdown
)

logger = logging.getLogger("wanderwise.ai_service")

class AIServiceError(Exception):
    """Custom exception raised when an AI generation or API error occurs."""
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class AIService:
    """
    Multi-provider generative AI service supporting NVIDIA NIM, OpenAI, Groq, and Gemini.
    Generates structured, validated day-by-day travel itineraries and single-day regenerations.
    """

    @classmethod
    def get_provider_details(cls) -> Dict[str, str]:
        provider = settings.active_provider
        if provider == "none":
            raise AIServiceError(
                "No AI API key configured. Please set NVIDIA_API_KEY, OPENAI_API_KEY, "
                "or GROQ_API_KEY in backend/.env.",
                status_code=400
            )

        if provider == "nvidia":
            return {
                "provider": "nvidia",
                "api_key": settings.NVIDIA_API_KEY,
                "model": settings.NVIDIA_MODEL or "nvidia/nemotron-3.5-bolt-e4b",
                "base_url": settings.NVIDIA_BASE_URL.rstrip("/"),
            }
        elif provider == "openai":
            return {
                "provider": "openai",
                "api_key": settings.OPENAI_API_KEY,
                "model": settings.OPENAI_MODEL or "gpt-4o-mini",
                "base_url": (settings.OPENAI_BASE_URL or "https://api.openai.com/v1").rstrip("/"),
            }
        elif provider == "groq":
            return {
                "provider": "groq",
                "api_key": settings.GROQ_API_KEY,
                "model": settings.GROQ_MODEL or "llama-3.3-70b-versatile",
                "base_url": settings.GROQ_BASE_URL.rstrip("/"),
            }
        elif provider == "gemini":
            return {
                "provider": "gemini",
                "api_key": settings.GEMINI_API_KEY,
                "model": settings.GEMINI_MODEL or "gemini-2.0-flash",
                "base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
            }

        raise AIServiceError(f"Unsupported AI provider '{provider}'.", status_code=400)

    @classmethod
    def _clean_json_response(cls, raw_text: str) -> str:
        """
        Strips reasoning blocks, markdown fences, and extracts clean JSON.
        Handles thinking tokens from models like Nemotron/DeepSeek.
        """
        text = raw_text.strip()

        # Remove <think>...</think> blocks if present
        text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()

        # Extract markdown json block if wrapped in ```json ... ```
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
        if json_match:
            return json_match.group(1).strip()

        # If bare JSON inside curly braces
        first_brace = text.find('{')
        last_brace = text.rfind('}')
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            return text[first_brace:last_brace + 1].strip()

        return text

    @classmethod
    async def _call_llm(cls, messages: List[Dict[str, str]], max_tokens: int = 16384, temperature: float = 0.1) -> str:
        """Dispatches an async HTTP call to the active OpenAI-compatible LLM endpoint."""
        cfg = cls.get_provider_details()
        endpoint = f"{cfg['base_url']}/chat/completions"

        headers = {
            "Authorization": f"Bearer {cfg['api_key']}",
            "Content-Type": "application/json"
        }

        models_to_try = [cfg["model"]]
        last_error = None

        for model_name in models_to_try:
            payload = {
                "model": model_name,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature
            }

            try:
                transport = httpx.AsyncHTTPTransport(retries=2)
                async with httpx.AsyncClient(transport=transport, timeout=180.0) as client:
                    response = await client.post(endpoint, headers=headers, json=payload)
            except httpx.TimeoutException:
                last_error = AIServiceError(
                    f"Request to {cfg['provider']} model '{model_name}' timed out after 180 seconds.",
                    status_code=504
                )
                continue
            except httpx.RequestError as e:
                logger.warning(f"Transient network error calling {cfg['provider']}: {e}. Retrying once...")
                try:
                    import asyncio
                    await asyncio.sleep(2.0)
                    async with httpx.AsyncClient(timeout=180.0) as client:
                        response = await client.post(endpoint, headers=headers, json=payload)
                except Exception as retry_err:
                    raise AIServiceError(
                        f"Network error communicating with {cfg['provider']} API: {str(retry_err)}",
                        status_code=502
                    )

            if response.status_code == 401:
                raise AIServiceError(
                    f"Invalid or unauthorized API key for provider '{cfg['provider']}'. "
                    "Please verify the credentials in backend/.env.",
                    status_code=401
                )
            elif response.status_code == 429:
                raise AIServiceError(
                    f"{cfg['provider'].upper()} rate limit reached. Please wait a few seconds before generating again.",
                    status_code=429
                )
            elif response.status_code >= 400:
                error_detail = response.text
                try:
                    err_json = response.json()
                    if "error" in err_json and isinstance(err_json["error"], dict):
                        error_detail = err_json["error"].get("message", error_detail)
                    elif "detail" in err_json:
                        error_detail = str(err_json["detail"])
                except Exception:
                    pass
                last_error = AIServiceError(
                    f"{cfg['provider'].upper()} API returned error ({response.status_code}): {error_detail}",
                    status_code=502
                )
                continue

            resp_data = response.json()
            choices = resp_data.get("choices", [])
            if not choices:
                last_error = AIServiceError("The AI model returned an empty choice set.", status_code=502)
                continue

            msg = choices[0].get("message", {})
            content = msg.get("content")
            
            # If content is null but reasoning exhausted tokens, try next model
            if not content and msg.get("reasoning_content"):
                finish_reason = choices[0].get("finish_reason")
                if finish_reason == "length":
                    logger.warning(f"Model {model_name} exhausted tokens during reasoning. Attempting fallback model...")
                    last_error = AIServiceError("The model reasoning exhausted token limit.", status_code=502)
                    continue

            if content and len(content.strip()) > 10:
                return content

        if last_error:
            raise last_error

        raise AIServiceError("The AI model returned an empty response body.", status_code=502)

    @classmethod
    async def generate_itinerary(
        cls,
        trip_data: Dict[str, Any],
        custom_instructions: Optional[str] = None
    ) -> AIGeneratedItinerary:
        """
        Generates a comprehensive, day-wise travel itinerary using the configured LLM.
        Adheres to honest travel guidelines, budget distribution, and date constraints.
        """
        destination = trip_data["destination"]
        start_date_str = str(trip_data["start_date"])
        end_date_str = str(trip_data["end_date"])
        
        # Calculate duration
        start = date.fromisoformat(start_date_str) if isinstance(trip_data["start_date"], str) else trip_data["start_date"]
        end = date.fromisoformat(end_date_str) if isinstance(trip_data["end_date"], str) else trip_data["end_date"]
        duration_days = max(1, (end - start).days + 1)
        # Cap to 7 days for prompt/token safety
        duration_days = min(duration_days, 7)

        budget = float(trip_data.get("budget", 1000.0))
        currency = trip_data.get("currency", "USD")
        travelers = int(trip_data.get("travelers", 1))
        travel_style = trip_data.get("travel_style", "balanced")
        pace = trip_data.get("pace", "balanced")
        interests = trip_data.get("interests", ["sightseeing", "food"])
        if isinstance(interests, str):
            try:
                interests = json.loads(interests)
            except Exception:
                interests = [interests]

        accommodation_pref = trip_data.get("accommodation_pref", "Hotel")
        dietary_pref = trip_data.get("dietary_pref", "None")
        accessibility_req = trip_data.get("accessibility_req", "None")
        user_notes = trip_data.get("additional_notes", "")
        extra_inst = custom_instructions or ""

        # Activity count target
        activities_per_day = {
            "relaxed": "2 activities per day",
            "balanced": "2 activities per day",
            "packed": "3 activities per day"
        }.get(pace, "2 activities per day")

        system_prompt = (
            "You are WanderWise AI, a concise, honest travel planner. "
            "Output strictly valid JSON matching the schema. "
            "Reasoning constraint: Keep reasoning under 40 words. Do not deliberate. Output JSON immediately.\n"
            "RULES:\n"
            "1. Realistic schedule: Group morning and afternoon activities by nearby locations.\n"
            "2. Keep activity descriptions brief and punchy (1-2 sentences each).\n"
            "3. Honest estimates: All ticket prices, dining, and transit must be clearly marked as estimates.\n"
            "4. Respect budget: Distribute the budget across days for accommodation, dining, transit, and activities.\n"
            "5. Output MUST adhere strictly to the requested JSON schema."
        )

        user_prompt = f"""
Generate a structured {duration_days}-day itinerary for {destination}.
Dates: {start_date_str} to {end_date_str} ({duration_days} days).
Travelers: {travelers}. Budget: {budget} {currency}. Style: {travel_style}. Pace: {pace} ({activities_per_day}).
Interests: {', '.join(interests)}. Stay: {accommodation_pref}. Diet: {dietary_pref}. Access: {accessibility_req}.
Notes: {user_notes}
{f"Special Request: {extra_inst}" if extra_inst else ""}

OUTPUT FORMAT (JSON only):
{{
  "destination": "{destination}",
  "days": [
    {{
      "day_number": 1,
      "date": "{start_date_str}",
      "title": "Day 1: Arrival & Exploring Central District",
      "summary": "Brief summary of day...",
      "accommodation": "Recommended stay matching {accommodation_pref}...",
      "dining_recommendations": "Lunch & dinner spots catering to {dietary_pref}...",
      "transportation_notes": "Transit directions and walking notes...",
      "estimated_accommodation_cost": 100.0,
      "estimated_dining_cost": 40.0,
      "estimated_transport_cost": 15.0,
      "activities": [
        {{
          "time_slot": "09:30 AM",
          "title": "Landmark visit",
          "description": "Practical visit details...",
          "location": "Central {destination}",
          "category": "sightseeing",
          "estimated_cost": 20.0
        }}
      ]
    }}
  ],
  "budget_breakdown": {{
    "estimated_accommodation_total": 0.0,
    "estimated_food_total": 0.0,
    "estimated_transport_total": 0.0,
    "estimated_activities_total": 0.0,
    "estimated_grand_total": 0.0,
    "remaining_budget": 0.0,
    "is_over_budget": false
  }},
  "general_tips": [
    "Practical travel tip 1",
    "Practical travel tip 2"
  ],
  "disclaimer": "All prices, hours, and availability are AI-generated estimates and not confirmed reservations or live transit schedules. Please verify with official venues."
}}
Ensure exactly {duration_days} days in the array.
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        logger.info(f"Dispatching AI itinerary generation for trip destination '{destination}' ({duration_days} days)")
        raw_output = await cls._call_llm(messages, max_tokens=16384, temperature=0.1)
        cleaned_json = cls._clean_json_response(raw_output)

        try:
            data = json.loads(cleaned_json)
        except json.JSONDecodeError as err:
            logger.error(f"Failed to parse model JSON: {err}. Raw output:\n{raw_output[:500]}")
            raise AIServiceError(
                "The AI model output could not be parsed into valid JSON. "
                "Please retry the generation.",
                status_code=502
            )

        parsed_days = data.get("days") or data.get("itinerary") or []
        if not parsed_days:
            raise AIServiceError("The AI model did not produce any itinerary days.", status_code=502)

        # Validate & normalize day dates
        for idx, d in enumerate(parsed_days):
            day_num = idx + 1
            d["day_number"] = day_num
            day_date = start + timedelta(days=idx)
            d["date"] = str(day_date)
            
            d["estimated_accommodation_cost"] = float(d.get("estimated_accommodation_cost") or 0.0)
            d["estimated_dining_cost"] = float(d.get("estimated_dining_cost") or 0.0)
            d["estimated_transport_cost"] = float(d.get("estimated_transport_cost") or 0.0)

            for act in d.get("activities", []):
                act["estimated_cost"] = float(act.get("estimated_cost") or 0.0)
                if not act.get("category"):
                    act["category"] = "sightseeing"

        # Calculate actual sum totals for budget breakdown
        total_activities = sum(
            sum(act.get("estimated_cost", 0.0) for act in d.get("activities", []))
            for d in parsed_days
        )
        total_accom = sum(d.get("estimated_accommodation_cost", 0.0) for d in parsed_days)
        total_food = sum(d.get("estimated_dining_cost", 0.0) for d in parsed_days)
        total_transport = sum(d.get("estimated_transport_cost", 0.0) for d in parsed_days)
        grand_total = total_activities + total_accom + total_food + total_transport
        remaining = round(budget - grand_total, 2)

        data["budget_breakdown"] = {
            "estimated_accommodation_total": round(total_accom, 2),
            "estimated_food_total": round(total_food, 2),
            "estimated_transport_total": round(total_transport, 2),
            "estimated_activities_total": round(total_activities, 2),
            "estimated_grand_total": round(grand_total, 2),
            "remaining_budget": remaining,
            "is_over_budget": remaining < 0
        }

        # Pydantic validation
        try:
            itinerary = AIGeneratedItinerary(**data)
            return itinerary
        except Exception as val_err:
            logger.error(f"Pydantic validation error on AI itinerary: {val_err}")
            raise AIServiceError(
                f"Generated itinerary failed schema validation: {str(val_err)}",
                status_code=502
            )

    @classmethod
    async def generate_single_day(
        cls,
        trip_data: Dict[str, Any],
        day_number: int,
        day_date: str,
        custom_instructions: Optional[str] = None
    ) -> AIGeneratedDay:
        """
        Regenerates a single day with fresh AI recommendations while respecting
        trip parameters and preferences.
        """
        destination = trip_data["destination"]
        travel_style = trip_data.get("travel_style", "balanced")
        pace = trip_data.get("pace", "balanced")
        interests = trip_data.get("interests", ["sightseeing", "food"])
        if isinstance(interests, str):
            try:
                interests = json.loads(interests)
            except Exception:
                interests = [interests]

        accommodation_pref = trip_data.get("accommodation_pref", "Hotel")
        dietary_pref = trip_data.get("dietary_pref", "None")
        accessibility_req = trip_data.get("accessibility_req", "None")
        user_notes = trip_data.get("additional_notes", "")
        extra_inst = custom_instructions or ""

        system_prompt = (
            "You are WanderWise AI, a concise travel assistant. "
            "Output strictly valid JSON matching the schema for a SINGLE DAY. "
            "Reasoning constraint: Keep internal reasoning under 50 words. Do not deliberate. Output JSON immediately."
        )

        user_prompt = f"""
Plan Day {day_number} ({day_date}) of a trip to {destination}.
Style: {travel_style}. Pace: {pace}. Interests: {', '.join(interests)}.
Stay: {accommodation_pref}. Diet: {dietary_pref}. Access: {accessibility_req}.
Notes: {user_notes}
{f"Custom instructions for this day: {extra_inst}" if extra_inst else ""}

OUTPUT EXACT JSON SCHEMA:
{{
  "day_number": {day_number},
  "date": "{day_date}",
  "title": "Day {day_number}: Neighborhood Theme in {destination}",
  "summary": "Cohesive summary of this day's highlights...",
  "accommodation": "Specific stay recommendation matching {accommodation_pref}...",
  "dining_recommendations": "Curated lunch and dinner options catering to {dietary_pref}...",
  "transportation_notes": "Transit directions and walking tips...",
  "estimated_accommodation_cost": 100.0,
  "estimated_dining_cost": 40.0,
  "estimated_transport_cost": 15.0,
  "activities": [
    {{
      "time_slot": "09:30 AM",
      "title": "Morning Landmark or Activity",
      "description": "Engaging description with practical visit advice...",
      "location": "Neighborhood / District in {destination}",
      "category": "sightseeing",
      "estimated_cost": 20.0
    }},
    {{
      "time_slot": "01:30 PM",
      "title": "Afternoon Exploration or Food Stop",
      "description": "Engaging description...",
      "location": "Nearby district in {destination}",
      "category": "dining",
      "estimated_cost": 25.0
    }},
    {{
      "time_slot": "06:00 PM",
      "title": "Evening Viewpoint or Event",
      "description": "Sunset view, evening walk, or local experience...",
      "location": "Central area in {destination}",
      "category": "culture",
      "estimated_cost": 20.0
    }}
  ]
}}
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        logger.info(f"Regenerating Day {day_number} for {destination}")
        raw_output = await cls._call_llm(messages, max_tokens=8192, temperature=0.1)
        cleaned_json = cls._clean_json_response(raw_output)

        try:
            data = json.loads(cleaned_json)
        except json.JSONDecodeError as err:
            logger.error(f"Failed to parse single day model JSON: {err}")
            raise AIServiceError("The model did not return valid JSON for the day plan.", status_code=502)

        data["day_number"] = day_number
        data["date"] = day_date
        data["estimated_accommodation_cost"] = float(data.get("estimated_accommodation_cost") or 0.0)
        data["estimated_dining_cost"] = float(data.get("estimated_dining_cost") or 0.0)
        data["estimated_transport_cost"] = float(data.get("estimated_transport_cost") or 0.0)

        for act in data.get("activities", []):
            act["estimated_cost"] = float(act.get("estimated_cost") or 0.0)

        try:
            return AIGeneratedDay(**data)
        except Exception as err:
            raise AIServiceError(f"Day plan validation failed: {str(err)}", status_code=502)
