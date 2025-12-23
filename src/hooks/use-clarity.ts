/**
 * Centralized Microsoft Clarity hook with type safety and null checks.
 * Wraps the Clarity API for consistent usage across the app.
 */

type ClarityMethod = 
  | 'event'
  | 'set'
  | 'upgrade'
  | 'identify'
  | 'consent'
  | 'metadata';

declare global {
  interface Window {
    clarity?: (method: ClarityMethod, ...args: string[]) => void;
  }
}

/**
 * Check if we're on a production host (not Lovable preview or localhost)
 */
const isProductionHost = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  
  // Block all Lovable preview environments
  if (hostname.includes('lovable.app')) return false;
  
  // Block localhost and local IPs
  if (hostname === 'localhost' || hostname === '127.0.0.1') return false;
  
  return true;
};

const isClarityReady = (): boolean => {
  return isProductionHost() && typeof window.clarity === 'function';
};

/**
 * Track a custom event in Clarity
 * Shows in filters and timeline
 */
export const trackEvent = (eventName: string): void => {
  if (!isClarityReady()) {
    console.debug('[Clarity] Not ready, skipping event:', eventName);
    return;
  }
  window.clarity!('event', eventName);
  console.debug('[Clarity] Event tracked:', eventName);
};

/**
 * Add a custom tag to the session
 * Great for filtering sessions by attributes
 */
export const setTag = (key: string, value: string): void => {
  if (!isClarityReady()) {
    console.debug('[Clarity] Not ready, skipping tag:', key, value);
    return;
  }
  window.clarity!('set', key, value);
  console.debug('[Clarity] Tag set:', key, '=', value);
};

/**
 * Force this session to be recorded (bypasses sampling)
 * Use for high-value pages like case studies, pricing, checkout
 */
export const upgradeSession = (reason: string): void => {
  if (!isClarityReady()) {
    console.debug('[Clarity] Not ready, skipping upgrade:', reason);
    return;
  }
  window.clarity!('upgrade', reason);
  console.debug('[Clarity] Session upgraded:', reason);
};

/**
 * Associate session with a user ID
 * Useful for identifying logged-in users
 */
export const identify = (userId: string, sessionId?: string, pageId?: string): void => {
  if (!isClarityReady()) {
    console.debug('[Clarity] Not ready, skipping identify:', userId);
    return;
  }
  const args = [userId];
  if (sessionId) args.push(sessionId);
  if (pageId) args.push(pageId);
  window.clarity!('identify', ...args);
  console.debug('[Clarity] User identified:', userId);
};

/**
 * Hook for using Clarity in React components
 */
export const useClarity = () => {
  return {
    trackEvent,
    setTag,
    upgradeSession,
    identify,
    isReady: isClarityReady,
  };
};

export default useClarity;
