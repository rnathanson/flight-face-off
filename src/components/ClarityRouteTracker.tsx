import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent, setTag, upgradeSession, identify } from '@/hooks/use-clarity';
import { useScrollTracking } from '@/hooks/use-scroll-tracking';

/**
 * Route name mapping for clean event names
 */
const getRouteName = (pathname: string): string => {
  if (pathname === '/') return 'home';
  if (pathname === '/ai-platform') return 'ai_platform';
  if (pathname === '/admin-login') return 'admin_login';
  if (pathname === '/admin') return 'admin_dashboard';
  if (pathname === '/admin/estimates') return 'admin_estimates';
  if (pathname.startsWith('/estimate/')) return 'customer_estimate';
  return pathname.replace(/\//g, '_').replace(/^_/, '') || 'unknown';
};

/**
 * Check if route should be upgraded (high-value pages)
 */
const shouldUpgradeSession = (pathname: string): string | null => {
  if (pathname === '/ai-platform') return 'ai_platform_demo';
  if (pathname.startsWith('/estimate/')) return 'customer_estimate_view';
  if (pathname.startsWith('/admin')) return 'admin_activity';
  return null;
};

/**
 * Component that tracks SPA route changes for Clarity
 * Place inside BrowserRouter to capture all navigation
 */
export const ClarityRouteTracker = () => {
  const location = useLocation();
  const previousPathRef = useRef<string>('');
  const adminCheckedRef = useRef<boolean>(false);
  const { resetMilestones } = useScrollTracking(true);

  // Memoize reset to prevent dependency issues
  const handleResetMilestones = useCallback(() => {
    resetMilestones();
  }, [resetMilestones]);

  // Check and tag admin sessions on mount
  useEffect(() => {
    if (adminCheckedRef.current) return;
    adminCheckedRef.current = true;
    
    const adminToken = localStorage.getItem('admin_session');
    if (adminToken) {
      // Tag this as an admin session
      identify('admin');
      setTag('user_type', 'admin');
      setTag('session_type', 'admin');
    } else {
      setTag('user_type', 'visitor');
      setTag('session_type', 'visitor');
    }
  }, []);

  useEffect(() => {
    const { pathname } = location;
    
    // Skip if same route (prevents duplicate events on initial load)
    if (pathname === previousPathRef.current) return;
    previousPathRef.current = pathname;

    const routeName = getRouteName(pathname);
    
    // Track pageview event
    trackEvent(`pageview_${routeName}`);
    
    // Set current page tag for filtering
    setTag('current_page', routeName);
    
    // Reset scroll tracking for new page
    handleResetMilestones();

    // Upgrade session for high-value pages
    const upgradeReason = shouldUpgradeSession(pathname);
    if (upgradeReason) {
      upgradeSession(upgradeReason);
    }

    // Extract and set additional context for dynamic routes
    if (pathname.startsWith('/estimate/')) {
      const slug = pathname.split('/estimate/')[1];
      if (slug) {
        setTag('estimate_slug', slug);
        trackEvent('estimate_viewed');
      }
    }
  }, [location, handleResetMilestones]);

  return null; // This component renders nothing
};

export default ClarityRouteTracker;
