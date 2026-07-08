/**
 * BusCard — glassmorphism card displaying bus route, time, seats, price, and book action.
 */
import StatusBadge from './StatusBadge';
import './BusCard.css';

export default function BusCard({ bus, onBook }) {
  const departure = new Date(bus.departure_time);
  const arrival = new Date(bus.arrival_time);
  const durationMs = arrival - departure;
  const durationHrs = Math.floor(durationMs / 3600000);
  const durationMins = Math.floor((durationMs % 3600000) / 60000);

  const formatTime = (d) =>
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const formatDate = (d) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const seatsLow = bus.available_seats <= 5 && bus.available_seats > 0;
  const soldOut = bus.available_seats === 0;

  return (
    <div className={`bus-card glass-card animate-fade-in-up ${soldOut ? 'sold-out' : ''}`} id={`bus-card-${bus.id}`}>
      {/* Header: name + type badge */}
      <div className="bus-card-header">
        <h4 className="bus-name">{bus.name}</h4>
        <StatusBadge status={bus.bus_type} size="sm" />
      </div>

      {/* Route: origin → destination with time */}
      <div className="bus-route">
        <div className="route-point">
          <span className="route-time">{formatTime(departure)}</span>
          <span className="route-city">{bus.origin}</span>
          <span className="route-date">{formatDate(departure)}</span>
        </div>
        <div className="route-line">
          <span className="route-duration">{durationHrs}h {durationMins}m</span>
          <div className="route-connector">
            <div className="route-dot" />
            <div className="route-dash" />
            <div className="route-arrow">▸</div>
          </div>
        </div>
        <div className="route-point">
          <span className="route-time">{formatTime(arrival)}</span>
          <span className="route-city">{bus.destination}</span>
          <span className="route-date">{formatDate(arrival)}</span>
        </div>
      </div>

      {/* Footer: seats + price + book */}
      <div className="bus-card-footer">
        <div className="bus-seats">
          {soldOut ? (
            <span className="seats-sold-out">Sold Out</span>
          ) : (
            <>
              <span className={`seats-count ${seatsLow ? 'seats-low' : ''}`}>
                {bus.available_seats} seat{bus.available_seats !== 1 ? 's' : ''}
              </span>
              {seatsLow && (
                <span className="seats-urgency">Filling fast!</span>
              )}
            </>
          )}
        </div>
        <div className="bus-price-action">
          <span className="bus-price">₹{bus.price.toLocaleString('en-IN')}</span>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onBook?.(bus)}
            disabled={soldOut}
            id={`book-btn-${bus.id}`}
          >
            {soldOut ? 'Sold Out' : 'Book Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
