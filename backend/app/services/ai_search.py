"""
AI-Powered Bus Search Service — OpenAI ChatGPT Integration.

Converts natural language travel queries into structured search parameters
using OpenAI ChatGPT's structured output (JSON mode). The server injects the current
date into the system prompt so relative expressions like "tomorrow" or
"next Friday" are resolved into absolute YYYY-MM-DD dates by the LLM.
"""

import difflib
import json
import logging
import time
from datetime import date, datetime, timedelta
from typing import Optional

from openai import OpenAI
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.config import get_settings
from app.models.bus import Bus

logger = logging.getLogger(__name__)


def _get_openai_client() -> OpenAI:
    """Create an OpenAI client using the configured API key."""
    settings = get_settings()
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set in .env or settings")
    return OpenAI(api_key=settings.OPENAI_API_KEY)


# ── System Prompt Template ───────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a travel search assistant for an Indian bus ticketing platform.
Your job is to extract structured search parameters from a user's natural language query.

IMPORTANT CONTEXT:
- Today's date is: {current_date} ({day_of_week})
- Current time is: {current_time} IST

EXTRACTION RULES:
1. **origin**: The departure city. Extract the city name, capitalize properly. Correct and normalize minor spelling mistakes (e.g. "Banglore" -> "Bangalore", "Hydrabad" -> "Hyderabad", "Mumbay" -> "Mumbai", "Chenai" -> "Chennai", "Coimbator" -> "Coimbatore", "Delih" -> "Delhi").
2. **destination**: The arrival city. Extract the city name, capitalize properly. Correct and normalize minor spelling mistakes.
3. **travel_date**: Resolve to an absolute date in YYYY-MM-DD format ONLY if explicitly mentioned or clearly implied.
   - "tomorrow" → the day after today's date
   - "day after tomorrow" → two days after today
   - "today" / "tonight" → today's date
   - "this weekend" → the coming Saturday
   - "next Monday" / "next Friday" etc. → the next occurrence of that weekday
   - "July 15" / "15th July" → the explicit date in the current or next year
   - If NO explicit date is mentioned in the user query, set "travel_date": null
4. **time_preference**: One of "Morning" (05:00-11:59), "Afternoon" (12:00-16:59),
   "Evening" (17:00-20:59), "Night" (21:00-04:59), or null if not specified.
   - "morning bus" / "early morning" → "Morning"
   - "afternoon" / "post lunch" / "12 pm" / "2 pm" → "Afternoon"
   - "evening" / "after 5 PM" / "6 pm" → "Evening"
   - "night" / "overnight" / "late night" / "early night" / "sleeper night" → "Night"
5. **bus_type**: One of "AC", "Non-AC", "Sleeper", or null if not specified.
   - "AC" / "air conditioned" → "AC"
   - "non AC" / "non-AC" / "ordinary" / "regular" → "Non-AC"
   - "sleeper" / "sleeping" → "Sleeper"
