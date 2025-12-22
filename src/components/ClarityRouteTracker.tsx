import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent, setTag, upgradeSession } from '@/hooks/use-clarity';
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
  const { resetMilestones } = useScrollTracking(true);

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
    resetMilestones();

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
  }, [location, resetMilestones]);

  return null; // This component renders nothing
};

export default ClarityRouteTracker;
