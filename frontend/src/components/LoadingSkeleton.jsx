/**
 * LoadingSkeleton — animated shimmer placeholders for loading states.
 */
export function SkeletonLine({ width = '100%', height = '16px' }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 'var(--radius-sm)',
        background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-card-hover) 50%, var(--bg-tertiary) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <SkeletonLine width="40%" height="20px" />
        <SkeletonLine width="60px" height="24px" />
      </div>
      <SkeletonLine width="70%" />
      <SkeletonLine width="50%" />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-sm)' }}>
        <SkeletonLine width="30%" height="28px" />
        <SkeletonLine width="100px" height="36px" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 'var(--space-md)', padding: 'var(--space-md) 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <SkeletonLine width="15%" />
          <SkeletonLine width="20%" />
          <SkeletonLine width="20%" />
          <SkeletonLine width="15%" />
          <SkeletonLine width="10%" />
          <SkeletonLine width="80px" height="28px" />
        </div>
      ))}
    </div>
  );
}
