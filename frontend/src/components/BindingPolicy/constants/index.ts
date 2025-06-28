// Default YAML template for creating a new binding policy
export const DEFAULT_BINDING_POLICY_TEMPLATE = `apiVersion: control.kubestellar.io/v1alpha1
kind: BindingPolicy
metadata:
  name: example-binding-policy
  namespace: default
spec:
  clusterSelectors:
    - matchLabels:
        kubernetes.io/cluster-name: cluster1
    - matchLabels:
        kubernetes.io/cluster-name: cluster2
  downsync:
    - apiGroup: "apps"
      resources: ["Deployment"]
      namespaces: ["default"]`;
