export function EventCardSkeleton() {
  return (
    <div className="event-card-skeleton">
      <div className="skeleton skeleton-image" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text short" />
    </div>
  );
}

export function OrderSkeleton() {
  return (
    <div className="order-card-skeleton">
      <div className="skeleton" style={{ width: '60%', height: '20px' }} />
      <div className="skeleton" style={{ width: '40%', height: '14px', marginTop: '8px' }} />
      <div className="skeleton" style={{ width: '30%', height: '14px', marginTop: '4px' }} />
    </div>
  );
}

export function TicketSkeleton() {
  return (
    <div className="ticket-item-skeleton">
      <div className="skeleton" style={{ width: '80px', height: '80px' }} />
      <div className="ticket-skeleton-info">
        <div className="skeleton" style={{ width: '60%', height: '16px' }} />
        <div className="skeleton" style={{ width: '40%', height: '12px', marginTop: '8px' }} />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="table-skeleton">
      <div className="table-header-skeleton">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton" style={{ flex: 1, height: '16px' }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="table-row-skeleton">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div key={colIndex} className="skeleton" style={{ flex: 1, height: '40px' }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = '✦', title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon-wrapper">
        <span className="empty-icon">{icon}</span>
      </div>
      <h3 className="empty-title">{title}</h3>
      {message && <p className="empty-message">{message}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export function LoadingOverlay({ message = 'Chargement...' }) {
  return (
    <div className="loading-overlay">
      <div className="loading-spinner-large" />
      <p>{message}</p>
    </div>
  );
}
