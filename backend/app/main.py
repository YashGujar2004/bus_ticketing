#entry point.
#configures CORS, registers routers, and creates database tables on startup.

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, Base

# Import all models so Base.metadata knows about them
from app.models.user import User       # noqa: F401
from app.models.bus import Bus         # noqa: F401
from app.models.booking import Booking # noqa: F401
from app.models.passenger import Passenger  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan:
    - On startup: create all database tables if they don't exist.
    - On shutdown: dispose the engine connection pool.
    """
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created / verified.")
    yield
    engine.dispose()
    print("🔌 Database connections closed.")


app = FastAPI(
    title="AI-Powered Bus Ticketing System",
    description="Book bus tickets with AI-powered natural language search, powered by FastAPI.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow the React frontend (Vite dev server) to communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": "Bus Ticketing API"}


# ── Router Registration ──────────────────────────────────────────────────────
# Import and include routers (they will be created in Phase 2)
from app.routers import auth, buses, bookings, admin  # noqa: E402

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(buses.router, prefix="/api/buses", tags=["Buses"])
app.include_router(bookings.router, prefix="/api/bookings", tags=["Bookings"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin Dashboard"])
