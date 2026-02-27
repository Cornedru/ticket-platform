import { useEffect, useState, useCallback, createContext, useContext } from 'react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [sseConnection, setSseConnection] = useState(null);

  const addNotification = useCallback((notification) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { ...notification, id }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const subscribeToEvent = useCallback((eventId) => {
    if (sseConnection) {
      sseConnection.close();
    }

    const eventSource = new EventSource(`${window.location.origin}/api/v1/notifications/events/${eventId}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        addNotification({
          type: data.type === 'waitlist_available' ? 'success' : 'info',
          title: data.type === 'waitlist_available' ? 'Places disponibles !' : 'Mise à jour',
          message: data.message || 'L\'événement a été mis à jour'
        });
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    setSseConnection(eventSource);
    return () => eventSource.close();
  }, [addNotification, sseConnection]);

  const subscribeToGeneral = useCallback(() => {
    if (sseConnection) {
      sseConnection.close();
    }

    const eventSource = new EventSource(`${window.location.origin}/api/v1/notifications/general`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_event') {
          addNotification({
            type: 'info',
            title: 'Nouvel événement !',
            message: `${data.event.title} est maintenant disponible`
          });
        }
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    setSseConnection(eventSource);
    return () => eventSource.close();
  }, [addNotification, sseConnection]);

  useEffect(() => {
    return () => {
      if (sseConnection) {
        sseConnection.close();
      }
    };
  }, [sseConnection]);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, subscribeToEvent, subscribeToGeneral }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationBanner({ notification }) {
  const bgColors = {
    info: 'var(--psycho-cyan)',
    success: 'var(--acid-green)',
    warning: 'var(--hot-orange)',
    error: 'var(--color-danger)'
  };

  return (
    <div 
      className="notification-toast"
      style={{ background: bgColors[notification.type] || bgColors.info }}
    >
      <div className="notification-content">
        <strong>{notification.title}</strong>
        <p>{notification.message}</p>
      </div>
    </div>
  );
}

export function NotificationContainer({ notifications }) {
  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <NotificationBanner key={notification.id} notification={notification} />
      ))}
    </div>
  );
}
