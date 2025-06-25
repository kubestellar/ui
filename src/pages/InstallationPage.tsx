import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ExternalLink,
  Copy,
  Terminal,
  CheckCircle,
  Info,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Server,
  CheckCircle2,
  XCircle,
  List,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Zap,
  Book,
  Globe,
  FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import useTheme from '../stores/themeStore';
import { FiSun, FiMoon } from 'react-icons/fi';
import { AnimatePresence } from 'framer-motion';

// Define platform type for installation
type Platform = 'kind' | 'k3d';

// Define prerequisite categories
enum PrereqCategory {
  Core = 'core',
  Setup = 'setup',
  Examples = 'examples',
  Build = 'build',
}

// Define prerequisite status
enum PrereqStatus {
  Checking = 'checking',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
  Unknown = 'unknown',
}

// Define installation steps
type InstallStepType = 'prerequisites' | 'install';

// Define prerequisite data structure
interface Prerequisite {
  name: string;
  displayName: string;
  category: PrereqCategory;
  description: string;
  minVersion?: string;
  maxVersion?: string;
  installCommand?: string;
  installUrl?: string;
  versionCommand?: string;
  versionRegex?: string;
  status: PrereqStatus;
  version?: string;
  details?: string;
  isExpanded?: boolean;
  aliasNames?: string[]; // Add support for alternative names for a tool
}

// Define specific type for the prerequisites data
interface PrereqToolData {
  name: string;
  version?: string;
  installed: boolean;
}

// Initial prerequisites definition
const initialPrerequisites: Prerequisite[] = [
  {
    name: 'kubeflex',
    displayName: 'KubeFlex',
    category: PrereqCategory.Core,
    description: 'KubeFlex CLI tool (required version ≥ 0.8.0)',
    minVersion: '0.8.0',
    installCommand:
      'bash <(curl -s https://raw.githubusercontent.com/kubestellar/kubeflex/main/scripts/install-kubeflex.sh) --ensure-folder /usr/local/bin --strip-bin',
    installUrl: 'https://github.com/kubestellar/kubeflex/blob/main/docs/users.md#installation',
    versionCommand: 'kflex version',
    status: PrereqStatus.Checking,
  },
  {
    name: 'clusteradm',
    displayName: 'OCM CLI',
    category: PrereqCategory.Core,
    description: 'Open Cluster Management CLI (required version between 0.7 and 0.11)',
    minVersion: '0.7.0',
    maxVersion: '0.11.0',
    installCommand:
      'bash <(curl -L https://raw.githubusercontent.com/open-cluster-management-io/clusteradm/main/install.sh) 0.10.1',
    installUrl: 'https://docs.kubestellar.io/release-0.27.2/direct/pre-reqs/',
    versionCommand: 'clusteradm version',
    status: PrereqStatus.Checking,
    aliasNames: ['ocm cli', 'ocmcli'],
  },
  {
    name: 'helm',
    displayName: 'Helm',
    category: PrereqCategory.Core,
    description: 'Kubernetes package manager (required version ≥ 3.0.0)',
    minVersion: '3.0.0',
    installCommand:
      'curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash',
    installUrl: 'https://helm.sh/docs/intro/install/',
    versionCommand: 'helm version',
    status: PrereqStatus.Checking,
  },
  {
    name: 'kubectl',
    displayName: 'kubectl',
    category: PrereqCategory.Core,
    description: 'Kubernetes command-line tool (required version ≥ 1.27.0)',
    minVersion: '1.27.0',
    installCommand:
      'curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && chmod +x kubectl && sudo mv kubectl /usr/local/bin/',
    installUrl: 'https://kubernetes.io/docs/tasks/tools/',
    versionCommand: 'kubectl version --client',
    status: PrereqStatus.Checking,
  },
  {
    name: 'kind',
    displayName: 'kind',
    category: PrereqCategory.Setup,
    description: 'Tool for running local Kubernetes clusters (required version ≥ 0.20.0)',
    minVersion: '0.20.0',
    installCommand:
      'curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64 && chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind',
    installUrl: 'https://kind.sigs.k8s.io/docs/user/quick-start/#installation',
    versionCommand: 'kind version',
    status: PrereqStatus.Checking,
  },
  {
    name: 'docker',
    displayName: 'Docker',
    category: PrereqCategory.Setup,
    description: 'Container runtime (required version ≥ 20.0.0)',
    minVersion: '20.0.0',
    installCommand: 'curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh',
    installUrl: 'https://docs.docker.com/engine/install/',
    versionCommand: 'docker version --format "{{.Client.Version}}"',
    status: PrereqStatus.Checking,
  },
];

// Helper function to parse and compare versions
const compareVersions = (version1: string, version2: string): number => {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = i < v1Parts.length ? v1Parts[i] : 0;
    const v2Part = i < v2Parts.length ? v2Parts[i] : 0;

    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }

  return 0;
};

// Animated card component
const AnimatedCard = ({
  children,
  delay = 0,
  className = '',
  isDark = true,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  isDark?: boolean;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`overflow-hidden rounded-xl border shadow-xl backdrop-blur-sm transition-colors duration-300 ${
        isDark ? 'border-slate-800/80 bg-slate-900/80' : 'border-gray-200/80 bg-white/80'
      } ${className}`}
    >
      {children}
    </motion.div>
  );
};

