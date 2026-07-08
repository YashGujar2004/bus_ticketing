/**
 * StatusBadge — colored pill badges for booking/bus status.
 */
export default function StatusBadge({ status, size = 'md' }) {
  const statusStyles = {
    Confirmed: { bg: 'var(--success-soft)', color: 'var(--success)', icon: '✓' },
    Active: { bg: 'var(--success-soft)', color: 'var(--success)', icon: '●' },
    Cancelled: { bg: 'var(--danger-soft)', color: 'var(--danger)', icon: '✕' },
    Inactive: { bg: 'var(--text-muted)', color: 'var(--text-secondary)', icon: '○' },
    Maintenance: { bg: 'var(--warning-soft)', color: 'var(--warning)', icon: '⚙' },
    AC: { bg: 'var(--info-soft)', color: 'var(--info)', icon: '❄' },
    'Non-AC': { bg: 'var(--warning-soft)', color: 'var(--warning)', icon: '☀' },
    Sleeper: { bg: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)', icon: '🛏' },
  };

  const style = statusStyles[status] || {
    bg: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    icon: '•',
  };

  const sizeClass = size === 'sm' ? '0.6875rem' : '0.75rem';
  const padding = size === 'sm' ? '2px 8px' : '4px 10px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding,
        borderRadius: 'var(--radius-full)',
        background: style.bg,
        color: style.color,
        fontSize: sizeClass,
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: size === 'sm' ? '0.5rem' : '0.625rem' }}>{style.icon}</span>
      {status}
    </span>
  );
}
