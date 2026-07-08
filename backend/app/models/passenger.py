#passenger ORM stores individual passenger details per booking
#multiple passengers can be associated with a single booking

from sqlalchemy import Column, Integer, String, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship

from app.core.database import Base


class Passenger(Base):
    __tablename__ = "passengers"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(
        Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    full_name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(
        SAEnum("Male", "Female", "Other", name="gender_enum", create_constraint=True),
        nullable=False,
    )

    #relationships
    booking = relationship("Booking", back_populates="passengers")

    def __repr__(self):
        return f"<Passenger id={self.id} name={self.full_name!r} age={self.age}>"
