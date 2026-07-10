#Bookings router — create bookings with atomic overbooking prevention and cancellation.

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
import io
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


@router.get("/{booking_id}/invoice")
def get_booking_invoice(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate and return a downloadable PDF invoice for a confirmed ticket booking.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this invoice")

    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Heading1"],
        fontSize=22,
        textColor=colors.HexColor("#38bdf8"),
        spaceAfter=10,
    )
    sub_style = ParagraphStyle(
        "InvoiceSub",
        parent=styles["Normal"],
        fontSize=11,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=15,
    )

    story = []
    story.append(Paragraph("BusTicket — Official Tax & Booking Invoice", title_style))
    story.append(Paragraph(f"PNR Code: <b>{booking.pnr_code}</b> | Status: <b>{booking.status}</b>", sub_style))
    story.append(Spacer(1, 10))

    bus = booking.bus
    bus_name = bus.name if bus else "N/A"
    route = f"{bus.origin} -> {bus.destination}" if bus else "N/A"
    dep_time = bus.departure_time.strftime("%d %b %Y, %I:%M %p") if bus and bus.departure_time else "N/A"

    meta_data = [
        ["Booking ID:", str(booking.id), "Date Booked:", booking.booking_time.strftime("%d %b %Y, %I:%M %p")],
        ["Bus Service:", bus_name, "Route:", route],
        ["Departure:", dep_time, "Total Seats:", str(booking.seat_count)],
    ]
    meta_table = Table(meta_data, colWidths=[90, 170, 80, 180])
    meta_table.setStyle(TableStyle([
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#1e293b")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 15))

    pass_data = [["#", "Passenger Name", "Age", "Gender"]]
    for idx, p in enumerate(booking.passengers, 1):
        pass_data.append([str(idx), p.full_name, str(p.age), p.gender])

    pass_table = Table(pass_data, colWidths=[40, 260, 100, 120])
    pass_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    story.append(pass_table)
    story.append(Spacer(1, 20))

    summary_data = [
        ["Total Amount Paid (INR):", f"INR {booking.total_amount:,.2f}"]
    ]
    sum_table = Table(summary_data, colWidths=[380, 140])
    sum_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 13),
        ("TEXTCOLOR", (1, 0), (1, 0), colors.HexColor("#059669")),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(sum_table)

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    headers = {
        "Content-Disposition": f'attachment; filename="BusTicket_Invoice_{booking.pnr_code}.pdf"'
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
