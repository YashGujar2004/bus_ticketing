#booking ORM shows confirmed or cancelled ticket reservation.
#each booking links a user to a bus and with a unique PNR code.

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship

from app.core.database import Base


def generate_pnr() -> str:
    #Generates a unique 8-character for PNR code
    return uuid.uuid4().hex[:8].upper()


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    pnr_code = Column(String(8), unique=True, nullable=False, default=generate_pnr, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    bus_id = Column(Integer, ForeignKey("buses.id", ondelete="CASCADE"), nullable=False, index=True)
    seat_count = Column(Integer, nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(
        SAEnum("Confirmed", "Cancelled", name="booking_status_enum", create_constraint=True),
        nullable=False,
        default="Confirmed",
    )
    booking_time = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    #Relationships 
    user = relationship("User", back_populates="bookings")
    bus = relationship("Bus", back_populates="bookings")
    passengers = relationship(
        "Passenger", back_populates="booking", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self):
        return f"<Booking id={self.id} pnr={self.pnr_code!r} status={self.status!r}>"
