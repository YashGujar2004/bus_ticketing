"""
Pydantic schemas for Booking creation, cancellation, and responses.
"""

from datetime import datetime
from pydantic import BaseModel, Field


# ── Nested Passenger Schema ───────────────────────────────────────────────────

class PassengerCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, examples=["Rahul Sharma"])
    age: int = Field(..., ge=1, le=120, examples=[28])
    gender: str = Field(..., pattern="^(Male|Female|Other)$", examples=["Male"])


class PassengerResponse(BaseModel):
    id: int
    full_name: str
    age: int
    gender: str

    model_config = {"from_attributes": True}


# ── Booking Schemas ───────────────────────────────────────────────────────────

class BookingCreate(BaseModel):
    bus_id: int = Field(..., examples=[1])
    passengers: list[PassengerCreate] = Field(
        ...,
        min_length=1,
        max_length=10,
        description="List of passengers; seat_count is derived from length.",
    )


class BookingResponse(BaseModel):
    id: int
    pnr_code: str
    bus_id: int
    seat_count: int
    total_amount: float
    status: str
    booking_time: datetime
    passengers: list[PassengerResponse]

    # Include bus route info for display in "My Bookings"
    bus_name: str = ""
    bus_origin: str = ""
    bus_destination: str = ""
    bus_departure_time: datetime | None = None
    bus_type: str = ""

    model_config = {"from_attributes": True}
