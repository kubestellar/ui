import { ComponentType, lazy, LazyExoticComponent } from 'react';

/**
 * Creates a lazy-loaded component with prefetching.
 *
 * @param importFn - A function that returns a dynamic import (Promise)
 * @param exportName - Optional name of the export to use (for named exports)
 * @param prefetch - Whether to use webpack prefetch hint
 * @returns A React lazy component
 */
export function lazyImport<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  prefetch = false
): LazyExoticComponent<T> {
  return lazy(() => {
    if (prefetch) {
      // Add prefetch hint using comment
      return importFn();
    }
    return importFn();
  }) as LazyExoticComponent<T>;
}

/**
 * Creates a lazy-loaded component from a named export.
 *
 * @param importFn - A function that returns a dynamic import (Promise)
 * @param exportName - Name of the export to use
 * @param prefetch - Whether to use webpack prefetch hint
 * @returns A React lazy component
 */
export function lazyNamedImport<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ [key: string]: T }>,
  exportName: string,
  prefetch = false
): LazyExoticComponent<T> {
  return lazy(() => {
    if (prefetch) {
      // Add prefetch hint using comment
      return importFn().then(module => ({ default: module[exportName] }));
    }
    return importFn().then(module => ({ default: module[exportName] }));
  }) as LazyExoticComponent<T>;
}

/**
 * Wraps a module with named exports for lazy loading.
 * Creates an object where each key is a lazy-loaded component.
 *
 * @param factory - A function that returns a dynamic import
 * @returns An object with lazy-loaded components
 */
export function lazyModule<T extends { [key: string]: ComponentType<unknown> }>(
  factory: () => Promise<{ [key: string]: unknown }>
): { [K in keyof T]: ComponentType<unknown> } {
  const result: Partial<{ [K in keyof T]: ComponentType<unknown> }> = {};

  const load = factory();

  return new Proxy(result as { [K in keyof T]: ComponentType<unknown> }, {
    get: (target, name: string | symbol) => {
      if (typeof name !== 'string') return undefined;

      if (!(name in target)) {
        (target as Record<string, unknown>)[name] = lazy(() =>
          load.then(module => ({
            default: (module as Record<string, unknown>)[name] as ComponentType<unknown>,
          }))
        );
      }

      return target[name as keyof T];
    },
  });
}
