import { PolicyConfiguration } from '../components/BindingPolicy/ConfigurationSidebar';

/**
 * Generates YAML for a binding policy
 * @param config The policy configuration
 * @returns YAML string representation of the binding policy
 */
export const generateBindingPolicyYAML = (config: PolicyConfiguration): string => {
  try {
    const bindingPolicy = {
      apiVersion: 'policy.kubestellar.io/v1alpha1',
      kind: 'BindingPolicy',
      metadata: {
        name: config.name,
        namespace: config.namespace,
        labels: config.customLabels
      },
      spec: {
        deploymentType: config.deploymentType,
        propagationMode: config.propagationMode,
        updateStrategy: config.updateStrategy,
        clusterSelector: {
          matchLabels: {
            ...config.customLabels
          }
        },
        scheduling: config.schedulingRules.length > 0 ? {
          rules: config.schedulingRules.map(rule => ({
            resource: rule.resource,
            operator: rule.operator,
            value: rule.value
          }))
        } : undefined,
        tolerations: config.tolerations.length > 0 ? config.tolerations : undefined
      }
    };
    
    return convertToYAML(bindingPolicy);
  } catch (error) {
    console.error('Error generating YAML:', error);
    return '# Error generating YAML';
  }
};

/**
 * Converts a JavaScript object to YAML string
 * @param obj The object to convert
 * @returns YAML string
 */
const convertToYAML = (obj: Record<string, unknown>): string => {
  // This is a simple conversion. In a real app, you'd use a library like js-yaml
  return JSON.stringify(obj, null, 2)
    .replace(/"([^"]+)":/g, '$1:')       // Remove quotes around property names
    .replace(/"/g, "'")                 // Replace double quotes with single quotes
    .replace(/'/g, '"')                 // Put back quotes for string values
    .replace(/"/g, "'")                 // Convert back to single quotes
    .replace(/true/g, 'true')           // Leave booleans unquoted
    .replace(/false/g, 'false')
    .replace(/null/g, 'null')
    .replace(/undefined/g, 'null');     // Convert undefined to null
}; 