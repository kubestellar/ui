import { lazy } from 'react';

// Lazily load Binding Policy components
export const LazyPolicyDragDrop = lazy(() => import('./PolicyDragDrop'));
export const LazyCreateBindingPolicyDialog = lazy(() => import('./CreateBindingPolicyDialog'));
export const LazyQuickPolicyDialog = lazy(() => import('./QuickPolicyDialog'));
export const LazyPolicyDragDropContainer = lazy(() => import('./PolicyDragDropContainer'));
export const LazyPreviewDialog = lazy(() => import('./PreviewDialog'));

// Export lazy loaded components as default exports for easier importing
export default {
  PolicyDragDrop: LazyPolicyDragDrop,
  CreateBindingPolicyDialog: LazyCreateBindingPolicyDialog,
  QuickPolicyDialog: LazyQuickPolicyDialog,
  PolicyDragDropContainer: LazyPolicyDragDropContainer,
  PreviewDialog: LazyPreviewDialog,
};
