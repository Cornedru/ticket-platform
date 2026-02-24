import { useState, useEffect } from 'react';

export function useOfflineTickets() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cachedTickets, setCachedTickets] = useState([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const cached = localStorage.getItem('cachedTickets');
    if (cached) {
      try {
        setCachedTickets(JSON.parse(cached));
      } catch (e) {}
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (cachedTickets.length > 0) {
      localStorage.setItem('cachedTickets', JSON.stringify(cachedTickets));
    }
  }, [cachedTickets]);

  const cacheTickets = (tickets) => {
    setCachedTickets(tickets);
    localStorage.setItem('cachedTickets', JSON.stringify(tickets));
  };

  return { isOnline, cachedTickets, cacheTickets };
}
