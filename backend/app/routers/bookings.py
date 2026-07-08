#Bookings router — create bookings with atomic overbooking prevention and cancellation.

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.bus import Bus
from app.models.booking import Booking
from app.models.passenger import Passenger
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingResponse

router = APIRouter()


def _build_booking_response(booking: Booking) -> BookingResponse:
    """Helper to enrich booking response with bus details."""   
    bus = booking.bus
    return BookingResponse(
        id=booking.id,
        pnr_code=booking.pnr_code,
        bus_id=booking.bus_id,
        seat_count=booking.seat_count,
        total_amount=booking.total_amount,
        status=booking.status,
        booking_time=booking.booking_time,
        passengers=[p for p in booking.passengers],
        bus_name=bus.name if bus else "",
        bus_origin=bus.origin if bus else "",
        bus_destination=bus.destination if bus else "",
        bus_departure_time=bus.departure_time if bus else None,
        bus_type=bus.bus_type if bus else "",
    )


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new ticket booking with ATOMIC overbooking prevention.

    Uses a conditional UPDATE to decrement available_seats only if sufficient
    seats exist. If the affected row count is 0, the booking is rejected.
    This prevents overbooking even under high concurrency.
    """
    seat_count = len(payload.passengers)

    # ── Atomic seat decrement ─────────────────────────────────────────────
    # This single UPDATE ensures no race conditions:
    # - It only succeeds if available_seats >= requested seats
    # - PostgreSQL row-level locks prevent concurrent double-booking
    result = db.execute(
        text(
            "UPDATE buses "
            "SET available_seats = available_seats - :seats "
            "WHERE id = :bus_id AND available_seats >= :seats AND status = 'Active'"
        ),
        {"seats": seat_count, "bus_id": payload.bus_id},
    )

    if result.rowcount == 0:
        db.rollback()
        # Distinguish between "bus not found" and "not enough seats"
        bus = db.query(Bus).filter(Bus.id == payload.bus_id).first()
        if not bus:
            raise HTTPException(status_code=404, detail="Bus not found")
        if bus.status != "Active":
            raise HTTPException(status_code=400, detail="This bus service is not active")
        raise HTTPException(
            status_code=400,
            detail=f"Not enough seats available. Only {bus.available_seats} seat(s) remaining.",
        )

    # Fetch the bus to calculate total amount
    bus = db.query(Bus).filter(Bus.id == payload.bus_id).first()

    # ── Create booking record ─────────────────────────────────────────────
    booking = Booking(
        user_id=current_user.id,
        bus_id=payload.bus_id,
        seat_count=seat_count,
        total_amount=bus.price * seat_count,
        status="Confirmed",
    )
    db.add(booking)
    db.flush()  # get booking.id for passenger FK

    # ── Create passenger records ──────────────────────────────────────────
    for p in payload.passengers:
        passenger = Passenger(
            booking_id=booking.id,
            full_name=p.full_name,
            age=p.age,
            gender=p.gender,
        )
        db.add(passenger)

    db.commit()
    db.refresh(booking)

    return _build_booking_response(booking)


@router.get("/my-bookings", response_model=list[BookingResponse])
def get_my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all bookings for the currently authenticated customer."""
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == current_user.id)
        .order_by(Booking.booking_time.desc())
        .all()
    )
    return [_build_booking_response(b) for b in bookings]


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cancel a confirmed booking and atomically restore seats.
    Only the booking owner can cancel.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only cancel your own bookings")
    if booking.status == "Cancelled":
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    # ── Atomic seat restoration ───────────────────────────────────────────
    db.execute(
        text(
            "UPDATE buses "
            "SET available_seats = available_seats + :seats "
            "WHERE id = :bus_id"
        ),
        {"seats": booking.seat_count, "bus_id": booking.bus_id},
    )

    booking.status = "Cancelled"
    db.commit()
    db.refresh(booking)

    return _build_booking_response(booking)
