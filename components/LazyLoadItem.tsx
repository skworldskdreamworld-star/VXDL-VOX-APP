import React, { useState, useRef, useEffect } from 'react';

/**
 * A lightweight component to lazy-load content when it enters the viewport.
 * This improves performance by deferring the rendering of off-screen components.
 */
const LazyLoadItem: React.FC<{ children: React.ReactNode; placeholderHeight?: string }> = ({ children, placeholderHeight = '200px' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const placeholderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the placeholder is intersecting the viewport, show the real component
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Stop observing once it's visible
          observer.unobserve(entry.target);
        }
      },
      {
        // Start loading the component when it's 200px away from the bottom of the viewport
        rootMargin: '0px 0px 200px 0px',
      }
    );

    const currentRef = placeholderRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      // Clean up the observer when the component unmounts
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  // If visible, render the children; otherwise, render a placeholder with a fixed height.
  return isVisible ? <>{children}</> : <div ref={placeholderRef} style={{ height: placeholderHeight }} aria-busy="true" />;
};

export default LazyLoadItem;
