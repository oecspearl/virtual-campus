"use client";

import { useEffect, useRef, useState } from 'react';

interface UseAutoResizeOptions {
  minHeight?: number;
  maxHeight?: number;
  enabled?: boolean;
}

export function useAutoResize(options: UseAutoResizeOptions = {}) {
  const { minHeight = 100, maxHeight = 2000, enabled = true } = options;
  const [height, setHeight] = useState(minHeight);
  const contentRef = useRef<HTMLDivElement>(null);

  const measureContent = () => {
    if (!contentRef.current) return;
    
    // Temporarily remove height constraints to measure full content
    const originalHeight = contentRef.current.style.height;
    const originalMaxHeight = contentRef.current.style.maxHeight;
    
    contentRef.current.style.height = 'auto';
    contentRef.current.style.maxHeight = 'none';
    
    // Use scrollHeight to get the full content height
    const contentHeight = contentRef.current.scrollHeight;
    const newHeight = Math.max(minHeight, Math.min(maxHeight, contentHeight));
    
    // Restore original styles
    contentRef.current.style.height = originalHeight;
    contentRef.current.style.maxHeight = originalMaxHeight;
    
    setHeight(newHeight);
  };

  useEffect(() => {
    if (!enabled || !contentRef.current) return;

    // Initial measurement with a small delay to ensure content is rendered
    const initialMeasure = () => {
      setTimeout(measureContent, 50);
    };
    initialMeasure();

    // Use ResizeObserver for dynamic content changes
    const resizeObserver = new ResizeObserver(() => {
      measureContent();
    });

    resizeObserver.observe(contentRef.current);

    // Also listen for content changes (like images loading)
    const mutationObserver = new MutationObserver(() => {
      setTimeout(measureContent, 10); // Small delay to ensure DOM is updated
    });

    mutationObserver.observe(contentRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });

    // Listen for image load events
    const handleImageLoad = () => {
      setTimeout(measureContent, 100); // Small delay to ensure image is rendered
    };

    const images = contentRef.current.querySelectorAll('img');
    images.forEach(img => {
      img.addEventListener('load', handleImageLoad);
      img.addEventListener('error', handleImageLoad);
    });

    // Also measure on window resize
    const handleWindowResize = () => {
      setTimeout(measureContent, 100);
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      images.forEach(img => {
        img.removeEventListener('load', handleImageLoad);
        img.removeEventListener('error', handleImageLoad);
      });
    };
  }, [minHeight, maxHeight, enabled]);

  return { height, contentRef };
}
