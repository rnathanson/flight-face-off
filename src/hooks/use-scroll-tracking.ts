import { useEffect, useRef } from 'react';
import { trackEvent, setTag } from './use-clarity';

interface ScrollMilestones {
  25: boolean;
  50: boolean;
  75: boolean;
  100: boolean;
}

/**
 * Hook to track scroll depth milestones (25%, 50%, 75%, 100%)
 * Fires events and sets max_scroll_depth tag
 */
export const useScrollTracking = (enabled: boolean = true) => {
  const milestonesRef = useRef<ScrollMilestones>({
    25: false,
    50: false,
    75: false,
    100: false,
  });

  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      if (docHeight <= 0) return;
      
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);
      const milestones = milestonesRef.current;

      // Check each milestone
      if (scrollPercent >= 25 && !milestones[25]) {
        milestones[25] = true;
        trackEvent('scroll_25');
        setTag('max_scroll_depth', '25');
      }
      
      if (scrollPercent >= 50 && !milestones[50]) {
        milestones[50] = true;
        trackEvent('scroll_50');
        setTag('max_scroll_depth', '50');
      }
      
      if (scrollPercent >= 75 && !milestones[75]) {
        milestones[75] = true;
        trackEvent('scroll_75');
        setTag('max_scroll_depth', '75');
      }
      
      if (scrollPercent >= 100 && !milestones[100]) {
        milestones[100] = true;
        trackEvent('scroll_100');
        setTag('max_scroll_depth', '100');
      }
    };

    // Throttle scroll handler
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', throttledScroll);
    };
  }, [enabled]);

  // Reset milestones (useful for SPA navigation)
  const resetMilestones = () => {
    milestonesRef.current = {
      25: false,
      50: false,
      75: false,
      100: false,
    };
  };

  return { resetMilestones };
};

export default useScrollTracking;
