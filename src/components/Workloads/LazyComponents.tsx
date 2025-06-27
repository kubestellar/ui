import { lazy } from 'react';

export const LazyUploadFileTab = lazy(() =>
  import('./UploadFileTab').then(module => ({ default: (module as unknown as { default: React.ComponentType<unknown> }).default ?? module }))
);
export const LazyYamlTab = lazy(() =>
  import('./YamlTab').then(module => ({ default: (module as unknown as { default: React.ComponentType<unknown> }).default ?? module }))
);

export default {
  UploadFileTab: LazyUploadFileTab,
  YamlTab: LazyYamlTab,
};