// Section header component
const SectionHeader = ({
  icon,
  title,
  description,
  isDark = true,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  isDark?: boolean;
}) => {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center">
        <div className="mr-3 text-blue-400">{icon}</div>
        <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </h2>
      </div>
      <p className={`ml-9 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{description}</p>
    </div>
  );
};

// Code block component with copy button
const CodeBlock = ({
  code,
  language = 'bash',
  isDark = true,
}: {
  code: string;
  language?: string;
  isDark?: boolean;
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (e: React.MouseEvent) => {
    // Stop propagation to prevent toggle
    e.stopPropagation();

    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        toast.error('Failed to copy to clipboard');
      });
  };

  return (
    <div className="relative mb-4 overflow-hidden rounded-md" onClick={e => e.stopPropagation()}>
      <div
        className={`flex items-center justify-between border-b px-4 py-2 transition-colors duration-300 ${
          isDark ? 'border-slate-700 bg-slate-900/90' : 'border-gray-700 bg-gray-800'
        }`}
      >
        <span className={`font-mono text-xs ${isDark ? 'text-slate-300' : 'text-gray-300'}`}>
          {t(`installationPage.codeBlock.${language}`)}
        </span>
        <button
          onClick={copyToClipboard}
          className={`rounded p-1 transition-colors ${
            isDark ? 'text-slate-300 hover:text-white' : 'text-gray-300 hover:text-white'
          }`}
          aria-label="Copy code"
        >
          {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <div
        className={`overflow-x-auto p-4 transition-colors duration-300 ${
          isDark ? 'bg-slate-950' : 'bg-gray-900'
        }`}
      >
        <pre
          className={`whitespace-pre-wrap break-all font-mono text-sm ${
            isDark ? 'text-emerald-300' : 'text-green-400'
          }`}
        >
          {code}
        </pre>
      </div>
    </div>
  );
};

// Status badge component
const StatusBadge = ({ status, isDark = true }: { status: PrereqStatus; isDark?: boolean }) => {
  const { t } = useTranslation();

  const getStatusStyles = () => {
    switch (status) {
      case PrereqStatus.Success:
        return isDark
          ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/30'
          : 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case PrereqStatus.Warning:
        return isDark
          ? 'bg-amber-950/30 text-amber-400 border-amber-500/30'
          : 'bg-amber-100 text-amber-700 border-amber-300';
      case PrereqStatus.Error:
        return isDark
          ? 'bg-rose-950/30 text-rose-400 border-rose-500/30'
          : 'bg-rose-100 text-rose-700 border-rose-300';
      case PrereqStatus.Checking:
        return isDark
          ? 'bg-blue-950/30 text-blue-400 border-blue-500/30'
          : 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return isDark
          ? 'bg-slate-950/30 text-slate-400 border-slate-500/30'
          : 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusIcon = () => {
    const iconClass = 'w-3.5 h-3.5';
    switch (status) {
      case PrereqStatus.Success:
        return <CheckCircle2 size={14} className={iconClass} />;
      case PrereqStatus.Warning:
        return <AlertTriangle size={14} className={iconClass} />;
      case PrereqStatus.Error:
        return <XCircle size={14} className={iconClass} />;
      case PrereqStatus.Checking:
        return <RefreshCw size={14} className={`${iconClass} animate-spin`} />;
      default:
        return <HelpCircle size={14} className={iconClass} />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case PrereqStatus.Success:
        return t('installationPage.statusBadge.installed');
      case PrereqStatus.Warning:
        return t('installationPage.statusBadge.versionMismatch');
      case PrereqStatus.Error:
        return t('installationPage.statusBadge.missing');
      case PrereqStatus.Checking:
        return t('installationPage.statusBadge.checking');
      default:
        return 'Unknown';
    }
  };

  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors duration-300 ${getStatusStyles()}`}
    >
      <span className="mr-1">{getStatusIcon()}</span>
      {getStatusText()}
    </div>
  );
};

