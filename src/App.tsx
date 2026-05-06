import { useState, useEffect } from 'react';
import AdminPanel from './components/AdminPanel';
import GuestPage from './components/GuestPage';
import CoverDisplay from './components/CoverDisplay';

function App() {
  const [route, setRoute] = useState<{ page: string; eventId?: string }>({ page: 'admin' });

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash.startsWith('guest/')) {
        const eventId = hash.replace('guest/', '');
        setRoute({ page: 'guest', eventId });
      } else if (hash.startsWith('cover/')) {
        const eventId = hash.replace('cover/', '');
        setRoute({ page: 'cover', eventId });
      } else if (hash === 'admin' || hash === '') {
        setRoute({ page: 'admin' });
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  if (route.page === 'guest' && route.eventId) {
    return <GuestPage eventId={route.eventId} />;
  }

  if (route.page === 'cover' && route.eventId) {
    return <CoverDisplay eventId={route.eventId} />;
  }

  return <AdminPanel />;
}

export default App;
