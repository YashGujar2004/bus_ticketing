# BusTicket — AI-Powered Bus Booking System

A modern, full-stack bus ticketing application featuring a natural language search engine powered by OpenAI ChatGPT, a robust FastAPI backend with atomic booking, and a beautiful React frontend with a custom glassmorphism design system.

## 🌟 Key Features

* **AI-Powered Search:** Customers can search for buses using natural language (e.g., "Cheapest bus to Pune from Mumbai this weekend"). Uses OpenAI ChatGPT (`gpt-4o-mini`) with structured JSON mode and a multi-model fallback chain to ensure high availability.
* **Atomic Transactions:** Backend booking engine uses PostgreSQL row-level locking to prevent double-booking and overbooking under high concurrency.
* **Admin Dashboard:** Comprehensive metrics showing total/active buses, route demand, bus occupancy rates, and revenue analytics.
* **Glassmorphism UI:** A custom, highly responsive CSS design system with micro-animations and seamless user experience.
* **Role-Based Auth:** Secure JWT-based authentication distinguishing between `customer` and `admin` roles.

## 🛠️ Technology Stack

**Backend:**
* Python 3.10+
* FastAPI
* PostgreSQL & SQLAlchemy 2.0
* OpenAI Python SDK (`gpt-4o-mini` with fallbacks)
* bcrypt & pyjwt (Authentication)

**Frontend:**
* React 18
* Vite
* React Router DOM
* Axios
* Custom Vanilla CSS (Design Tokens, Glassmorphism)

---

## 🚀 Getting Started

### Prerequisites
* Python 3.10+
* Node.js (v18+ recommended)
* PostgreSQL running locally or remotely

### 1. Database Setup

Ensure PostgreSQL is running and create a database for the application:
```sql
CREATE DATABASE bus_ticketing;
```

### 2. Backend Setup

Open a terminal and navigate to the `backend` directory:

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**Environment Variables:**
Create a `.env` file in the `backend` directory or export the following variables in your terminal:

```bash
export POSTGRE_DB_USER="postgres"
export POSTGRE_DB_PASS="your_password"      
export POSTGRE_DB_HOST="localhost"
export POSTGRE_DB_PORT=5432
export POSTGRE_DB_NAME="bus_ticketing"
export OPENAI_API_KEY="your_openai_api_key"
export JWT_SECRET_KEY="your_super_secret_jwt_key"
```

**Seed the Database (First-time setup):**
After configuring the database, run the seed script to populate sample buses and users (this is required to have an admin and test user):
```bash
python3 -m app.seed
```

**Run the Backend Server:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*(The backend runs on `http://localhost:8000`)*

*Note: On first startup, FastAPI will automatically create the database tables if they do not exist. The seed script creates a default admin user (`admin` / `admin123`) and a customer user (`user` / `user123`).*

### 3. Frontend Setup

Open a new terminal and navigate to the `frontend` directory:

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev -- --port 5173
```
*(The frontend runs on `http://localhost:5173`)*

---

## 🧑‍💻 Usage Guide

### Customer Flow
1. Navigate to `http://localhost:5173/`.
2. Register a new account or log in.
3. Try the **AI Search Bar** by typing something like: *"I need a sleeper bus to Bangalore tomorrow."*
4. Select a bus, enter passenger details, and confirm the booking.
5. View and manage your tickets in the **My Bookings** section.

### Admin Flow
1. Log in with the default admin credentials:
   * **Username:** `admin`
   * **Password:** `admin123`
2. You will be redirected to the **Admin Dashboard** (`/admin/dashboard`).
3. View real-time platform KPIs, Route Demand, and Bus Occupancy.
4. Navigate to **Manage Buses** to Add, Edit, or Delete bus schedules.

## 🛡️ Architecture & Resilience

* **Multi-Model LLM Chain:** The natural language extractor first tries `gpt-4o-mini`. If it hits rate limits (429) or availability issues (503), it automatically gracefully degrades to `gpt-3.5-turbo` and `gpt-4o`.
* **Database Concurrency:** The `/api/bookings` endpoint utilizes conditional `UPDATE` statements combined with PostgreSQL's ACID compliance to guarantee that available seats never drop below zero, completely eliminating race conditions.
