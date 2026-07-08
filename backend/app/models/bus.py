#bus ORM model represents a scheduled bus service
#tracks total/available seats for real-time inventory management

from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Enum as SAEnum
from sqlalchemy.orm import relationship

from app.core.database import Base


class Bus(Base):
    __tablename__ = "buses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)                     
    origin = Column(String(100), nullable=False, index=True)
    destination = Column(String(100), nullable=False, index=True)
    departure_date = Column(Date, nullable=False, index=True)
    departure_time = Column(DateTime(timezone=True), nullable=False)
    arrival_time = Column(DateTime(timezone=True), nullable=False)
    bus_type = Column(
        SAEnum("AC", "Non-AC", "Sleeper", name="bus_type_enum", create_constraint=True),
        nullable=False,
    )
    total_seats = Column(Integer, nullable=False)
    available_seats = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    status = Column(
        SAEnum("Active", "Inactive", "Maintenance", name="bus_status_enum", create_constraint=True),
        nullable=False,
        default="Active",
    )

    #relationships
    bookings = relationship("Booking", back_populates="bus", lazy="dynamic")

    def __repr__(self):
        return (
            f"<Bus id={self.id} {self.origin!r}→{self.destination!r} "
            f"type={self.bus_type!r} seats={self.available_seats}/{self.total_seats}>"
        )