6. **max_price**: Maximum ticket price as a number (INR), or null if not mentioned.
   - "under 1500" / "below 1500" / "less than ₹1500" → 1500
   - "around 1000" → 1000
   - "cheap" / "budget" → null (we'll sort by price instead)

Respond ONLY with a valid JSON object. No markdown, no explanation, no code fences.
Example output:
{{"origin": "Hyderabad", "destination": "Bangalore", "travel_date": "2026-07-08", "time_preference": "Morning", "bus_type": "AC", "max_price": 1500}}

If the query is completely unrelated to bus travel, respond with:
{{"error": "Query does not appear to be a bus travel search."}}
"""


# ── Time Preference → Hour Ranges ────────────────────────────────────────────

TIME_RANGES = {
    "Morning":   (5, 12),    # 05:00 - 11:59
    "Afternoon": (12, 17),   # 12:00 - 16:59
    "Evening":   (17, 21),   # 17:00 - 20:59
    "Night":     (21, 5),    # 21:00 - 04:59 (wraps around midnight)
}


def _build_system_prompt() -> str:
    """Build the system prompt with the current server date/time injected."""
    now = datetime.now()
    next_day = now + timedelta(days=1)
    return SYSTEM_PROMPT.format(
        current_date=now.strftime("%Y-%m-%d"),
        day_of_week=now.strftime("%A"),
        current_time=now.strftime("%H:%M"),
        next_date=next_day.strftime("%Y-%m-%d"),
        next_day_of_week=next_day.strftime("%A"),
    )


def _parse_ai_response(raw_text: str) -> dict:
    """
    Parse the raw OpenAI response text into a Python dict.
    Handles cases where output is wrapped in markdown code fences.
    """
    text = raw_text.strip()

    # Strip json markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse OpenAI response as JSON: {e}\nRaw: {raw_text}")
        return {"error": f"Failed to parse AI response: {str(e)}"}


def _match_city(query_city: Optional[str], db_city: str) -> bool:
    """
    Check if query_city matches db_city allowing exact match, substring match,
    or fuzzy match (to handle minor spelling mistakes like 'Banglore' vs 'Bangalore').
    """
    if not query_city or not db_city:
        return True
    q = query_city.strip().lower()
    d = db_city.strip().lower()
    if q == d or q in d or d in q:
        return True
    # Fuzzy match threshold 0.65 for typos
    ratio = difflib.SequenceMatcher(None, q, d).ratio()
    return ratio >= 0.65


def _score_bus(bus: Bus, params: dict) -> float:
    """
    Score a bus result for relevance ranking (higher = better match).

    Scoring factors:
    - Origin / Destination match: +40 points each (+80 total)
    - Exact date match: +50 points (close date: +20 points)
    - Time preference match: +30 points (close time: +10 points)
    - Bus type match: +25 points
    - Price within budget: +20 points
    - Available seats > 0: +5 bonus
    """
    score = 0.0

    # City match rewards
    origin = params.get("origin")
    if origin and _match_city(origin, bus.origin):
        score += 40

    destination = params.get("destination")
    if destination and _match_city(destination, bus.destination):
        score += 40

    # Date match
    travel_date_str = params.get("travel_date")
    if travel_date_str:
        try:
            travel_date = date.fromisoformat(travel_date_str)
            days_diff = abs((bus.departure_date - travel_date).days)
            if days_diff == 0:
                score += 50
            elif days_diff == 1:
                score += 20
            elif days_diff <= 3:
                score += 10
        except ValueError:
            pass
    else:
        # No date specified: give all available future/current buses a solid baseline
        score += 20

    # Time preference match
    time_pref = params.get("time_preference")
    if time_pref and time_pref in TIME_RANGES:
        start_hour, end_hour = TIME_RANGES[time_pref]
        dep_hour = bus.departure_time.hour

        if start_hour < end_hour:
            if start_hour <= dep_hour < end_hour:
                score += 30
            elif abs(dep_hour - start_hour) <= 2 or abs(dep_hour - end_hour) <= 2:
                score += 10
        else:
            if dep_hour >= start_hour or dep_hour < end_hour:
                score += 30
            else:
                score += 10

    # Bus type match
    bus_type = params.get("bus_type")
    if bus_type and bus.bus_type.lower() == bus_type.lower():
        score += 25

    # Price within budget
    max_price = params.get("max_price")
    if max_price is not None:
        try:
            max_price = float(max_price)
            if bus.price <= max_price:
                score += 20
        except (ValueError, TypeError):
            pass

    # Seat availability bonus
    if bus.available_seats > 0:
        score += 5

    return score


# ── Model Fallback Chain ─────────────────────────────────────────────────────
OPENAI_MODELS = [
    "gpt-4o-mini",
    "gpt-3.5-turbo",
    "gpt-4o",
]


def extract_search_params(user_query: str) -> dict:
    """
    Call OpenAI ChatGPT to extract structured search parameters
    from a natural language travel query.

    Implements a model fallback chain: if the primary model is rate-limited
    (429), tries alternative models before giving up.
    """
    client = _get_openai_client()
    system_prompt = _build_system_prompt()

    last_error = None

    for model_name in OPENAI_MODELS:
        try:
            logger.info(f"Trying OpenAI model: {model_name}")
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_query},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=300,
            )
            raw_text = response.choices[0].message.content or ""
            logger.info(f"OpenAI model {model_name} responded successfully")
            return _parse_ai_response(raw_text)

        except Exception as e:
            error_str = str(e)
            last_error = e
            logger.warning(f"OpenAI model {model_name} failed: {error_str[:200]}")

            if any(code in error_str for code in ["429", "RateLimitError", "503", "ServiceUnavailableError"]):
                logger.info(f"Rate-limited on {model_name}, trying next model...")
                time.sleep(1)
                continue
            else:
                break

    logger.error(f"All OpenAI models failed. Last error: {last_error}")
    return {"error": f"AI service temporarily unavailable: {str(last_error)}"}


def search_buses_with_ai(user_query: str, db: Session) -> dict:
    """
    End-to-end AI search pipeline:
    1. Extract structured params via OpenAI ChatGPT
    2. Query active buses and perform robust fuzzy matching on origin & destination
    3. Score all matching buses across date, time preference, bus type, and price
    4. Rank results descending by relevance score

    Returns dict with: extracted_params, buses (ranked), message
    """
    params = extract_search_params(user_query)

    if "error" in params:
        return {
            "extracted_params": params,
            "buses": [],
            "message": params["error"],
        }

    logger.info(f"AI extracted params: {params}")

    origin = params.get("origin")
    destination = params.get("destination")
    travel_date_str = params.get("travel_date")

    # Fetch all active buses
    all_active_buses = db.query(Bus).filter(Bus.status == "Active").all()

    # First pass: filter by fuzzy matching origin and destination if provided
    matched_buses = []
    for bus in all_active_buses:
        origin_ok = _match_city(origin, bus.origin) if origin else True
        dest_ok = _match_city(destination, bus.destination) if destination else True

        if origin_ok and dest_ok:
            matched_buses.append(bus)

    # Fallback: if no buses matched both origin and destination strict/fuzzy filters,
    # or if neither was specified, evaluate all active buses
    candidates = matched_buses if matched_buses else all_active_buses

    # Score and sort candidates
    scored_buses = [(bus, _score_bus(bus, params)) for bus in candidates]
    scored_buses.sort(key=lambda x: x[1], reverse=True)

    ranked_buses = [bus for bus, score in scored_buses]

    # Build human-readable message
    if ranked_buses:
        msg_parts = [f"Found {len(ranked_buses)} bus(es)"]
        if origin and destination:
            msg_parts.append(f"from {origin} to {destination}")
        elif origin:
            msg_parts.append(f"from {origin}")
        elif destination:
            msg_parts.append(f"to {destination}")
        if travel_date_str:
            msg_parts.append(f"for {travel_date_str}")
        time_pref = params.get("time_preference")
        if time_pref:
            msg_parts.append(f"({time_pref} departure)")
        message = " ".join(msg_parts) + "."
    else:
        message = "No buses found matching your search criteria. Try adjusting your dates or route."

    return {
        "extracted_params": params,
        "buses": ranked_buses,
        "message": message,
    }
