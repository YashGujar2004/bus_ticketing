#Admin dashboard router - real-time KPIs and analytics endpoints.

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.core.database import get_db
from app.core.security import require_admin
from app.models.bus import Bus
from app.models.booking import Booking

router = APIRouter()


@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db), admin=Depends(require_admin)):
    """
    Admin dashboard KPIs:
    - Total and active bus counts
    - Total, active (confirmed), and cancelled booking counts
    - Total revenue from confirmed bookings
    """
    # Bus counts
    total_buses = db.query(func.count(Bus.id)).scalar() or 0
    active_buses = (
        db.query(func.count(Bus.id)).filter(Bus.status == "Active").scalar() or 0
    )

    # Booking counts
    total_bookings = db.query(func.count(Booking.id)).scalar() or 0
    active_bookings = (
        db.query(func.count(Booking.id))
        .filter(Booking.status == "Confirmed")
        .scalar()
        or 0
    )
    cancelled_bookings = (
        db.query(func.count(Booking.id))
        .filter(Booking.status == "Cancelled")
        .scalar()
        or 0
    )

    # Total revenue from confirmed bookings
    total_revenue = (
        db.query(func.coalesce(func.sum(Booking.total_amount), 0.0))
        .filter(Booking.status == "Confirmed")
        .scalar()
    )

    return {
        "total_buses": total_buses,
        "active_buses": active_buses,
        "total_bookings": total_bookings,
        "active_bookings": active_bookings,
        "cancelled_bookings": cancelled_bookings,
        "total_revenue": round(float(total_revenue), 2),
    }


@router.get("/route-demand")
def get_route_demand(db: Session = Depends(get_db), admin=Depends(require_admin)):
    """
    Route-wise demand analysis:
    Returns booking volume grouped by origin→destination corridors.
    """
    from app.models.passenger import Passenger
    results = (
        db.query(
            Bus.origin,
            Bus.destination,
            func.count(Booking.id).label("booking_count"),
            func.coalesce(func.sum(Booking.seat_count), 0).label("total_passengers"),
            func.coalesce(func.sum(Booking.total_amount), 0.0).label("total_revenue"),
        )
        .join(Booking, Booking.bus_id == Bus.id)
        .filter(Booking.status == "Confirmed")
        .group_by(Bus.origin, Bus.destination)
        .order_by(func.count(Booking.id).desc())
        .all()
    )

    return [
        {
            "origin": r.origin,
            "destination": r.destination,
            "booking_count": r.booking_count,
            "total_passengers": int(r.total_passengers),
            "total_revenue": round(float(r.total_revenue), 2),
        }
        for r in results
    ]


@router.get("/bus-occupancy")
def get_bus_occupancy(db: Session = Depends(get_db), admin=Depends(require_admin)):
    """
    Per-bus occupancy rates for active buses.
    Used for the admin analytics dashboard bar chart.
    """
    buses = db.query(Bus).filter(Bus.status == "Active").order_by(Bus.name).all()
    return [
        {
            "id": b.id,
            "name": b.name,
            "origin": b.origin,
            "destination": b.destination,
            "total_seats": b.total_seats,
            "available_seats": b.available_seats,
            "booked_seats": b.total_seats - b.available_seats,
            "occupancy_rate": round(
                ((b.total_seats - b.available_seats) / b.total_seats * 100) if b.total_seats > 0 else 0,
                1,
            ),
        }
        for b in buses
    ]
