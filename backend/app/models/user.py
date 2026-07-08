#user ORM model supports 'admin' and 'customer' roles
#passwords are hashed with bcrypt via passlib

from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship

from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(
        SAEnum("admin", "customer", name="user_role_enum", create_constraint=True),
        nullable=False,
        default="customer",
    )
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    #relationships
    bookings = relationship("Booking", back_populates="user", lazy="dynamic")

    def __repr__(self):
        return f"<User id={self.id} username={self.username!r} role={self.role!r}>"
