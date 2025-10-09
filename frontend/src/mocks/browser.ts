import { setupWorker } from 'msw/browser';
import * as h from './handlers';

import type { HttpHandler } from 'msw';

export const worker = setupWorker(...h.defaultHandlers);

export const scenarios: Record<string, HttpHandler[]> = {
  default: h.defaultHandlers,
  statusReady: [h.statusReady],
  statusNotReady: [h.statusNotReady],
  login: [h.login],
};

export function applyScenarioByName(name: string) {
  const s = scenarios[name];
  if (Array.isArray(s) && s.length) {
    worker.use(...s);
    // eslint-disable-next-line no-console
    console.log('[MSW] applied scenario:', name);
  } else {
    // eslint-disable-next-line no-console
    console.warn('[MSW] scenario not found or empty:', name);
  }
}

declare global {
  interface Window {
    __msw?: {
      applyScenarioByName: typeof applyScenarioByName;
      scenarios: typeof scenarios;
      worker: typeof worker;
    };
  }
}

if (typeof window !== 'undefined') {
  window.__msw = {
    worker,
    scenarios,
    applyScenarioByName,
  };
}
