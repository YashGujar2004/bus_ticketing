"""
Buses router — CRUD for bus management, standard search, and AI-powered search.
"""

import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin, get_current_user
from app.models.bus import Bus
from app.schemas.bus import BusCreate, BusUpdate, BusResponse, AISearchQuery, AISearchResponse
from app.services.ai_search import search_buses_with_ai

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Public / Customer Endpoints ───────────────────────────────────────────────

@router.get("", response_model=list[BusResponse])
def list_buses(
    origin: Optional[str] = Query(None, description="Filter by origin city"),
    destination: Optional[str] = Query(None, description="Filter by destination city"),
    travel_date: Optional[date] = Query(None, description="Filter by travel date (YYYY-MM-DD)"),
    bus_type: Optional[str] = Query(None, description="Filter by bus type: AC, Non-AC, Sleeper"),
    db: Session = Depends(get_db),
):
    """List active buses with optional filters."""
    query = db.query(Bus).filter(Bus.status == "Active")

    if origin:
        query = query.filter(Bus.origin.ilike(f"%{origin}%"))
    if destination:
        query = query.filter(Bus.destination.ilike(f"%{destination}%"))
    if travel_date:
        query = query.filter(Bus.departure_date == travel_date)
    if bus_type:
        query = query.filter(Bus.bus_type == bus_type)

    return query.order_by(Bus.departure_time.asc()).all()


@router.get("/cities")
def get_cities(db: Session = Depends(get_db)):
    """Get distinct origins and destinations of active buses for autocomplete dropdowns."""
    origins = [r[0] for r in db.query(Bus.origin).filter(Bus.status == "Active").distinct().all() if r[0]]
    destinations = [r[0] for r in db.query(Bus.destination).filter(Bus.status == "Active").distinct().all() if r[0]]
    all_cities = sorted(list(set(origins + destinations)))
    return {
        "origins": sorted(origins),
        "destinations": sorted(destinations),
        "all_cities": all_cities,
    }


@router.get("/{bus_id}", response_model=BusResponse)
def get_bus(bus_id: int, db: Session = Depends(get_db)):
    """Get detailed info for a specific bus."""
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    return bus


@router.post("/ai-search", response_model=AISearchResponse)
def ai_search(payload: AISearchQuery, db: Session = Depends(get_db)):
    """
    AI-powered natural language bus search using OpenAI ChatGPT.

    The server injects the current date into the OpenAI system prompt so
    relative expressions like "tomorrow" or "next Friday" are resolved to
    absolute dates. Results are scored and ranked by relevance.
    """
    try:
        result = search_buses_with_ai(user_query=payload.query, db=db)

        # Convert ORM Bus objects to BusResponse schemas
        bus_responses = [BusResponse.model_validate(bus) for bus in result["buses"]]

        return AISearchResponse(
            extracted_params=result["extracted_params"],
            buses=bus_responses,
            message=result["message"],
        )

    except Exception as e:
        logger.error(f"AI search failed: {e}", exc_info=True)
        # Graceful degradation — return empty results with error message
        return AISearchResponse(
            extracted_params={"error": str(e)},
            buses=[],
            message=f"AI search temporarily unavailable. Please use the standard search. ({str(e)})",
        )


# ── Admin Endpoints ──────────────────────────────────────────────────────────

@router.post("", response_model=BusResponse, status_code=status.HTTP_201_CREATED)
def create_bus(
    payload: BusCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Create a new bus schedule. Admin only."""
    bus = Bus(
        name=payload.name,
        origin=payload.origin,
        destination=payload.destination,
        departure_date=payload.departure_date,
        departure_time=payload.departure_time,
        arrival_time=payload.arrival_time,
        bus_type=payload.bus_type,
        total_seats=payload.total_seats,
        available_seats=payload.total_seats,  # all seats start available
        price=payload.price,
        status="Active",
    )
    db.add(bus)
    db.commit()
    db.refresh(bus)
    return bus


@router.put("/{bus_id}", response_model=BusResponse)
def update_bus(
    bus_id: int,
    payload: BusUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Update bus details. Admin only."""
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")

    update_data = payload.model_dump(exclude_unset=True)

    # If total_seats is being changed, adjust available_seats proportionally
    if "total_seats" in update_data:
        booked = bus.total_seats - bus.available_seats
        new_total = update_data["total_seats"]
        if new_total < booked:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot reduce total seats below already booked count ({booked})",
            )
        update_data["available_seats"] = new_total - booked

    for key, value in update_data.items():
        setattr(bus, key, value)

    db.commit()
    db.refresh(bus)
    return bus


@router.delete("/{bus_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bus(
    bus_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Delete a bus schedule. Admin only."""
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    db.delete(bus)
    db.commit()
