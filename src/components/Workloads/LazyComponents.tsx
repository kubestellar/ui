import { lazy } from 'react';

// Lazily load Workload components
export const LazyUploadFileTab = lazy(() =>
  import('./UploadFileTab').then((module) => ({ default: module.default ?? module }))
);
export const LazyYamlTab = lazy(() =>
  import('./YamlTab').then((module) => ({ default: module.default ?? module }))
);

// Export lazy loaded components as default exports for easier importing
export default {
  UploadFileTab: LazyUploadFileTab,
  YamlTab: LazyYamlTab,
};
