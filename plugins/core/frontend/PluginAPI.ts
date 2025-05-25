// PluginAPI.ts
// Defines the manifest format and methods to fetch plugin metadata

export interface PluginManifest {
  name: string;
  displayName: string;
  version: string;
  description?: string;
  entry: string; // URL or path to the bundled JS
  icon?: string; // Optional icon URL
  enabled: boolean;
  permissions?: string[]; // e.g. ['read:workloads']
}

// Fetches the list of plugin manifests from the backend registry API
export async function fetchManifests(): Promise<PluginManifest[]> {
  const res = await fetch('/api/plugins/frontend');
  if (!res.ok) {
    throw new Error(`Failed to fetch plugin manifests: ${res.statusText}`);
  }
  const data: PluginManifest[] = await res.json();
  return data.filter(p => p.enabled);
}

// Optionally, call backend to enable/disable a plugin
export async function setPluginEnabled(name: string, enable: boolean): Promise<void> {
  const res = await fetch(`/api/plugins/${encodeURIComponent(name)}/enable`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enable }),
  });
  if (!res.ok) {
    throw new Error(`Failed to ${enable ? 'enable' : 'disable'} plugin ${name}`);
  }
}
