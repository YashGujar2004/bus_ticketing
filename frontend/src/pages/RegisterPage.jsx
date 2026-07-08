/**
 * RegisterPage — new account creation with role selection.
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import './AuthPage.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '', email: '', password: '', role: 'customer'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await register(form.username, form.email, form.password, form.role);
      toast.success(`Account created! Welcome, ${data.user.username}!`);
      navigate(data.user.role === 'admin' ? '/admin/dashboard' : '/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass-card">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p className="text-secondary">Join BusTicket and start booking</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="reg-username">Username</label>
            <input id="reg-username" className="input" type="text" placeholder="Choose a username"
              value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
              required minLength={3} />
          </div>
          <div className="input-group">
            <label htmlFor="reg-email">Email</label>
            <input id="reg-email" className="input" type="email" placeholder="your@email.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              required />
          </div>
          <div className="input-group">
            <label htmlFor="reg-password">Password</label>
            <input id="reg-password" className="input" type="password" placeholder="Min 6 characters"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              required minLength={6} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} id="register-submit">
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <div className="auth-footer">
          <span className="text-secondary">Already have an account?</span>{' '}
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
