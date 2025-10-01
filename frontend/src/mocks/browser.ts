import { setupWorker } from 'msw/browser';
import * as h from './handlers';

export const worker = setupWorker(...h.defaultHandlers);

export const scenarios: Record<string, any[]> = {
  default: h.defaultHandlers,
  statusReady: [h.statusReady],
  statusNotReady: [h.statusNotReady],
  login: [h.login],
};

export function applyScenarioByName(name: string) {
  const s = (scenarios as any)[name];
  if (Array.isArray(s) && s.length) {
    // @ts-ignore - msw/browser worker accepts handler functions
    worker.use(...s);
    // eslint-disable-next-line no-console
    console.log('[MSW] applied scenario:', name);
  } else {
    // eslint-disable-next-line no-console
    console.warn('[MSW] scenario not found or empty:', name);
  }
}

if (typeof window !== 'undefined') {
  (window as any).__msw = {
    worker,
    scenarios,
    applyScenarioByName,
  };
}
