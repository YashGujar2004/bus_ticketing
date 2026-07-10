/**
 * AdminDashboard — KPI cards, route demand, and occupancy analytics.
 */
import { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { adminAPI } from '../../api/client';
import { SkeletonCard } from '../../components/LoadingSkeleton';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const toast = useToast();
  const [kpi, setKpi] = useState(null);
  const [routeDemand, setRouteDemand] = useState([]);
  const [occupancy, setOccupancy] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [kpiRes, demandRes, occupancyRes, bookingsRes] = await Promise.all([
          adminAPI.dashboard(),
          adminAPI.routeDemand(),
          adminAPI.busOccupancy(),
          adminAPI.bookings(),
        ]);
        setKpi(kpiRes.data);
        setRouteDemand(demandRes.data);
        setOccupancy(occupancyRes.data);
        setAllBookings(bookingsRes.data);
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="container">
        <div className="page-header"><h1>Admin <span className="text-gradient">Dashboard</span></h1></div>
        <div className="kpi-grid">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      </div>
    );
  }

  const kpiCards = [
    { label: 'Total Buses', value: kpi?.total_buses || 0, icon: '🚌', color: 'var(--primary-500)' },
    { label: 'Active Buses', value: kpi?.active_buses || 0, icon: '✅', color: 'var(--success)' },
    { label: 'Total Bookings', value: kpi?.total_bookings || 0, icon: '🎫', color: 'var(--accent-violet)' },
    { label: 'Revenue', value: `₹${(kpi?.total_revenue || 0).toLocaleString('en-IN')}`, icon: '💰', color: 'var(--warning)' },
    { label: 'Active Bookings', value: kpi?.active_bookings || 0, icon: '📋', color: 'var(--info)' },
    { label: 'Cancelled', value: kpi?.cancelled_bookings || 0, icon: '❌', color: 'var(--danger)' },
  ];

  return (
    <div className="container">
      <div className="page-header">
        <h1>Admin <span className="text-gradient">Dashboard</span></h1>
        <p className="text-secondary">Platform analytics and insights</p>
      </div>

      {/* KPI Cards */}
      <section className="kpi-grid">
        {kpiCards.map((card, i) => (
          <div key={i} className={`kpi-card glass-card animate-fade-in-up stagger-${(i % 4) + 1}`}
            style={{ animationFillMode: 'backwards' }}>
            <div className="kpi-icon" style={{ background: `${card.color}20`, color: card.color }}>
              {card.icon}
            </div>
            <div className="kpi-info">
              <span className="kpi-value">{card.value}</span>
              <span className="kpi-label">{card.label}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Route Demand */}
      <section className="dashboard-section animate-fade-in-up">
        <h3>🗺️ Route Demand</h3>
        {routeDemand.length > 0 ? (
          <div className="table-wrapper glass-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Bookings</th>
                  <th>Passengers</th>
                  <th>Demand</th>
                </tr>
              </thead>
              <tbody>
                {routeDemand.map((route, i) => {
                  const maxBookings = Math.max(...routeDemand.map(r => r.booking_count));
                  const pct = maxBookings > 0 ? (route.booking_count / maxBookings) * 100 : 0;
                  return (
                    <tr key={i}>
                      <td className="route-cell">
                        <span>{route.origin}</span>
                        <span className="route-arrow-sm">→</span>
                        <span>{route.destination}</span>
                      </td>
                      <td>{route.booking_count}</td>
                      <td>{route.total_passengers}</td>
                      <td>
                        <div className="demand-bar-bg">
                          <div className="demand-bar" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-secondary">No booking data available yet.</p>
        )}
      </section>

      {/* Bus Occupancy */}
      <section className="dashboard-section animate-fade-in-up">
        <h3>📊 Bus Occupancy</h3>
        {occupancy.length > 0 ? (
          <div className="occupancy-grid">
            {occupancy.map((bus, i) => {
              const pct = bus.total_seats > 0
                ? ((bus.total_seats - bus.available_seats) / bus.total_seats) * 100
                : 0;
              const color = pct > 80 ? 'var(--danger)' : pct > 50 ? 'var(--warning)' : 'var(--success)';
              return (
                <div key={i} className="occupancy-card glass-card">
                  <div className="occupancy-name">{bus.name}</div>
                  <div className="occupancy-route text-muted">{bus.origin} → {bus.destination}</div>
                  <div className="occupancy-bar-bg">
                    <div className="occupancy-bar" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className="occupancy-stats">
                    <span style={{ color }}>{Math.round(pct)}% filled</span>
                    <span className="text-muted">
                      {bus.total_seats - bus.available_seats}/{bus.total_seats} seats
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-secondary">No bus occupancy data.</p>
        )}
      </section>

      {/* Customer Bookings & Passenger Directory */}
      <section className="dashboard-section animate-fade-in-up">
        <h3>👥 Customer Bookings & Passenger Details</h3>
        {allBookings.length > 0 ? (
          <div className="table-wrapper glass-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>PNR / Status</th>
                  <th>Customer Account</th>
                  <th>Bus & Route</th>
                  <th>Passengers</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {allBookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{b.pnr_code}</div>
                      <span className={`status-badge ${b.status === 'Confirmed' ? 'status-confirmed' : 'status-cancelled'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>👤 {b.customer_username}</div>
                      <div className="text-secondary" style={{ fontSize: '0.8rem' }}>✉️ {b.customer_email}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.bus_name}</div>
                      <div className="text-secondary" style={{ fontSize: '0.8rem' }}>{b.route}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {b.passengers.map((p, idx) => (
                          <span key={idx} className="param-chip" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                            {p.name} ({p.age}{p.gender[0]})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                        ₹{b.total_amount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                        {new Date(b.booking_time).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-secondary">No customer bookings recorded yet.</p>
        )}
      </section>
    </div>
  );
}
