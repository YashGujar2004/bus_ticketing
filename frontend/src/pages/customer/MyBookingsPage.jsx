/**
 * MyBookingsPage — customer's booking history with cancellation support.
 */
import { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { bookingAPI } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonCard } from '../../components/LoadingSkeleton';
import './MyBookingsPage.css';

export default function MyBookingsPage() {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingAPI.myBookings();
      setBookings(res.data);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(id);
    try {
      await bookingAPI.cancel(id);
      toast.success('Booking cancelled successfully');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cancellation failed');
    } finally {
      setCancelling(null);
    }
  };

  const handleDownloadInvoice = async (booking) => {
    try {
      const response = await bookingAPI.downloadInvoice(booking.id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BusTicket_Invoice_${booking.pnr_code}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice downloaded successfully');
    } catch {
      toast.error('Failed to download invoice');
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (d) =>
    new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="container">
      <div className="page-header">
        <h1>My <span className="text-gradient">Bookings</span></h1>
        <p className="text-secondary">Manage your bus reservations</p>
      </div>

      {loading ? (
        <div className="bookings-grid">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🎫</span>
          <h4>No bookings yet</h4>
          <p className="text-secondary">Search and book a bus to get started</p>
        </div>
      ) : (
        <div className="bookings-grid">
          {bookings.map((booking, i) => (
            <div key={booking.id} className={`booking-card glass-card animate-fade-in-up stagger-${(i % 4) + 1}`}
              style={{ animationFillMode: 'backwards' }}>
              {/* Header: PNR + Status */}
              <div className="booking-card-header">
                <div className="booking-pnr">
                  <span className="pnr-label">PNR</span>
                  <span className="pnr-code">{booking.pnr_code}</span>
                </div>
                <StatusBadge status={booking.status} />
              </div>

              {/* Route */}
              <div className="booking-route-info">
                <div className="booking-city">
                  <span className="city-name">{booking.bus_origin || '—'}</span>
                  <span className="city-time">{booking.bus_departure_time ? formatTime(booking.bus_departure_time) : ''}</span>
                </div>
                <div className="booking-arrow">→</div>
                <div className="booking-city">
                  <span className="city-name">{booking.bus_destination || '—'}</span>
                </div>
              </div>

              {/* Details */}
              <div className="booking-details">
                <div className="detail-item">
                  <span className="detail-label">Date</span>
                  <span>{booking.bus_departure_time ? formatDate(booking.bus_departure_time) : '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Bus</span>
                  <span>{booking.bus_name || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Passengers</span>
                  <span>{booking.seat_count}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total</span>
                  <span className="detail-price">₹{booking.total_amount?.toLocaleString('en-IN') || '—'}</span>
                </div>
              </div>

              {/* Passengers List */}
              {booking.passengers && booking.passengers.length > 0 && (
                <div className="booking-passengers">
                  <span className="detail-label">Passenger Details</span>
                  <div className="passenger-list">
                    {booking.passengers.map((p, j) => (
                      <span key={j} className="passenger-tag">
                        {p.full_name}, {p.age}{p.gender?.[0] || ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {booking.status === 'Confirmed' && (
                <div className="booking-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleDownloadInvoice(booking)}
                    id={`download-invoice-${booking.id}`}
                  >
                    📄 Download PDF Invoice
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleCancel(booking.id)}
                    disabled={cancelling === booking.id}
                    id={`cancel-booking-${booking.id}`}
                  >
                    {cancelling === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
