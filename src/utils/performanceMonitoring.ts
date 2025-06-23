/**
 * Performance monitoring utilities for KubeStellar UI
 * Used to track and report performance metrics
 */

interface PerformanceMetrics {
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  timeToInteractive?: number;
  totalBlockingTime?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
  loadTime?: number;
  resourceLoadTimes: Record<string, number>;
}

// Store performance metrics
const metrics: PerformanceMetrics = {
  resourceLoadTimes: {},
};

/**
 * Measure and report initial page load performance
 */
export function measureInitialPageLoad(): void {
  // Record basic load timing
  if ('performance' in window) {
    const navigationTiming = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;

    if (navigationTiming) {
      metrics.loadTime = navigationTiming.loadEventEnd - navigationTiming.startTime;

      // Log metrics to console in development mode
      if (import.meta.env.DEV) {
        console.log(`📊 Page loaded in ${metrics.loadTime.toFixed(1)}ms`);
      }
    }

    // Set up observer for Largest Contentful Paint
    const lcpObserver = new PerformanceObserver(entryList => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      metrics.largestContentfulPaint = lastEntry.startTime;

      if (import.meta.env.DEV) {
        console.log(`📊 Largest Contentful Paint: ${metrics.largestContentfulPaint.toFixed(1)}ms`);
      }
    });

    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // Set up observer for First Input Delay
    const fidObserver = new PerformanceObserver(entryList => {
      const firstInput = entryList.getEntries()[0];
      const inputDelay =
        (firstInput as PerformanceEventTiming).processingStart - firstInput.startTime;
      metrics.firstInputDelay = inputDelay;

      if (import.meta.env.DEV) {
        console.log(`📊 First Input Delay: ${metrics.firstInputDelay.toFixed(1)}ms`);
      }
    });

    fidObserver.observe({ type: 'first-input', buffered: true });

    // Set up observer for Layout Shifts
    let cumulativeLayoutShiftScore = 0;
    const clsObserver = new PerformanceObserver(entryList => {
      for (const entry of entryList.getEntries()) {
        // Only count layout shifts without recent user input
        if (!(entry as LayoutShift).hadRecentInput) {
          cumulativeLayoutShiftScore += (entry as LayoutShift).value;
          metrics.cumulativeLayoutShift = cumulativeLayoutShiftScore;

          if (import.meta.env.DEV && metrics.cumulativeLayoutShift > 0.1) {
            console.log(`⚠️ Cumulative Layout Shift: ${metrics.cumulativeLayoutShift.toFixed(3)}`);
          }
        }
      }
    });

    clsObserver.observe({ type: 'layout-shift', buffered: true });
  }
}

/**
 * Record JavaScript chunk load timing
 */
export function recordChunkLoadTiming(): void {
  if ('performance' in window) {
    // Monitor script loading performance
    const resourceObserver = new PerformanceObserver(entryList => {
      const entries = entryList
        .getEntries()
        .filter(
          entry =>
            (entry as PerformanceResourceTiming).initiatorType === 'script' &&
            (entry.name.includes('.js') || entry.name.includes('.chunk'))
        );

      for (const entry of entries) {
        const resourceName = entry.name.split('/').pop() || entry.name;
        metrics.resourceLoadTimes[resourceName] = entry.duration;

        // Log slow chunks in development
        if (import.meta.env.DEV && entry.duration > 300) {
          console.warn(`⚠️ Slow resource load: ${resourceName} - ${entry.duration.toFixed(1)}ms`);
        }
      }
    });

    resourceObserver.observe({ type: 'resource', buffered: true });
  }
}

/**
 * Mark the start of a performance measurement
 */
export function markStart(id: string): void {
  if ('performance' in window && 'mark' in performance) {
    performance.mark(`${id}_start`);
  }
}

/**
 * Mark the end of a performance measurement and log the duration
 */
export function markEnd(id: string): void {
  if ('performance' in window && 'mark' in performance && 'measure' in performance) {
    performance.mark(`${id}_end`);
    performance.measure(id, `${id}_start`, `${id}_end`);

    const measurements = performance.getEntriesByName(id);
    if (measurements.length > 0 && import.meta.env.DEV) {
      console.log(`📏 ${id}: ${measurements[0].duration.toFixed(1)}ms`);
    }
  }
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  return { ...metrics };
}

/**
 * Send metrics to analytics service
 * This is just a placeholder - implement with your analytics provider
 */
export function reportMetricsToAnalytics(): void {
  // In a real app, you'd send metrics to your analytics service
  // Example: analyticsProvider.trackMetrics(metrics);

  if (import.meta.env.DEV) {
    console.log('📊 Performance metrics:', metrics);
  }
}
