"""
Pydantic schemas for Bus CRUD operations and search responses.
"""

from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field


# ── Request Schemas ───────────────────────────────────────────────────────────

class BusCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, examples=["Volvo Express 101"])
    origin: str = Field(..., min_length=2, max_length=100, examples=["Hyderabad"])
    destination: str = Field(..., min_length=2, max_length=100, examples=["Bangalore"])
    departure_date: date = Field(..., examples=["2026-07-10"])
    departure_time: datetime = Field(..., examples=["2026-07-10T08:00:00+05:30"])
    arrival_time: datetime = Field(..., examples=["2026-07-10T14:30:00+05:30"])
    bus_type: str = Field(..., pattern="^(AC|Non-AC|Sleeper)$", examples=["AC"])
    total_seats: int = Field(..., ge=1, le=100, examples=[40])
    price: float = Field(..., gt=0, examples=[1200.0])


class BusUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    origin: Optional[str] = Field(None, min_length=2, max_length=100)
    destination: Optional[str] = Field(None, min_length=2, max_length=100)
    departure_date: Optional[date] = None
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    bus_type: Optional[str] = Field(None, pattern="^(AC|Non-AC|Sleeper)$")
    total_seats: Optional[int] = Field(None, ge=1, le=100)
    price: Optional[float] = Field(None, gt=0)
    status: Optional[str] = Field(None, pattern="^(Active|Inactive|Maintenance)$")


class BusSearchQuery(BaseModel):
    """Standard form-based search filters."""
    origin: Optional[str] = None
    destination: Optional[str] = None
    travel_date: Optional[date] = None
    bus_type: Optional[str] = Field(None, pattern="^(AC|Non-AC|Sleeper)$")


class AISearchQuery(BaseModel):
    """Natural language search input for OpenAI ChatGPT parsing."""
    query: str = Field(
        ...,
        min_length=5,
        max_length=500,
        examples=["I need an AC bus from Hyderabad to Bangalore tomorrow morning under 1500"],
    )


# ── Response Schemas ──────────────────────────────────────────────────────────

class BusResponse(BaseModel):
    id: int
    name: str
    origin: str
    destination: str
    departure_date: date
    departure_time: datetime
    arrival_time: datetime
    bus_type: str
    total_seats: int
    available_seats: int
    price: float
    status: str

    model_config = {"from_attributes": True}


class AISearchResponse(BaseModel):
    """Response from AI-powered search including extracted parameters."""
    extracted_params: dict
    buses: list[BusResponse]
    message: str = ""
