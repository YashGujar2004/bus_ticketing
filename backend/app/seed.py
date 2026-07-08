#database seed script - creates sample admin/customer users and bus schedules

from datetime import datetime, date, timedelta, timezone
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.bus import Bus
from app.models.booking import Booking        # noqa: F401 — needed for relationship resolution
from app.models.passenger import Passenger    # noqa: F401 — needed for relationship resolution

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed():
    """Populate database with sample data for development."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # ── Users ─────────────────────────────────────────────────────────
        if not db.query(User).first():
            admin_user = User(
                username="admin",
                email="admin@busticket.com",
                hashed_password=pwd_context.hash("admin123"),
                role="admin",
            )
            customer_user = User(
                username="user",
                email="user@mail.com",
                hashed_password=pwd_context.hash("user123"),
                role="customer",
            )
            db.add_all([admin_user, customer_user])
            db.flush()
            print("✅ Users seeded: admin / admin123, user / user123")
        else:
            print("⚠️  Users table already has data. Skipping user seed.")

        # ── Buses ─────────────────────────────────────────────────────────
        if not db.query(Bus).first():
            today = date.today()
            tomorrow = today + timedelta(days=1)
            day_after = today + timedelta(days=2)

            sample_buses = [
                Bus(
                    name="Volvo Express 101",
                    origin="Hyderabad",
                    destination="Bangalore",
                    departure_date=tomorrow,
                    departure_time=datetime(tomorrow.year, tomorrow.month, tomorrow.day, 8, 0, tzinfo=timezone.utc),
                    arrival_time=datetime(tomorrow.year, tomorrow.month, tomorrow.day, 14, 30, tzinfo=timezone.utc),
                    bus_type="AC",
                    total_seats=40,
                    available_seats=40,
                    price=1200.0,
                    status="Active",
                ),
                Bus(
                    name="SuperFast Sleeper 202",
                    origin="Hyderabad",
                    destination="Bangalore",
                    departure_date=tomorrow,
                    departure_time=datetime(tomorrow.year, tomorrow.month, tomorrow.day, 22, 0, tzinfo=timezone.utc),
                    arrival_time=datetime(day_after.year, day_after.month, day_after.day, 6, 0, tzinfo=timezone.utc),
                    bus_type="Sleeper",
                    total_seats=36,
                    available_seats=36,
                    price=1500.0,
                    status="Active",
                ),
                Bus(
                    name="City Connect Non-AC 303",
                    origin="Mumbai",
                    destination="Pune",
                    departure_date=tomorrow,
                    departure_time=datetime(tomorrow.year, tomorrow.month, tomorrow.day, 10, 0, tzinfo=timezone.utc),
                    arrival_time=datetime(tomorrow.year, tomorrow.month, tomorrow.day, 13, 30, tzinfo=timezone.utc),
                    bus_type="Non-AC",
                    total_seats=50,
                    available_seats=50,
                    price=450.0,
                    status="Active",
                ),
                Bus(
                    name="Royal AC Premium 404",
                    origin="Chennai",
                    destination="Coimbatore",
                    departure_date=day_after,
                    departure_time=datetime(day_after.year, day_after.month, day_after.day, 6, 0, tzinfo=timezone.utc),
                    arrival_time=datetime(day_after.year, day_after.month, day_after.day, 14, 0, tzinfo=timezone.utc),
                    bus_type="AC",
                    total_seats=44,
                    available_seats=44,
                    price=800.0,
                    status="Active",
                ),
                Bus(
                    name="Night Rider Sleeper 505",
                    origin="Delhi",
                    destination="Jaipur",
                    departure_date=tomorrow,
                    departure_time=datetime(tomorrow.year, tomorrow.month, tomorrow.day, 21, 0, tzinfo=timezone.utc),
                    arrival_time=datetime(day_after.year, day_after.month, day_after.day, 4, 30, tzinfo=timezone.utc),
                    bus_type="Sleeper",
                    total_seats=30,
                    available_seats=30,
                    price=900.0,
                    status="Active",
                ),
                Bus(
                    name="Express Non-AC 606",
                    origin="Bangalore",
                    destination="Hyderabad",
                    departure_date=day_after,
                    departure_time=datetime(day_after.year, day_after.month, day_after.day, 7, 0, tzinfo=timezone.utc),
                    arrival_time=datetime(day_after.year, day_after.month, day_after.day, 13, 0, tzinfo=timezone.utc),
                    bus_type="Non-AC",
                    total_seats=48,
                    available_seats=48,
                    price=550.0,
                    status="Active",
                ),
            ]

            db.add_all(sample_buses)
            print(f"✅ {len(sample_buses)} sample buses seeded.")
        else:
            print("⚠️  Buses table already has data. Skipping bus seed.")

        db.commit()
        print("✅ Database seeding check complete!")

    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
