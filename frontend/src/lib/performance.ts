/**
 * Performance Optimization Utilities for JoyEvents
 * Helps with lazy loading, prefetching, and resource management
 */

// Prefetch a page when user is likely to navigate to it
export const prefetchPage = (importFn: () => Promise<any>) => {
  // Only prefetch in production
  if (import.meta.env.PROD) {
    setTimeout(() => {
      importFn();
    }, 1000); // Wait 1 second after initial load
  }
};

// Debounce function for performance
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for scroll/resize events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Lazy load image with intersection observer
export const createLazyImageObserver = (): IntersectionObserver => {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      }
    });
  });

  return imageObserver;
};

// Preload critical resources
export const preloadResource = (href: string, as: string = 'script') => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  document.head.appendChild(link);
};

// Prefetch DNS for external APIs
export const prefetchDNS = (hostname: string) => {
  const link = document.createElement('link');
  link.rel = 'dns-prefetch';
  link.href = hostname;
  document.head.appendChild(link);
};

// Preconnect to external domains
export const preconnect = (href: string, crossorigin: boolean = true) => {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = href;
  if (crossorigin) {
    link.crossOrigin = '';
  }
  document.head.appendChild(link);
};

// Measure page load performance
export const measurePerformance = () => {
  if (typeof window !== 'undefined' && window.performance) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (perfData) {
          const pageLoadTime = perfData.loadEventEnd - perfData.startTime;
          const domReadyTime = perfData.domContentLoadedEventEnd - perfData.startTime;
          
          console.log(`⚡ JoyEvents Performance:`);
          console.log(`  DOM Ready: ${Math.round(domReadyTime)}ms`);
          console.log(`  Page Loaded: ${Math.round(pageLoadTime)}ms`);
          
          // Store in localStorage for analytics
          localStorage.setItem('joyevents_pageLoadTime', String(Math.round(pageLoadTime)));
        }
      }, 0);
    });
  }
};

// Optimize images on load
export const optimizeImages = () => {
  if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      const images = document.querySelectorAll('img');
      images.forEach((img) => {
        // Add lazy loading to images without it
        if (!img.getAttribute('loading')) {
          img.setAttribute('loading', 'lazy');
        }
        
        // Add decoding async
        if (!img.getAttribute('decoding')) {
          img.setAttribute('decoding', 'async');
        }
      });
    });
  }
};

// Clear cache and reload (useful for updates)
export const clearCacheAndReload = () => {
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
  window.location.reload();
};

export default {
  prefetchPage,
  debounce,
  throttle,
  createLazyImageObserver,
  preloadResource,
  prefetchDNS,
  preconnect,
  measurePerformance,
  optimizeImages,
  clearCacheAndReload,
};
