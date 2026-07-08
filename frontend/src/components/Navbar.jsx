/**
 * Navbar — top navigation with glassmorphism, role-aware links, and user menu.
 */
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar" id="main-navbar">
      <div className="container navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-logo" id="navbar-logo">
          <span className="logo-icon">🚌</span>
          <span className="logo-text">
            Bus<span className="text-gradient">Ticket</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Link
            to="/"
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
            id="nav-search"
            onClick={() => setMenuOpen(false)}
          >
            🔍 Search
          </Link>

          {isAuthenticated && !isAdmin && (
            <Link
              to="/my-bookings"
              className={`nav-link ${isActive('/my-bookings') ? 'active' : ''}`}
              id="nav-my-bookings"
              onClick={() => setMenuOpen(false)}
            >
              🎫 My Bookings
            </Link>
          )}

          {isAdmin && (
            <>
              <Link
                to="/admin/dashboard"
                className={`nav-link ${isActive('/admin/dashboard') ? 'active' : ''}`}
                id="nav-admin-dashboard"
                onClick={() => setMenuOpen(false)}
              >
                📊 Dashboard
              </Link>
              <Link
                to="/admin/buses"
                className={`nav-link ${isActive('/admin/buses') ? 'active' : ''}`}
                id="nav-admin-buses"
                onClick={() => setMenuOpen(false)}
              >
                🚌 Manage Buses
              </Link>
            </>
          )}
        </div>

        {/* User Actions */}
        <div className="navbar-actions">
          {isAuthenticated ? (
            <div className="user-menu">
              <button
                className="user-trigger"
                onClick={() => setMenuOpen(!menuOpen)}
                id="user-menu-trigger"
              >
                <span className="user-avatar">
                  {user?.username?.[0]?.toUpperCase() || '?'}
                </span>
                <span className="user-name">{user?.username}</span>
                <span className={`user-role-badge ${isAdmin ? 'admin' : 'customer'}`}>
                  {isAdmin ? 'Admin' : 'Customer'}
                </span>
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout} id="logout-btn">
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-ghost btn-sm" id="nav-login">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm" id="nav-register">
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="mobile-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
  );
}
