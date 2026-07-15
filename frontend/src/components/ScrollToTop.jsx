import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Reset scroll to the top whenever the route changes — SPAs keep the previous
// page's scroll position by default, which feels broken when navigating.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}
