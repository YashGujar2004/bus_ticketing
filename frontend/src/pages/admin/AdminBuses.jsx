/**
 * AdminBuses — CRUD table for managing bus fleet with create/edit modal.
 */
import { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { busAPI } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import { SkeletonTable } from '../../components/LoadingSkeleton';
import './AdminBuses.css';

const EMPTY_FORM = {
  name: '', origin: '', destination: '',
  departure_date: '', departure_time: '', arrival_time: '',
  bus_type: 'AC', total_seats: 40, price: '',
};

export default function AdminBuses() {
  const toast = useToast();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBus, setEditBus] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { fetchBuses(); }, []);

  const fetchBuses = async () => {
    setLoading(true);
    try {
      const res = await busAPI.list();
      setBuses(res.data);
    } catch {
      toast.error('Failed to load buses');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditBus(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEdit = (bus) => {
    setEditBus(bus);
    setForm({
      name: bus.name,
      origin: bus.origin,
      destination: bus.destination,
      departure_date: bus.departure_date,
      departure_time: bus.departure_time?.slice(0, 16) || '',
      arrival_time: bus.arrival_time?.slice(0, 16) || '',
      bus_type: bus.bus_type,
      total_seats: bus.total_seats,
      price: bus.price,
      status: bus.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        total_seats: parseInt(form.total_seats),
        price: parseFloat(form.price),
      };
      // Add timezone offset for datetime fields
      if (payload.departure_time && !payload.departure_time.includes('+')) {
        payload.departure_time = payload.departure_time + ':00+05:30';
      }
      if (payload.arrival_time && !payload.arrival_time.includes('+')) {
        payload.arrival_time = payload.arrival_time + ':00+05:30';
      }

      if (editBus) {
        await busAPI.update(editBus.id, payload);
        toast.success('Bus updated successfully');
      } else {
        await busAPI.create(payload);
        toast.success('Bus created successfully');
      }
      setModalOpen(false);
      fetchBuses();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bus? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await busAPI.delete(id);
      toast.success('Bus deleted');
      fetchBuses();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const formatTime = (d) =>
    new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Manage <span className="text-gradient">Buses</span></h1>
          <p className="text-secondary">Create, update, and manage bus schedules</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} id="create-bus-btn">+ New Bus</button>
      </div>

      {/* Bus Table */}
      {loading ? (
        <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
          <SkeletonTable rows={5} />
        </div>
      ) : (
        <div className="table-wrapper glass-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bus Name</th>
                <th>Route</th>
                <th>Date</th>
                <th>Time</th>
                <th>Type</th>
                <th>Seats</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {buses.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-muted)' }}>No buses found. Create one to get started.</td></tr>
              ) : (
                buses.map((bus) => (
                  <tr key={bus.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{bus.name}</td>
                    <td>
                      <span className="route-cell">
                        {bus.origin} <span className="route-arrow-sm">→</span> {bus.destination}
                      </span>
                    </td>
                    <td>{formatDate(bus.departure_time)}</td>
                    <td>
                      <span style={{ fontSize: '0.8125rem' }}>
                        {formatTime(bus.departure_time)} — {formatTime(bus.arrival_time)}
                      </span>
                    </td>
                    <td><StatusBadge status={bus.bus_type} size="sm" /></td>
                    <td>
                      <span style={{ color: bus.available_seats <= 5 ? 'var(--warning)' : 'var(--text-secondary)' }}>
                        {bus.available_seats}/{bus.total_seats}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>₹{bus.price.toLocaleString('en-IN')}</td>
                    <td><StatusBadge status={bus.status} size="sm" /></td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(bus)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(bus.id)}
                          disabled={deleting === bus.id}>
                          {deleting === bus.id ? '...' : 'Del'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editBus ? `Edit — ${editBus.name}` : 'Create New Bus'} size="lg">
        <form onSubmit={handleSubmit} className="bus-form">
          <div className="form-grid-2">
            <div className="input-group">
              <label htmlFor="bus-name">Bus Name</label>
              <input id="bus-name" className="input" placeholder="e.g. Volvo Express 101"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="input-group">
              <label htmlFor="bus-type">Bus Type</label>
              <select id="bus-type" className="input" value={form.bus_type}
                onChange={(e) => setForm({ ...form, bus_type: e.target.value })}>
                <option value="AC">AC</option>
                <option value="Non-AC">Non-AC</option>
                <option value="Sleeper">Sleeper</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="input-group">
              <label htmlFor="bus-origin">Origin</label>
              <input id="bus-origin" className="input" placeholder="Departure city"
                value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} required />
            </div>
            <div className="input-group">
              <label htmlFor="bus-dest">Destination</label>
              <input id="bus-dest" className="input" placeholder="Arrival city"
                value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} required />
            </div>
          </div>

          <div className="form-grid-3">
            <div className="input-group">
              <label htmlFor="bus-date">Departure Date</label>
              <input id="bus-date" className="input" type="date"
                value={form.departure_date} onChange={(e) => setForm({ ...form, departure_date: e.target.value })} required />
            </div>
            <div className="input-group">
              <label htmlFor="bus-dep-time">Departure Time</label>
              <input id="bus-dep-time" className="input" type="datetime-local"
                value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} required />
            </div>
            <div className="input-group">
              <label htmlFor="bus-arr-time">Arrival Time</label>
              <input id="bus-arr-time" className="input" type="datetime-local"
                value={form.arrival_time} onChange={(e) => setForm({ ...form, arrival_time: e.target.value })} required />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="input-group">
              <label htmlFor="bus-seats">Total Seats</label>
              <input id="bus-seats" className="input" type="number" min="1" max="100"
                value={form.total_seats} onChange={(e) => setForm({ ...form, total_seats: e.target.value })} required />
            </div>
            <div className="input-group">
              <label htmlFor="bus-price">Price (₹)</label>
              <input id="bus-price" className="input" type="number" min="1" step="0.01" placeholder="e.g. 1200"
                value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
          </div>

          {editBus && (
            <div className="input-group">
              <label htmlFor="bus-status">Status</label>
              <select id="bus-status" className="input" value={form.status || 'Active'}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={saving} style={{ width: '100%', marginTop: 'var(--space-md)' }}>
            {saving ? 'Saving...' : editBus ? 'Update Bus' : 'Create Bus'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