// Prerequisite card component with internal state management
const PrerequisiteCard = ({
  prerequisite,
  isDark = true,
}: {
  prerequisite: Prerequisite;
  isDark?: boolean;
}) => {
  const { t } = useTranslation();
  // Use local state for expansion instead of props
  const [isExpanded, setIsExpanded] = useState(false);

  // Local toggle function that doesn't depend on parent state
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className={`mb-3 overflow-hidden rounded-lg border transition-all duration-200 ${
        isDark
          ? `border-slate-800/60 ${isExpanded ? 'bg-slate-900/60' : 'bg-slate-900/30 hover:bg-slate-900/50'}`
          : `border-gray-200 ${isExpanded ? 'bg-gray-50/80' : 'bg-white hover:bg-gray-50/50'} shadow-sm`
      }`}
    >
      <div className="flex cursor-pointer items-center justify-between p-3" onClick={handleToggle}>
        <div className="flex items-center">
          <div className="mr-3">
            {isExpanded ? (
              <ChevronDown size={18} className={isDark ? 'text-slate-400' : 'text-gray-500'} />
            ) : (
              <ChevronRight size={18} className={isDark ? 'text-slate-400' : 'text-gray-500'} />
            )}
          </div>
          <div>
            <div className="flex items-center">
              <h3 className={`mr-2 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {prerequisite.displayName}
              </h3>
              <StatusBadge status={prerequisite.status} isDark={isDark} />
            </div>
            <p className={`mt-0.5 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              {prerequisite.description}
            </p>
          </div>
        </div>
        <div className={`font-mono text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
          {prerequisite.version || '—'}
        </div>
      </div>

      {isExpanded && (
        <div className={`border-t p-4 pt-0 ${isDark ? 'border-slate-800/60' : 'border-gray-200'}`}>
          {prerequisite.status === PrereqStatus.Error && (
            <div className="mb-4">
              <h4 className={`mb-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('installationPage.errorSection.title')}
              </h4>
              {prerequisite.installCommand && (
                <CodeBlock code={prerequisite.installCommand} isDark={isDark} />
              )}
              {prerequisite.installUrl && (
                <a
                  href={prerequisite.installUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center text-sm transition-colors ${
                    isDark
                      ? 'text-blue-400 hover:text-blue-300'
                      : 'text-blue-600 hover:text-blue-500'
                  }`}
                  onClick={e => e.stopPropagation()} // Prevent toggle when clicking link
                >
                  {t('installationPage.errorSection.viewGuide')}
                  <ExternalLink size={14} className="ml-1" />
                </a>
              )}
            </div>
          )}

          {prerequisite.status === PrereqStatus.Warning && (
            <div className="mb-4">
              <div
                className={`mb-3 flex items-start rounded-md border p-3 ${
                  isDark ? 'border-amber-800/30 bg-amber-950/20' : 'border-amber-200 bg-amber-50'
                }`}
              >
                <AlertTriangle size={18} className="mr-2 mt-0.5 flex-shrink-0 text-amber-500" />
                <p className={`text-sm ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
                  {prerequisite.details ||
                    `${t('installationPage.warningSection.versionMismatch')} ${prerequisite.minVersion}${prerequisite.maxVersion ? ` ${t('installationPage.warningSection.to')} ${prerequisite.maxVersion}` : ` ${t('installationPage.warningSection.orHigher')}.`}`}
                </p>
              </div>
              <h4 className={`mb-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('installationPage.warningSection.updateInstructions')}
              </h4>
              {prerequisite.installCommand && (
                <CodeBlock code={prerequisite.installCommand} isDark={isDark} />
              )}
            </div>
          )}

          {prerequisite.status === PrereqStatus.Success && (
            <div
              className={`flex items-start rounded-md border p-3 ${
                isDark
                  ? 'border-emerald-800/30 bg-emerald-950/20'
                  : 'border-emerald-200 bg-emerald-50'
              }`}
            >
              <CheckCircle2 size={18} className="mr-2 mt-0.5 flex-shrink-0 text-emerald-500" />
              <p className={`text-sm ${isDark ? 'text-emerald-200' : 'text-emerald-800'}`}>
                {prerequisite.displayName} {t('installationPage.successSection.installed')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Tab component for installation steps
const TabButton = ({
  active,
  onClick,
  children,
  disabled = false,
  isDark = true,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  isDark?: boolean;
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-4 py-2 text-sm transition-colors ${
        disabled
          ? isDark
            ? 'cursor-not-allowed bg-slate-800/50 text-slate-500'
            : 'cursor-not-allowed bg-gray-300/50 text-gray-400'
          : active
            ? 'bg-blue-600 font-medium text-white'
            : isDark
              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      {children}
    </button>
  );
};

// Script installation section
const InstallationScript = ({
  platform,
  isDark = true,
}: {
  platform: Platform;
  isDark?: boolean;
}) => {
  const { t } = useTranslation();
  const scriptCommand = `bash <(curl -s https://raw.githubusercontent.com/kubestellar/kubestellar/refs/tags/v0.27.2/scripts/create-kubestellar-demo-env.sh) --platform ${platform}`;

  return (
    <div>
      <p className={`mb-4 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
        {t('installationPage.installation.scriptInstructions')} {platform}:
      </p>

      <CodeBlock code={scriptCommand} isDark={isDark} />

      <div className="mt-6 space-y-4">
        <div
          className={`rounded-md border p-4 transition-colors duration-300 ${
            isDark
              ? 'border-blue-800/30 bg-gradient-to-r from-blue-950/20 to-indigo-950/20'
              : 'border-blue-200 bg-blue-50'
          }`}
        >
          <div className="flex items-start">
            <Info
              size={18}
              className={`mr-3 mt-0.5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
            />
            <div>
              <h4
                className={`mb-2 text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}
              >
                {t('installationPage.installation.installationProcess.title')}
              </h4>
              <ul
                className={`list-disc space-y-2 pl-4 text-sm ${isDark ? 'text-blue-200' : 'text-blue-700'}`}
              >
                {(
                  t('installationPage.installation.installationProcess.steps', {
                    returnObjects: true,
                  }) as string[]
                ).map((step: string, index: number) => (
                  <li key={index}>{step.replace('{platform}', platform)}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div
          className={`rounded-md border p-4 transition-colors duration-300 ${
            isDark ? 'border-amber-800/30 bg-amber-950/20' : 'border-amber-200 bg-amber-50'
          }`}
        >
          <div className="flex items-start">
            <AlertTriangle
              size={18}
              className={`mr-3 mt-0.5 flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
            />
            <div>
              <h4
                className={`mb-2 text-sm font-medium ${isDark ? 'text-amber-300' : 'text-amber-800'}`}
              >
                {t('installationPage.installation.importantNotes.title')}
              </h4>
              <ul
                className={`list-disc space-y-2 pl-4 text-sm ${isDark ? 'text-amber-200' : 'text-amber-700'}`}
              >
                {(
                  t('installationPage.installation.importantNotes.notes', {
                    returnObjects: true,
                  }) as string[]
                ).map((note: string, index: number) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div
          className={`rounded-md border p-4 transition-colors duration-300 ${
            isDark ? 'border-emerald-800/30 bg-emerald-950/20' : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <div className="flex items-start">
            <CheckCircle2
              size={18}
              className={`mr-3 mt-0.5 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
            />
            <div>
              <h4
                className={`mb-2 text-sm font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}
              >
                {t('installationPage.installation.afterInstallation.title')}
              </h4>
              <ul
                className={`list-disc space-y-2 pl-4 text-sm ${isDark ? 'text-emerald-200' : 'text-emerald-700'}`}
              >
                {(
                  t('installationPage.installation.afterInstallation.steps', {
                    returnObjects: true,
                  }) as string[]
                ).map((step: string, index: number) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main installation page component
const InstallationPage = () => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  // State for platform selection
  const [platform, setPlatform] = useState<Platform>('kind');

  // State for loading and error handling
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [checkError, setCheckError] = useState(false);

  // Check if we should skip prerequisites check (e.g., in Docker environments)
  const skipPrerequisitesCheck = import.meta.env.VITE_SKIP_PREREQUISITES_CHECK === 'true';

  // Initialize the active tab based on whether prerequisites check is skipped
  const [activeTab, setActiveTab] = useState<'prerequisites' | 'install'>(
    skipPrerequisitesCheck ? 'install' : 'prerequisites'
  );

  // State for prerequisites
  const [prerequisites, setPrerequisites] = useState<Prerequisite[]>(
    // Set all prerequisites to success if skipping check
    skipPrerequisitesCheck
      ? initialPrerequisites.map(p => ({ ...p, status: PrereqStatus.Success }))
      : initialPrerequisites
  );

  // State for installation step tracking
  const [currentStep, setCurrentStep] = useState<InstallStepType>(
    skipPrerequisitesCheck ? 'install' : 'prerequisites'
  );

  const navigate = useNavigate();

  // Initial status check
  useEffect(() => {
    const checkStatus = async () => {
      setIsChecking(true);
      try {
        const { data } = await api.get('/api/kubestellar/status');
        if (data.allReady) {
          navigate('/login');
          console.log('KubeStellar is installed');
          toast.success(t('installationPage.toasts.alreadyInstalled'));
        } else {
          // Only log the message, don't show toast as it'll be redundant with the page content
          console.log('KubeStellar not installed, showing installation page');
        }
      } catch (error: unknown) {
        console.error('Error checking initial KubeStellar status:', error);

        // Ignore 401 errors which are expected if not logged in
        if (
          error &&
          typeof error === 'object' &&
          'response' in error &&
          error.response &&
          typeof error.response === 'object' &&
          'status' in error.response &&
          error.response.status === 401
        ) {
          console.warn(
            'Authentication required (401) - this is expected for non-authenticated users'
          );
          // Don't set error state for auth errors, treat as not installed
          setIsChecking(false);
        } else {
          setCheckError(true);
        }
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
  }, [navigate, t]);

  // Check prerequisites
  useEffect(() => {
    if (isChecking || checkError || skipPrerequisitesCheck) return;

    const checkPrerequisites = async () => {
      try {
        const { data } = await api.get('/api/prerequisites');

        // Update prerequisites with real data
        const updatedPrereqs = prerequisites.map(prereq => {
          // Try to find the tool by name or alias
          let tool = data.prerequisites?.find(
            (t: PrereqToolData) => t.name.toLowerCase() === prereq.name.toLowerCase()
          );

          // If not found and aliases exist, try to find by alias
          if (!tool && prereq.aliasNames) {
            for (const alias of prereq.aliasNames) {
              tool = data.prerequisites?.find(
                (t: PrereqToolData) => t.name.toLowerCase() === alias.toLowerCase()
              );
              if (tool) break;
            }
          }

          // Special case for OCM CLI (clusteradm)
          if (prereq.name === 'clusteradm' && !tool) {
            // Try alternative name formats
            tool = data.prerequisites?.find(
              (t: PrereqToolData) =>
                t.name.toLowerCase().includes('ocm') ||
                t.name.toLowerCase().includes('cluster') ||
                t.name.toLowerCase() === 'open cluster management'
            );
          }

          if (!tool) {
            return {
              ...prereq,
              status: PrereqStatus.Error,
              details: 'Tool not found',
            };
          }

          // Set version if available
          if (tool.version) {
            prereq.version = tool.version;
          }

          // Check version requirements
          if (!tool.installed) {
            return {
              ...prereq,
              status: PrereqStatus.Error,
              details: 'Not installed',
            };
          } else if (prereq.minVersion && tool.version) {
            const versionMet = compareVersions(tool.version, prereq.minVersion) >= 0;
            const maxVersionMet = prereq.maxVersion
              ? compareVersions(tool.version, prereq.maxVersion) <= 0
              : true;

            if (!versionMet) {
              return {
                ...prereq,
                status: PrereqStatus.Warning,
                details: `Version too old. Required: ${prereq.minVersion} or higher.`,
              };
            } else if (!maxVersionMet) {
              return {
                ...prereq,
                status: PrereqStatus.Warning,
                details: `Version too new. Required: up to ${prereq.maxVersion}.`,
              };
            } else {
              return {
                ...prereq,
                status: PrereqStatus.Success,
              };
            }
          } else {
            return {
              ...prereq,
              status: PrereqStatus.Success,
            };
          }
        });

        setPrerequisites(updatedPrereqs);

        // Expand first error or warning automatically
        const firstProblem = updatedPrereqs.find(
          p => p.status === PrereqStatus.Error || p.status === PrereqStatus.Warning
        );

        if (firstProblem) {
          setCurrentStep('install');
        }
      } catch (error) {
        console.error('Error checking prerequisites:', error);

        // Set all prerequisites to unknown
        setPrerequisites(
          prerequisites.map(prereq => ({
            ...prereq,
            status: PrereqStatus.Unknown,
            details: 'Failed to check',
          }))
        );
      }
    };

    checkPrerequisites();
  }, [isChecking, checkError, prerequisites, skipPrerequisitesCheck]);

  // Periodically check if KubeStellar is now installed
  useEffect(() => {
    let intervalId: number;

    const checkStatus = async () => {
      try {
        const { data } = await api.get('/api/kubestellar/status');
        if (data.allReady) {
          clearInterval(intervalId);
          toast.success(t('installationPage.toasts.installationDetected'));
          // Automatically navigate to login
          navigate('/login');
        }
      } catch (error: unknown) {
        // Only log error but don't show toast for periodic checks
        if (
          error &&
          typeof error === 'object' &&
          'response' in error &&
          error.response &&
          typeof error.response === 'object' &&
          'status' in error.response &&
          error.response.status === 401
        ) {
          console.warn('Periodic check: Authentication required (401)');
        } else {
          console.error('Error in periodic KubeStellar status check:', error);
        }
      }
    };

    // Only start the interval if we're not already checking
    if (!isChecking && !checkError) {
      // Only show the message once when starting the interval
      toast(t('installationPage.toasts.notInstalled'), {
        icon: 'ℹ️',
        duration: 5000,
      });

      // Start the interval
      intervalId = window.setInterval(checkStatus, 30000); // Check every 30 seconds
      console.log('Started periodic check for KubeStellar installation');
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [navigate, isChecking, checkError, t]);

  // Retry status check
  const retryStatusCheck = async () => {
    setCheckError(false);
    setIsChecking(true);

    try {
      const { data } = await api.get('/api/kubestellar/status');
      if (data.allReady) {
        navigate('/login');
      }
    } catch (error) {
      console.error('Error checking KubeStellar status:', error);
      setCheckError(true);
      toast.error(t('installationPage.toasts.checkFailed'));
    } finally {
      setIsChecking(false);
    }
  };

  // Handler for starting automatic installation
  const handleInstall = async () => {
    setIsLoading(true);
    const loadingToast = toast.loading(t('installationPage.toasts.preparingInstructions'));

    try {
      // Simply move to the next step and show CLI instructions
      toast.dismiss(loadingToast);
      toast.success(t('installationPage.toasts.followInstructions'));
      setCurrentStep('install');

      // Don't show additional toast, to reduce message clutter
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(t('installationPage.toasts.loadInstructionsFailed'));
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get counts for prerequisites by status
  const getPrereqStatusCounts = () => {
    const counts = {
      success: prerequisites.filter(p => p.status === PrereqStatus.Success).length,
      warning: prerequisites.filter(p => p.status === PrereqStatus.Warning).length,
      error: prerequisites.filter(p => p.status === PrereqStatus.Error).length,
      checking: prerequisites.filter(p => p.status === PrereqStatus.Checking).length,
      total: prerequisites.length,
    };

    return counts;
  };

  // Determine if installation can proceed
  const canProceed = () => {
    // Always allow proceeding if prerequisites check is skipped
    if (skipPrerequisitesCheck) return true;

    return (
      prerequisites.filter(
        p => p.category === PrereqCategory.Core && p.status === PrereqStatus.Error
      ).length === 0
    );
  };

  // Get prerequisites for a specific category
  const getPrereqsByCategory = (category: PrereqCategory) => {
    return prerequisites.filter(p => p.category === category);
  };

  // Loading state while checking initial status
  if (isChecking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950/30 p-4">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative flex h-60 w-60 items-center justify-center">
            <img
              src="/KubeStellar.png"
              alt="KubeStellar Logo"
              className="max-h-full max-w-full animate-pulse object-contain"
            />
          </div>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200/30 border-t-blue-500"></div>
          <p className="text-lg text-white">{t('installationPage.checkingStatus.title')}</p>
          <p className="max-w-md text-center text-sm text-slate-400">
            {t('installationPage.checkingStatus.description')}
          </p>
        </div>
      </div>
    );
  }

  // Error state for status check
  if (checkError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950/30 p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-800/50 bg-slate-900/70 p-6 text-center shadow-xl backdrop-blur-md">
          <div className="relative mx-auto mb-4 h-48 w-48">
            <img
              src="/KubeStellar.png"
              alt="KubeStellar Logo"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <AlertTriangle size={40} className="mx-auto mb-4 text-yellow-400" />
          <h2 className="mb-2 text-2xl font-semibold text-white">
            {t('installationPage.checkError.title')}
          </h2>
          <p className="mb-6 text-slate-300">{t('installationPage.checkError.description')}</p>
          <div className="space-y-4">
            <button
              onClick={retryStatusCheck}
              className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-white transition-colors hover:bg-blue-500"
            >
              <RefreshCw size={18} className="mr-2" />
              {t('installationPage.checkError.retryButton')}
            </button>
            <p className="text-sm text-slate-400">
              {t('installationPage.checkError.persistenceNote')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark
          ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950/30'
          : 'bg-gradient-to-b from-gray-50 via-white to-blue-50/30'
      }`}
    >
      {/* Top Navigation Bar */}
      <div
        className={`fixed left-0 right-0 top-0 z-50 border-b backdrop-blur-sm transition-colors duration-300 ${
          isDark ? 'border-slate-800/50 bg-slate-900/90' : 'border-gray-200/50 bg-white/90'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center transition-opacity hover:opacity-90">
                <img src="/KubeStellar.png" alt="KubeStellar Logo" className="h-9 w-auto" />
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <a
                href="https://github.com/kubestellar/kubestellar"
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center text-sm font-medium transition-colors ${
                  isDark ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="mr-1.5 h-5 w-5 transition-transform group-hover:scale-110"
                  fill="currentColor"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                {t('installationPage.footer.github')}
              </a>
              <a
                href="https://docs.kubestellar.io/release-0.27.2/direct/get-started/"
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center text-sm font-medium transition-colors ${
                  isDark ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Book size={18} className="mr-1.5 transition-transform group-hover:scale-110" />
                {t('installationPage.footer.documentation')}
              </a>
              <motion.button
                onClick={toggleTheme}
                className={`btn btn-circle flex items-center justify-center rounded-full p-2 transition-all duration-300 hover:scale-105 active:scale-95 ${
                  isDark
                    ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/90 hover:text-white'
                    : 'bg-gray-200/80 text-gray-600 hover:bg-gray-300/90 hover:text-gray-900'
                }`}
                aria-label={t('header.themeToggle')}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <AnimatePresence mode="wait">
                  {!isDark ? (
                    <motion.div
                      key="moon"
                      initial={{ opacity: 0, rotate: -30 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 30 }}
                      transition={{ duration: 0.3 }}
                    >
                      <FiMoon className="text-lg" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="sun"
                      initial={{ opacity: 0, rotate: 30 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: -30 }}
                      transition={{ duration: 0.3 }}
                    >
                      <FiSun className="text-lg text-yellow-400" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
              <a
                href="https://kubestellar.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex transform items-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:from-blue-500 hover:to-indigo-500 hover:shadow-indigo-500/25"
              >
                <Globe size={16} className="mr-1.5" />
                {t('common.help')}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-8 pt-24">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 text-center"
          >
            <h1
              className={`mb-4 text-5xl font-bold ${
                isDark
                  ? 'bg-gradient-to-r from-blue-400 via-indigo-400 to-teal-400 bg-clip-text text-transparent'
                  : 'text-gray-900'
              }`}
            >
              {t('installationPage.welcome')}
            </h1>
            <p
              className={`mx-auto max-w-2xl text-lg leading-relaxed ${
                isDark ? 'text-slate-300' : 'text-gray-600'
              }`}
            >
              {t('installationPage.gettingStarted')}
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <div
              className={`flex items-center rounded-xl border p-4 transition-colors duration-300 ${
                isDark
                  ? 'border-slate-800/60 bg-slate-900/60'
                  : 'border-gray-200 bg-white shadow-sm'
              }`}
            >
              <div className={`mr-4 rounded-lg p-3 ${isDark ? 'bg-blue-500/10' : 'bg-blue-100'}`}>
                <Server size={24} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
              </div>
              <div>
                <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                  {t('installationPage.prerequisites.prerequisites')}
                </div>
                <div
                  className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  {getPrereqStatusCounts().success} / {getPrereqStatusCounts().total}
                </div>
              </div>
            </div>

            <div
              className={`flex items-center rounded-xl border p-4 transition-colors duration-300 ${
                isDark
                  ? 'border-slate-800/60 bg-slate-900/60'
                  : 'border-gray-200 bg-white shadow-sm'
              }`}
            >
              <div
                className={`mr-4 rounded-lg p-3 ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-100'}`}
              >
                <CheckCircle2
                  size={24}
                  className={isDark ? 'text-emerald-400' : 'text-emerald-600'}
                />
              </div>
              <div>
                <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                  {t('installationPage.installation.platform')}
                </div>
                <div
                  className={`text-2xl font-semibold capitalize ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {platform}
                </div>
              </div>
            </div>

            <div
              className={`flex items-center rounded-xl border p-4 transition-colors duration-300 ${
                isDark
                  ? 'border-slate-800/60 bg-slate-900/60'
                  : 'border-gray-200 bg-white shadow-sm'
              }`}
            >
              <div
                className={`mr-4 rounded-lg p-3 ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-100'}`}
              >
                <Zap size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
              </div>
              <div>
                <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                  {t('common.status.status')}
                </div>
                <div
                  className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  {currentStep === 'prerequisites'
                    ? t('common.status.checking')
                    : currentStep === 'install'
                      ? t('common.status.active')
                      : t('common.status.success')}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left sidebar - make it sticky */}
            <div className="lg:sticky lg:top-24">
              <AnimatedCard delay={0.1} className="p-6" isDark={isDark}>
                <SectionHeader
                  icon={<List size={22} />}
                  title={t('installationPage.sidebarSteps.title')}
                  description={t('installationPage.sidebarSteps.description')}
                  isDark={isDark}
                />

                <div className="space-y-4">
                  <div className="flex items-start">
                    <div
                      className={`flex-shrink-0 ${currentStep === 'prerequisites' ? 'bg-blue-600' : currentStep === 'install' ? 'bg-emerald-600' : 'bg-slate-700'} mr-3 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full`}
                    >
                      <span className="text-xs font-bold text-white">
                        {currentStep === 'install' ? <CheckCircle2 size={12} /> : '1'}
                      </span>
                    </div>
                    <div>
                      <h3
                        className={`font-medium ${
                          currentStep === 'prerequisites'
                            ? isDark
                              ? 'text-white'
                              : 'text-gray-900'
                            : currentStep === 'install'
                              ? 'text-emerald-400'
                              : isDark
                                ? 'text-slate-300'
                                : 'text-gray-600'
                        }`}
                      >
                        {t('installationPage.sidebarSteps.checkPrerequisites')}
                      </h3>
                      <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                        {t('installationPage.sidebarSteps.checkPrerequisitesDescription')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div
                      className={`flex-shrink-0 ${currentStep === 'install' ? 'bg-blue-600' : 'bg-slate-700'} mr-3 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full`}
                    >
                      <span className="text-xs font-bold text-white">2</span>
                    </div>
                    <div>
                      <h3
                        className={`font-medium ${
                          currentStep === 'install'
                            ? isDark
                              ? 'text-white'
                              : 'text-gray-900'
                            : isDark
                              ? 'text-slate-300'
                              : 'text-gray-600'
                        }`}
                      >
                        {t('installationPage.sidebarSteps.installKubestellar')}
                      </h3>
                      <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                        {t('installationPage.sidebarSteps.installKubestellarDescription')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div
                      className={`flex-shrink-0 ${currentStep === 'install' ? 'bg-blue-600' : 'bg-slate-700'} mr-3 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full`}
                    >
                      <span className="text-xs font-bold text-white">3</span>
                    </div>
                    <div>
                      <h3
                        className={`font-medium ${
                          currentStep === 'install'
                            ? isDark
                              ? 'text-white'
                              : 'text-gray-900'
                            : isDark
                              ? 'text-slate-300'
                              : 'text-gray-600'
                        }`}
                      >
                        {t('installationPage.sidebarSteps.startUsingKubestellar')}
                      </h3>
                      <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                        {t('installationPage.sidebarSteps.startUsingKubestellarDescription')}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`mt-6 border-t pt-6 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}
                >
                  <a
                    href="https://docs.kubestellar.io/release-0.27.2/direct/pre-reqs/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex items-center transition-colors ${
                      isDark
                        ? 'text-blue-400 hover:text-blue-300'
                        : 'text-blue-600 hover:text-blue-500'
                    }`}
                  >
                    <ExternalLink
                      size={16}
                      className="mr-2 transition-transform group-hover:scale-110"
                    />
                    {t('installationPage.documentationLink')}
                  </a>
                </div>
              </AnimatedCard>
            </div>

            {/* Main content area */}
            <AnimatedCard delay={0.2} className="lg:col-span-2" isDark={isDark}>
              {/* Tabs */}
              <div
                className={`border-b px-6 py-4 transition-colors duration-300 ${
                  isDark ? 'border-slate-800 bg-slate-900/90' : 'border-gray-200 bg-gray-50/90'
                }`}
              >
                <div className="flex gap-3">
                  <TabButton
                    active={activeTab === 'prerequisites'}
                    onClick={() => {
                      setActiveTab('prerequisites');
                      setCurrentStep('prerequisites');
                    }}
                    disabled={skipPrerequisitesCheck}
                    isDark={isDark}
                  >
                    {t('installationPage.tabs.prerequisites')}
                  </TabButton>
                  <TabButton
                    active={activeTab === 'install'}
                    onClick={() => {
                      setActiveTab('install');
                      setCurrentStep('install');
                    }}
                    isDark={isDark}
                  >
                    {t('installationPage.tabs.installation')}
                  </TabButton>
                </div>
              </div>

              {/* Tab content */}
              <div className="p-6">
                {activeTab === 'prerequisites' && (
                  <div>
                    <SectionHeader
                      icon={<Server size={22} />}
                      title={t('installationPage.prerequisites.title')}
                      description={t('installationPage.prerequisites.description')}
                      isDark={isDark}
                    />

                    {/* Status summary */}
                    <div className="mb-6 flex flex-wrap gap-4">
                      <div
                        className={`rounded-lg border px-4 py-3 transition-colors duration-300 ${
                          isDark
                            ? 'border-slate-800/80 bg-slate-900/60'
                            : 'border-gray-200 bg-white shadow-sm'
                        }`}
                      >
                        <div
                          className={`mb-1 text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}
                        >
                          {t('installationPage.prerequisites.status.success')}
                        </div>
                        <div
                          className={`text-2xl font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                        >
                          {getPrereqStatusCounts().success} / {getPrereqStatusCounts().total}
                        </div>
                      </div>

                      <div
                        className={`rounded-lg border px-4 py-3 transition-colors duration-300 ${
                          isDark
                            ? 'border-slate-800/80 bg-slate-900/60'
                            : 'border-gray-200 bg-white shadow-sm'
                        }`}
                      >
                        <div
                          className={`mb-1 text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}
                        >
                          {t('installationPage.prerequisites.status.warnings')}
                        </div>
                        <div
                          className={`text-2xl font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
                        >
                          {getPrereqStatusCounts().warning}
                        </div>
                      </div>

                      <div
                        className={`rounded-lg border px-4 py-3 transition-colors duration-300 ${
                          isDark
                            ? 'border-slate-800/80 bg-slate-900/60'
                            : 'border-gray-200 bg-white shadow-sm'
                        }`}
                      >
                        <div
                          className={`mb-1 text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}
                        >
                          {t('installationPage.prerequisites.status.missing')}
                        </div>
                        <div
                          className={`text-2xl font-semibold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}
                        >
                          {getPrereqStatusCounts().error}
                        </div>
                      </div>

                      {getPrereqStatusCounts().checking > 0 && (
                        <div
                          className={`rounded-lg border px-4 py-3 transition-colors duration-300 ${
                            isDark
                              ? 'border-slate-800/80 bg-slate-900/60'
                              : 'border-gray-200 bg-white shadow-sm'
                          }`}
                        >
                          <div
                            className={`mb-1 text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}
                          >
                            {t('installationPage.prerequisites.status.checking')}
                          </div>
                          <div
                            className={`text-2xl font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                          >
                            {getPrereqStatusCounts().checking}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Core prerequisites */}
                    <div className="mb-6">
                      <h3
                        className={`mb-3 text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
                      >
                        {t('installationPage.prerequisites.coreRequirements')}
                      </h3>

                      {/* Map all core prerequisites */}
                      {getPrereqsByCategory(PrereqCategory.Core).map(prereq => (
                        <PrerequisiteCard
                          key={`prereq-${prereq.name}`}
                          prerequisite={prereq}
                          isDark={isDark}
                        />
                      ))}
                    </div>

                    {/* Setup prerequisites */}
                    <div className="mb-6">
                      <h3
                        className={`mb-3 text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
                      >
                        {t('installationPage.prerequisites.demoEnvironmentRequirements')}
                      </h3>

                      {/* Map all setup prerequisites */}
                      {getPrereqsByCategory(PrereqCategory.Setup).map(prereq => (
                        <PrerequisiteCard
                          key={`prereq-${prereq.name}`}
                          prerequisite={prereq}
                          isDark={isDark}
                        />
                      ))}
                    </div>

                    {/* Navigation buttons */}
                    <div className="mt-8 flex justify-between">
                      <button
                        onClick={() => window.location.reload()}
                        className={`flex items-center rounded-lg px-4 py-2 transition-colors ${
                          isDark
                            ? 'bg-slate-800 text-white hover:bg-slate-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        <RefreshCw size={16} className="mr-2" />
                        {t('installationPage.prerequisites.buttons.refresh')}
                      </button>

                      <button
                        onClick={() => setActiveTab('install')}
                        disabled={!canProceed() || getPrereqStatusCounts().checking > 0}
                        className={`flex items-center rounded-lg px-5 py-2 text-white transition-colors ${
                          canProceed() && getPrereqStatusCounts().checking === 0
                            ? 'bg-blue-600 hover:bg-blue-500'
                            : isDark
                              ? 'cursor-not-allowed bg-slate-700 opacity-50'
                              : 'cursor-not-allowed bg-gray-400 opacity-50'
                        }`}
                      >
                        {t('installationPage.prerequisites.buttons.nextInstallation')}
                        <ArrowRight size={16} className="ml-2" />
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'install' && (
                  <div>
                    <SectionHeader
                      icon={<Terminal size={22} />}
                      title={t('installationPage.installation.title')}
                      description={t('installationPage.installation.description')}
                      isDark={isDark}
                    />

                    {/* Prerequisites Documentation Link */}
                    <div
                      className={`mb-6 rounded-lg border p-4 transition-colors duration-300 ${
                        isDark ? 'border-blue-800/40 bg-blue-950/30' : 'border-blue-200 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start">
                        <FileText
                          size={24}
                          className={`mr-3 mt-0.5 flex-shrink-0 ${
                            isDark ? 'text-blue-400' : 'text-blue-600'
                          }`}
                        />
                        <div>
                          <h3
                            className={`mb-2 text-lg font-medium ${
                              isDark ? 'text-white' : 'text-gray-900'
                            }`}
                          >
                            {t('installationPage.installation.installPrerequisitesFirst.title')}
                          </h3>
                          <p className={`mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                            {t(
                              'installationPage.installation.installPrerequisitesFirst.description'
                            )}
                          </p>
                          <a
                            href="https://docs.kubestellar.io/release-0.27.2/direct/pre-reqs/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-500"
                          >
                            <Book size={16} className="mr-2" />
                            {t('installationPage.installation.installPrerequisitesFirst.button')}
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Platform selection */}
                    <div className="mb-6">
                      <h3
                        className={`mb-3 text-lg font-medium ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {t('installationPage.installation.platform')}
                      </h3>

                      <div className="mb-4 flex flex-wrap gap-3">
                        <button
                          onClick={() => setPlatform('kind')}
                          className={`flex items-center rounded-md px-4 py-2 text-sm transition-colors ${
                            platform === 'kind'
                              ? 'bg-blue-600 font-medium text-white'
                              : isDark
                                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          <Server size={16} className="mr-2" />
                          {t('installationPage.installation.platforms.kind')}
                        </button>
                        <button
                          onClick={() => setPlatform('k3d')}
                          className={`flex items-center rounded-md px-4 py-2 text-sm transition-colors ${
                            platform === 'k3d'
                              ? 'bg-blue-600 font-medium text-white'
                              : isDark
                                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          <Server size={16} className="mr-2" />
                          {t('installationPage.installation.platforms.k3d')}
                        </button>
                      </div>
                    </div>

                    {/* Installation instructions */}
                    <div className="mb-6">
                      <h3
                        className={`mb-3 text-lg font-medium ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {t('installationPage.installation.installationScript')}
                      </h3>

                      <InstallationScript platform={platform} isDark={isDark} />
                    </div>

                    {/* Navigation buttons */}
                    <div className="mt-8 flex justify-between">
                      <button
                        onClick={() => setActiveTab('prerequisites')}
                        className={`flex items-center rounded-lg px-4 py-2 transition-colors ${
                          isDark
                            ? 'bg-slate-800 text-white hover:bg-slate-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        <ArrowRight size={16} className="mr-2 rotate-180" />
                        {t('installationPage.installation.buttons.backPrerequisites')}
                      </button>

                      <button
                        onClick={handleInstall}
                        disabled={isLoading}
                        className={`flex transform items-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-medium text-white shadow-lg transition-all hover:scale-105 hover:from-blue-500 hover:to-indigo-500 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-70`}
                      >
                        {isLoading ? (
                          <>
                            <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            {t('installationPage.installation.buttons.installing')}
                          </>
                        ) : (
                          <>
                            <Zap size={18} className="mr-2" />
                            {t('installationPage.installation.buttons.startInstallation')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </AnimatedCard>
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={`mt-16 text-center text-sm ${isDark ? 'text-slate-500' : 'text-gray-600'}`}
        >
          <div
            className={`mx-auto max-w-5xl border-t pt-8 ${isDark ? 'border-slate-800/50' : 'border-gray-200'}`}
          >
            <p className="mb-4">
              {t('installationPage.footer.copyright')} {new Date().getFullYear()} &bull;{' '}
              <a
                href="https://docs.kubestellar.io"
                target="_blank"
                rel="noopener noreferrer"
                className={
                  isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
                }
              >
                {t('installationPage.footer.documentation')}
              </a>{' '}
              &bull;{' '}
              <a
                href="https://github.com/kubestellar/kubestellar"
                target="_blank"
                rel="noopener noreferrer"
                className={
                  isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
                }
              >
                {t('installationPage.footer.github')}
              </a>
            </p>
            <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-500'}`}>
              {t('installationPage.footer.description')}
            </p>
          </div>
        </motion.div>

        {/* Add a notice when prerequisites check is skipped */}
        {skipPrerequisitesCheck && activeTab === 'prerequisites' && (
          <div className="mx-auto mb-6 max-w-5xl">
            <div className="rounded-xl border border-blue-800/50 bg-blue-950/30 p-4 text-center">
              <div className="mb-2 flex items-center justify-center">
                <Info size={20} className="mr-2 text-blue-400" />
                <h3 className="text-lg font-medium text-white">
                  {t('installationPage.skipPrerequisitesNotice.title')}
                </h3>
              </div>
              <p className="mb-2 text-slate-300">
                {t('installationPage.skipPrerequisitesNotice.description')}
              </p>
              <p className="text-xs text-slate-400">
                {t('installationPage.skipPrerequisitesNotice.note')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallationPage;
