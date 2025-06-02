declare global {
  interface Window {
    KubeStellarPlugin:
      | {
          OnboardForm?: React.ComponentType;
          DetachForm?: React.ComponentType;
        }
      | undefined;
  }
}

// Required if the file contains only declarations and no imports/exports
export {};
