import { useEffect, useRef, useCallback } from 'react';
import { trackEvent, setTag } from './use-clarity';

interface UseSectionVisibilityOptions {
  /** Delay before firing Clarity event (allows animations to complete) */
  animationDelay?: number;
  /** Intersection threshold (0-1) */
  threshold?: number;
  /** Root margin for intersection observer */
  rootMargin?: string;
}

/**
 * Hook to track section visibility with animation-aware delay.
 * Fires Clarity events after animations complete to ensure clean DOM snapshots.
 * 
 * Usage:
 * const { ref } = useSectionVisibility('hero_section');
 * <section ref={ref}>...</section>
 */
export const useSectionVisibility = (
  sectionName: string,
  options: UseSectionVisibilityOptions = {}
) => {
  const {
    animationDelay = 700, // Default 700ms for animations to complete
    threshold = 0.3,
    rootMargin = '0px',
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedRef.current) {
            // Wait for animation to complete before firing Clarity event
            setTimeout(() => {
              if (!hasTrackedRef.current) {
                hasTrackedRef.current = true;
                trackEvent(`section_visible_${sectionName}`);
                setTag('last_visible_section', sectionName);
              }
            }, animationDelay);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [sectionName, animationDelay, threshold, rootMargin]);

  // Reset tracking (useful for SPA navigation)
  const resetTracking = useCallback(() => {
    hasTrackedRef.current = false;
  }, []);

  return { ref, resetTracking };
};

/**
 * Hook to track multiple sections at once.
 * Returns a function to get ref for each section name.
 */
export const useSectionVisibilityMultiple = (
  sectionNames: string[],
  options: UseSectionVisibilityOptions = {}
) => {
  const {
    animationDelay = 700,
    threshold = 0.3,
    rootMargin = '0px',
  } = options;

  const refsMap = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const trackedSections = useRef<Set<string>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionName = entry.target.getAttribute('data-section-name');
          if (sectionName && entry.isIntersecting && !trackedSections.current.has(sectionName)) {
            // Wait for animation to complete
            setTimeout(() => {
              if (!trackedSections.current.has(sectionName)) {
                trackedSections.current.add(sectionName);
                trackEvent(`section_visible_${sectionName}`);
                setTag('last_visible_section', sectionName);
              }
            }, animationDelay);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    // Observe all registered elements
    refsMap.current.forEach((element) => {
      if (element) observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [sectionNames, animationDelay, threshold, rootMargin]);

  const getRef = useCallback((sectionName: string) => {
    return (element: HTMLDivElement | null) => {
      refsMap.current.set(sectionName, element);
      if (element) {
        element.setAttribute('data-section-name', sectionName);
      }
    };
  }, []);

  const resetTracking = useCallback(() => {
    trackedSections.current.clear();
  }, []);

  return { getRef, resetTracking };
};

export default useSectionVisibility;
