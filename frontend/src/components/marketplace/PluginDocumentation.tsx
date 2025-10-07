import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  HiOutlineDocumentText,
  HiOutlineClipboardDocument,
  HiOutlineRocketLaunch,
  HiOutlineQuestionMarkCircle,
  HiChevronRight,
  HiCodeBracket,
  HiOutlineWrenchScrewdriver,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineInformationCircle,
  HiOutlineLightBulb,
  HiOutlineAcademicCap,
  HiOutlineClipboard,
} from 'react-icons/hi2';
import useTheme from '../../stores/themeStore';
import getThemeStyles from '../../lib/theme-utils';

interface PluginData {
  id: number;
  name: string;
  version: string;
  description: string;
  author: string;
  category?: string;
}

interface PluginDocumentationProps {
  plugin: PluginData;
}

interface FAQItem {
  question: string;
  answer: string;
  category: 'installation' | 'configuration' | 'usage' | 'troubleshooting';
}

interface CodeExample {
  title: string;
  description: string;
  code: string;
  language: string;
}

interface TutorialStep {
  title: string;
  description: string;
  code?: string;
  warning?: string;
  tip?: string;
}

export const PluginDocumentation: React.FC<PluginDocumentationProps> = ({ plugin }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);

  const [activeSection, setActiveSection] = useState<
    'overview' | 'installation' | 'api' | 'examples' | 'tutorials' | 'faq' | 'troubleshooting'
  >('overview');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Sample data - in real implementation, this would come from the plugin's documentation
  const codeExamples: CodeExample[] = [
    {
      title: 'Basic Plugin Initialization',
      description: 'Initialize the plugin with default configuration',
      language: 'javascript',
      code: `import { ${plugin.name}Plugin } from '@kubestellar/plugins';

const plugin = new ${plugin.name}Plugin({
  apiEndpoint: 'https://your-kubestellar-instance.com/api',
  credentials: {
    token: 'your-auth-token'
  },
  options: {
    enableMetrics: true,
    logLevel: 'info'
  }
});

// Initialize the plugin
await plugin.initialize();`,
    },
    {
      title: 'Configuration Example',
      description: 'Advanced configuration options for the plugin',
      language: 'yaml',
      code: `# kubestellar-plugin-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${plugin.name.toLowerCase()}-config
  namespace: kubestellar-system
data:
  config.yaml: |
    plugin:
      name: "${plugin.name}"
      version: "${plugin.version}"
      settings:
        enableAdvancedFeatures: true
        cacheTimeout: 300s
        retryAttempts: 3
        monitoring:
          enabled: true
          metricsPort: 8080
        security:
          enforceSSL: true
          allowedOrigins:
            - "https://trusted-domain.com"
            - "https://another-domain.com"`,
    },
    {
      title: 'API Usage',
      description: 'Common API calls and their responses',
      language: 'javascript',
      code: `// Get plugin status
const status = await plugin.getStatus();
console.log('Plugin Status:', status);

// Execute plugin action
const result = await plugin.execute({
  action: 'deploy',
  target: 'production',
  options: {
    replicas: 3,
    resources: {
      cpu: '500m',
      memory: '512Mi'
    }
  }
});

// Handle the response
if (result.success) {
  console.log('Action completed successfully:', result.data);
} else {
  console.error('Action failed:', result.error);
}`,
    },
  ];

  const tutorialSteps: TutorialStep[] = [
    {
      title: 'Prerequisites Check',
      description: 'Ensure your KubeStellar environment meets the requirements',
      code: `kubectl version --client
kubectl cluster-info
kubectl get nodes`,
      warning: 'Make sure you have kubectl configured and access to your KubeStellar cluster',
    },
    {
      title: 'Install the Plugin',
      description: 'Download and install the plugin using the marketplace',
      tip: 'You can also install via CLI using the KubeStellar CLI tool',
    },
    {
      title: 'Verify Installation',
      description: 'Check that the plugin is properly installed and running',
      code: `kubectl get pods -n kubestellar-system | grep ${plugin.name.toLowerCase()}
kubectl logs -n kubestellar-system deployment/${plugin.name.toLowerCase()}`,
    },
    {
      title: 'Initial Configuration',
      description: 'Set up basic configuration for your environment',
      code: `kubectl apply -f plugin-config.yaml
kubectl get configmap ${plugin.name.toLowerCase()}-config -n kubestellar-system`,
      tip: 'Start with minimal configuration and add features as needed',
    },
    {
      title: 'Test the Plugin',
      description: 'Run a simple test to ensure everything is working',
      code: `# Test plugin connectivity
curl -X GET "https://your-kubestellar-instance.com/api/plugins/${plugin.name.toLowerCase()}/health"

# Expected response:
# {"status": "healthy", "version": "${plugin.version}"}`,
    },
  ];

  const faqItems: FAQItem[] = [
    {
      category: 'installation',
      question: 'How do I update this plugin to the latest version?',
      answer:
        'You can update the plugin through the marketplace by clicking the update button when a new version is available. Alternatively, use the KubeStellar CLI: `kubestellar plugin update ${plugin.name.toLowerCase()}`',
    },
    {
      category: 'installation',
      question: 'What are the minimum system requirements?',
      answer:
        'This plugin requires KubeStellar v1.0.0 or higher, Kubernetes 1.19+, and at least 512MB of available memory. For production deployments, we recommend 1GB RAM and 2 CPU cores.',
    },
    {
      category: 'configuration',
      question: 'How do I configure custom settings?',
      answer:
        'Create a ConfigMap in the kubestellar-system namespace with your custom settings. The plugin will automatically detect and apply configuration changes.',
    },
    {
      category: 'configuration',
      question: 'Can I use this plugin with other KubeStellar plugins?',
      answer:
        'Yes, this plugin is designed to work alongside other KubeStellar plugins. Check the compatibility matrix in the plugin details for specific version requirements.',
    },
    {
      category: 'usage',
      question: 'How do I monitor plugin performance?',
      answer:
        'The plugin exposes metrics on port 8080 by default. You can integrate with Prometheus or use the built-in KubeStellar monitoring dashboard to track performance.',
    },
    {
      category: 'usage',
      question: 'What APIs are available?',
      answer:
        'The plugin provides REST APIs for management, GraphQL for complex queries, and WebSocket connections for real-time updates. See the API documentation section for details.',
    },
    {
      category: 'troubleshooting',
      question: 'The plugin is not starting correctly. What should I check?',
      answer:
        'First, check the plugin logs using `kubectl logs`. Common issues include insufficient permissions, network connectivity problems, or configuration errors. Ensure all dependencies are installed and running.',
    },
    {
      category: 'troubleshooting',
      question: 'How do I enable debug logging?',
      answer:
        'Set the LOG_LEVEL environment variable to "debug" in the plugin deployment, or update the logLevel setting in your ConfigMap to "debug".',
    },
  ];

  const copyToClipboard = async (text: string, identifier: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(identifier);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const sections = [
    { id: 'overview', label: t('marketplace.documentation.overview'), icon: HiOutlineDocumentText },
    {
      id: 'installation',
      label: t('marketplace.documentation.installation'),
      icon: HiOutlineRocketLaunch,
    },
    {
      id: 'api',
      label: t('marketplace.documentation.apiReference'),
      icon: HiOutlineClipboardDocument,
    },
    { id: 'examples', label: t('marketplace.documentation.codeExamples'), icon: HiCodeBracket },
    {
      id: 'tutorials',
      label: t('marketplace.documentation.tutorials'),
      icon: HiOutlineAcademicCap,
    },
    { id: 'faq', label: t('marketplace.documentation.faq'), icon: HiOutlineQuestionMarkCircle },
    {
      id: 'troubleshooting',
      label: t('marketplace.documentation.troubleshooting'),
      icon: HiOutlineWrenchScrewdriver,
    },
  ] as const;

  const renderCodeBlock = (example: CodeExample, index: number) => (
    <motion.div
      key={index}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="overflow-hidden rounded-xl"
      style={{
        background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.7)',
        border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: isDark ? 'rgba(17, 24, 39, 0.6)' : 'rgba(243, 244, 246, 0.8)',
          borderBottom: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
        }}
      >
        <div>
          <h4 className="font-medium" style={{ color: themeStyles.colors.text.primary }}>
            {example.title}
          </h4>
          <p className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
            {example.description}
          </p>
        </div>
        <motion.button
          onClick={() => copyToClipboard(example.code, `code-${index}`)}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            background: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
            color: themeStyles.colors.brand.primary,
            border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`,
          }}
        >
          <HiOutlineClipboard className="h-3 w-3" />
          {copiedCode === `code-${index}`
            ? t('marketplace.documentation.copied')
            : t('marketplace.documentation.copy')}
        </motion.button>
      </div>
      <div className="p-4">
        <pre
          className="overflow-x-auto text-sm"
          style={{
            background: isDark ? '#1e293b' : '#1f2937',
            color: isDark ? '#d1d5db' : '#f3f4f6',
            padding: '1rem',
            borderRadius: '0.5rem',
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          }}
        >
          <code>{example.code}</code>
        </pre>
      </div>
    </motion.div>
  );

  return (
    <div className="flex h-full">
      {/* Sidebar Navigation */}
      <div className="w-64 flex-shrink-0 pr-6">
        <div className="sticky top-0">
          <h3
            className="mb-4 text-lg font-semibold"
            style={{ color: themeStyles.colors.text.primary }}
          >
            {t('marketplace.documentation.title')}
          </h3>
          <nav className="space-y-1">
            {sections.map(section => {
              const Icon = section.icon;
              return (
                <motion.button
                  key={section.id}
                  onClick={() =>
                    setActiveSection(
                      section.id as
                        | 'overview'
                        | 'installation'
                        | 'api'
                        | 'examples'
                        | 'tutorials'
                        | 'faq'
                        | 'troubleshooting'
                    )
                  }
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    background:
                      activeSection === section.id
                        ? isDark
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'rgba(59, 130, 246, 0.1)'
                        : 'transparent',
                    color:
                      activeSection === section.id
                        ? themeStyles.colors.brand.primary
                        : themeStyles.colors.text.secondary,
                    border:
                      activeSection === section.id
                        ? `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`
                        : '1px solid transparent',
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </motion.button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeSection === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div>
                <h2
                  className="mb-4 text-2xl font-bold"
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  {plugin.name} {t('marketplace.documentation.title')}
                </h2>
                <div
                  className="rounded-xl p-6"
                  style={{
                    background: isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(249, 250, 251, 0.7)',
                    border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.2)' : 'rgba(226, 232, 240, 0.7)'}`,
                  }}
                >
                  <p
                    className="mb-4"
                    style={{ color: themeStyles.colors.text.secondary, lineHeight: '1.7' }}
                  >
                    {t('marketplace.documentation.welcomeMessage')} {plugin.name}.{' '}
                    {t('marketplace.documentation.extendsCapabilities')}
                  </p>
                  <p style={{ color: themeStyles.colors.text.secondary, lineHeight: '1.7' }}>
                    {plugin.description || t('marketplace.documentation.powerfulPlugin')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-xl p-6"
                  style={{
                    background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.7)',
                    border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                  }}
                >
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                    style={{
                      background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                      color: '#10b981',
                    }}
                  >
                    <HiOutlineCheckCircle className="h-6 w-6" />
                  </div>
                  <h3
                    className="mb-2 text-lg font-semibold"
                    style={{ color: themeStyles.colors.text.primary }}
                  >
                    {t('marketplace.documentation.keyFeatures')}
                  </h3>
                  <ul
                    className="space-y-2 text-sm"
                    style={{ color: themeStyles.colors.text.secondary }}
                  >
                    <li>• {t('marketplace.documentation.advancedMultiCluster')}</li>
                    <li>• {t('marketplace.documentation.realTimeMonitoring')}</li>
                    <li>• {t('marketplace.documentation.automatedScaling')}</li>
                    <li>• {t('marketplace.documentation.securityPolicy')}</li>
                    <li>• {t('marketplace.documentation.comprehensiveAPI')}</li>
                  </ul>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-xl p-6"
                  style={{
                    background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.7)',
                    border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                  }}
                >
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                    style={{
                      background: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                      color: themeStyles.colors.brand.primary,
                    }}
                  >
                    <HiOutlineInformationCircle className="h-6 w-6" />
                  </div>
                  <h3
                    className="mb-2 text-lg font-semibold"
                    style={{ color: themeStyles.colors.text.primary }}
                  >
                    {t('marketplace.documentation.requirements')}
                  </h3>
                  <ul
                    className="space-y-2 text-sm"
                    style={{ color: themeStyles.colors.text.secondary }}
                  >
                    <li>• {t('marketplace.documentation.kubestellarVersion')}</li>
                    <li>• {t('marketplace.documentation.kubernetesVersion')}</li>
                    <li>• {t('marketplace.documentation.ramMinimum')}</li>
                    <li>• {t('marketplace.documentation.networkConnectivity')}</li>
                    <li>• {t('marketplace.documentation.validCredentials')}</li>
                  </ul>
                </motion.div>
              </div>
            </motion.div>
          )}

          {activeSection === 'installation' && (
            <motion.div
              key="installation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div>
                <h2
                  className="mb-4 text-2xl font-bold"
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  {t('marketplace.documentation.installationGuide')}
                </h2>
                <p className="mb-6" style={{ color: themeStyles.colors.text.secondary }}>
                  {t('marketplace.documentation.followSteps')} {plugin.name}{' '}
                  {t('marketplace.documentation.inEnvironment')}
                </p>
              </div>

              <div className="space-y-6">
                {tutorialSteps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="rounded-xl p-6"
                    style={{
                      background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.7)',
                      border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full font-bold text-white"
                        style={{ background: themeStyles.colors.brand.primary }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3
                          className="mb-2 text-lg font-semibold"
                          style={{ color: themeStyles.colors.text.primary }}
                        >
                          {step.title}
                        </h3>
                        <p className="mb-4" style={{ color: themeStyles.colors.text.secondary }}>
                          {step.description}
                        </p>

                        {step.code && (
                          <div className="mb-4">
                            <pre
                              className="overflow-x-auto rounded-lg p-4 text-sm"
                              style={{
                                background: isDark ? '#1e293b' : '#1f2937',
                                color: isDark ? '#d1d5db' : '#f3f4f6',
                              }}
                            >
                              <code>{step.code}</code>
                            </pre>
                          </div>
                        )}

                        {step.warning && (
                          <div
                            className="mb-3 flex items-start gap-2 rounded-lg p-3"
                            style={{
                              background: isDark
                                ? 'rgba(239, 68, 68, 0.1)'
                                : 'rgba(254, 202, 202, 0.5)',
                              border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.3)'}`,
                            }}
                          >
                            <HiOutlineExclamationTriangle
                              className="mt-0.5 h-5 w-5 flex-shrink-0"
                              style={{ color: isDark ? '#fca5a5' : '#dc2626' }}
                            />
                            <p
                              className="text-sm"
                              style={{ color: isDark ? '#fca5a5' : '#dc2626' }}
                            >
                              {step.warning}
                            </p>
                          </div>
                        )}

                        {step.tip && (
                          <div
                            className="flex items-start gap-2 rounded-lg p-3"
                            style={{
                              background: isDark
                                ? 'rgba(59, 130, 246, 0.1)'
                                : 'rgba(219, 234, 254, 0.5)',
                              border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.3)'}`,
                            }}
                          >
                            <HiOutlineLightBulb
                              className="mt-0.5 h-5 w-5 flex-shrink-0"
                              style={{ color: isDark ? '#93c5fd' : '#1d4ed8' }}
                            />
                            <p
                              className="text-sm"
                              style={{ color: isDark ? '#93c5fd' : '#1d4ed8' }}
                            >
                              {step.tip}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeSection === 'examples' && (
            <motion.div
              key="examples"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div>
                <h2
                  className="mb-4 text-2xl font-bold"
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  {t('marketplace.documentation.codeExamples')}
                </h2>
                <p className="mb-6" style={{ color: themeStyles.colors.text.secondary }}>
                  {t('marketplace.documentation.practicalExamples')} {plugin.name}.
                </p>
              </div>

              <div className="space-y-6">
                {codeExamples.map((example, index) => renderCodeBlock(example, index))}
              </div>
            </motion.div>
          )}

          {activeSection === 'faq' && (
            <motion.div
              key="faq"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div>
                <h2
                  className="mb-4 text-2xl font-bold"
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  {t('marketplace.documentation.faq')}
                </h2>
              </div>

              <div className="space-y-4">
                {faqItems.map((faq, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="overflow-hidden rounded-xl"
                    style={{
                      border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                    }}
                  >
                    <motion.button
                      onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                      className="flex w-full items-center justify-between px-6 py-4 text-left"
                      whileHover={{
                        backgroundColor: isDark
                          ? 'rgba(31, 41, 55, 0.6)'
                          : 'rgba(249, 250, 251, 0.8)',
                      }}
                      style={{
                        background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.7)',
                      }}
                    >
                      <h3
                        className="font-medium"
                        style={{ color: themeStyles.colors.text.primary }}
                      >
                        {faq.question}
                      </h3>
                      <motion.div
                        animate={{ rotate: expandedFAQ === index ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <HiChevronRight
                          className="h-5 w-5"
                          style={{ color: themeStyles.colors.text.secondary }}
                        />
                      </motion.div>
                    </motion.button>
                    <AnimatePresence>
                      {expandedFAQ === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="px-6 py-4"
                            style={{
                              background: isDark
                                ? 'rgba(31, 41, 55, 0.2)'
                                : 'rgba(249, 250, 251, 0.4)',
                              borderTop: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.2)' : 'rgba(226, 232, 240, 0.5)'}`,
                            }}
                          >
                            <p
                              style={{
                                color: themeStyles.colors.text.secondary,
                                lineHeight: '1.6',
                              }}
                            >
                              {faq.answer}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PluginDocumentation;
