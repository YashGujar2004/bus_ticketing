/**
 * SearchPage — customer landing page with standard search, AI search, and booking flow.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { busAPI, bookingAPI } from '../../api/client';
import AISearchBar from '../../components/AISearchBar';
import BusCard from '../../components/BusCard';
import Modal from '../../components/Modal';
import { SkeletonCard } from '../../components/LoadingSkeleton';
import './SearchPage.css';

function CityAutocompleteInput({ id, label, placeholder, value, onChange, options = [], datalistId }) {
  const [open, setOpen] = useState(false);

  const filtered = !value.trim()
    ? options
    : options.filter((c) => c.toLowerCase().includes(value.toLowerCase()));

  return (
    <div className="input-group" style={{ position: 'relative' }}>
      <label htmlFor={id}>{label}</label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={id}
          className="input"
          placeholder={placeholder}
          list={datalistId}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          autoComplete="off"
          style={{ paddingRight: '28px', width: '100%' }}
        />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          tabIndex={-1}
          style={{
            position: 'absolute',
            right: '8px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '2px 4px',
            fontSize: '0.75rem',
          }}
          title="Show existing cities"
        >
          ▼
        </button>
      </div>
      {open && filtered.length > 0 && (
        <ul
          className="city-autocomplete-dropdown glass-card"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 99,
            maxHeight: '190px',
            overflowY: 'auto',
            margin: 0,
            padding: '6px',
            listStyle: 'none',
            borderRadius: '8px',
            border: '1px solid var(--glass-border)',
            background: '#131826',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
          }}
        >
          {filtered.map((city) => (
            <li
              key={city}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(city);
                setOpen(false);
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderRadius: '6px',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: value.toLowerCase() === city.toLowerCase() ? 'var(--primary-400)' : 'var(--text-primary)',
                fontWeight: value.toLowerCase() === city.toLowerCase() ? '600' : '400',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span>📍</span> {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SearchPage() {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Search state
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiParams, setAiParams] = useState(null);
  const [aiMessage, setAiMessage] = useState('');

  // Existing database cities for dropdown autocomplete
  const [cities, setCities] = useState({ origins: [], destinations: [], all_cities: [] });

  // Standard search filters
  const [filters, setFilters] = useState({
    origin: '', destination: '', travel_date: '', bus_type: '',
  });

  // Booking modal state
  const [bookingBus, setBookingBus] = useState(null);
  const [passengers, setPassengers] = useState([{ full_name: '', age: '', gender: 'Male' }]);
  const [bookingLoading, setBookingLoading] = useState(false);

  // ── Load buses and cities on mount ──────────────────────────────────
  useEffect(() => {
    fetchBuses();
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      const res = await busAPI.cities();
      setCities(res.data);
    } catch {
      // Silently ignore if cities endpoint is temporarily unavailable
    }
  };

  const fetchBuses = async (params = {}) => {
    setLoading(true);
    try {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '' && v != null)
      );
      const res = await busAPI.list(cleanParams);
      setBuses(res.data);
      setAiParams(null);
      setAiMessage('');
    } catch {
      toast.error('Failed to load buses');
    } finally {
      setLoading(false);
    }
  };

  // ── Standard search ─────────────────────────────────────────────────
  const handleStandardSearch = (e) => {
    e.preventDefault();
    fetchBuses(filters);
  };

  const clearFilters = () => {
    setFilters({ origin: '', destination: '', travel_date: '', bus_type: '' });
    fetchBuses();
  };

  // ── AI search ───────────────────────────────────────────────────────
  const handleAISearch = async (query) => {
    setAiLoading(true);
    try {
      const res = await busAPI.aiSearch(query);
      setBuses(res.data.buses);
      setAiParams(res.data.extracted_params);
      setAiMessage(res.data.message);
    } catch {
      toast.error('AI search failed. Please try standard search.');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Booking ─────────────────────────────────────────────────────────
  const openBooking = (bus) => {
    if (!isAuthenticated) {
      toast.info('Please login to book tickets');
      navigate('/login');
      return;
    }
    setBookingBus(bus);
    setPassengers([{ full_name: '', age: '', gender: 'Male' }]);
  };

  const addPassenger = () => {
    if (passengers.length < 10) {
      setPassengers([...passengers, { full_name: '', age: '', gender: 'Male' }]);
    }
  };

  const removePassenger = (idx) => {
    if (passengers.length > 1) {
      setPassengers(passengers.filter((_, i) => i !== idx));
    }
  };

  const updatePassenger = (idx, field, value) => {
    setPassengers(passengers.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    const invalid = passengers.some(p => !p.full_name || !p.age || p.age < 1);
    if (invalid) { toast.error('Please fill all passenger details'); return; }

    setBookingLoading(true);
    try {
      const payload = {
        bus_id: bookingBus.id,
        passengers: passengers.map(p => ({ ...p, age: parseInt(p.age) })),
      };
      const res = await bookingAPI.create(payload);
      toast.success(`Booking confirmed! PNR: ${res.data.pnr_code}`);
      setBookingBus(null);
      fetchBuses(filters);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="container">
      {/* Hero Section */}
      <section className="search-hero animate-fade-in">
        <h1>Find Your Next <span className="text-gradient">Bus Journey</span></h1>
        <p className="text-secondary">
          Search with AI or use filters — book seats instantly with real-time availability
        </p>
      </section>

      {/* AI Search */}
      <section className="search-section animate-fade-in-up">
        <AISearchBar onSearch={handleAISearch} loading={aiLoading} />
        {aiParams && !aiParams.error && (
          <div className="ai-extracted-params">
            <span className="params-label">AI understood:</span>
            {aiParams.origin && <span className="param-chip">📍 {aiParams.origin}</span>}
            {aiParams.destination && <span className="param-chip">📍 {aiParams.destination}</span>}
            {aiParams.travel_date && <span className="param-chip">📅 {aiParams.travel_date}</span>}
            {aiParams.time_preference && <span className="param-chip">🕐 {aiParams.time_preference}</span>}
            {aiParams.bus_type && <span className="param-chip">🚌 {aiParams.bus_type}</span>}
            {aiParams.max_price && <span className="param-chip">💰 ≤₹{aiParams.max_price}</span>}
          </div>
        )}
        {aiMessage && <p className="ai-message">{aiMessage}</p>}
      </section>

      {/* Divider */}
      <div className="search-divider">
        <span className="divider-line" />
        <span className="divider-text">or use standard filters</span>
        <span className="divider-line" />
      </div>

      {/* Standard Search */}
      <section className="standard-search">
        <form onSubmit={handleStandardSearch} className="filter-form">
          <CityAutocompleteInput
            id="filter-origin"
            label="Origin"
            placeholder="From city"
            datalistId="origins-list"
            value={filters.origin}
            onChange={(val) => setFilters({ ...filters, origin: val })}
            options={cities.origins}
          />
          <CityAutocompleteInput
            id="filter-dest"
            label="Destination"
            placeholder="To city"
            datalistId="destinations-list"
            value={filters.destination}
            onChange={(val) => setFilters({ ...filters, destination: val })}
            options={cities.destinations}
          />
          <div className="input-group">
            <label htmlFor="filter-date">Travel Date</label>
            <input id="filter-date" className="input" type="date"
              value={filters.travel_date} onChange={(e) => setFilters({ ...filters, travel_date: e.target.value })} />
          </div>
          <div className="input-group">
            <label htmlFor="filter-type">Bus Type</label>
            <select id="filter-type" className="input"
              value={filters.bus_type} onChange={(e) => setFilters({ ...filters, bus_type: e.target.value })}>
              <option value="">All Types</option>
              <option value="AC">AC</option>
              <option value="Non-AC">Non-AC</option>
              <option value="Sleeper">Sleeper</option>
            </select>
          </div>
          <div className="filter-actions">
            <button type="submit" className="btn btn-primary" id="filter-search-btn">Search</button>
            <button type="button" className="btn btn-ghost" onClick={clearFilters}>Clear</button>
          </div>
        </form>
      </section>

      {/* Results */}
      <section className="results-section">
        <div className="results-header">
          <h3>{loading ? 'Loading...' : `${buses.length} bus${buses.length !== 1 ? 'es' : ''} found`}</h3>
        </div>
        <div className="bus-grid">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : buses.length > 0 ? (
            buses.map((bus, i) => (
              <div key={bus.id} className={`stagger-${(i % 4) + 1}`} style={{ animationFillMode: 'backwards' }}>
                <BusCard bus={bus} onBook={openBooking} />
              </div>
            ))
          ) : (
            <div className="empty-state">
              <span className="empty-icon">🔍</span>
              <h4>No buses found</h4>
              <p className="text-secondary">Try adjusting your search filters or route</p>
            </div>
          )}
        </div>
      </section>

      {/* Booking Modal */}
      <Modal
        isOpen={!!bookingBus}
        onClose={() => setBookingBus(null)}
        title={`Book — ${bookingBus?.name || ''}`}
        size="lg"
      >
        {bookingBus && (
          <form onSubmit={handleBooking} className="booking-form">
            <div className="booking-summary glass-card">
              <div className="booking-route">
                <span>{bookingBus.origin}</span>
                <span className="text-gradient">→</span>
                <span>{bookingBus.destination}</span>
              </div>
              <div className="booking-meta text-secondary">
                {new Date(bookingBus.departure_time).toLocaleString('en-IN', {
                  dateStyle: 'medium', timeStyle: 'short',
                })}
                &nbsp;·&nbsp;₹{bookingBus.price}/seat
                &nbsp;·&nbsp;{bookingBus.available_seats} seats left
              </div>
            </div>

            <div className="passengers-header">
              <h4>Passengers ({passengers.length})</h4>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addPassenger}
                disabled={passengers.length >= 10 || passengers.length >= bookingBus.available_seats}>
                + Add Passenger
              </button>
            </div>

            {passengers.map((p, i) => (
              <div key={i} className="passenger-row">
                <span className="passenger-num">#{i + 1}</span>
                <input className="input" placeholder="Full Name" value={p.full_name}
                  onChange={(e) => updatePassenger(i, 'full_name', e.target.value)} required />
                <input className="input passenger-age" type="number" placeholder="Age" min="1" max="120"
                  value={p.age} onChange={(e) => updatePassenger(i, 'age', e.target.value)} required />
                <select className="input passenger-gender" value={p.gender}
                  onChange={(e) => updatePassenger(i, 'gender', e.target.value)}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {passengers.length > 1 && (
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => removePassenger(i)}>✕</button>
                )}
              </div>
            ))}

            <div className="booking-total">
              <span>Total Amount</span>
              <span className="total-price">₹{(bookingBus.price * passengers.length).toLocaleString('en-IN')}</span>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={bookingLoading}
              id="confirm-booking-btn" style={{ width: '100%' }}>
              {bookingLoading ? 'Confirming...' : `Confirm Booking — ₹${(bookingBus.price * passengers.length).toLocaleString('en-IN')}`}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
