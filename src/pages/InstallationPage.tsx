import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

// Define platform type for installation
type Platform = 'kind' | 'k3d';

// Define prerequisite categories
enum PrereqCategory {
  Core = 'core',
  Setup = 'setup',
  Examples = 'examples',
  Build = 'build'
}

// Define prerequisite status
enum PrereqStatus {
  Checking = 'checking',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
  Unknown = 'unknown'
}

// Define installation steps
type InstallStepType = 'prerequisites' | 'install' | 'using';

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
    installCommand: 'bash <(curl -s https://raw.githubusercontent.com/kubestellar/kubeflex/main/scripts/install-kubeflex.sh) --ensure-folder /usr/local/bin --strip-bin',
    installUrl: 'https://github.com/kubestellar/kubeflex/blob/main/docs/users.md#installation',
    versionCommand: 'kflex version',
    status: PrereqStatus.Checking
  },
  {
    name: 'clusteradm',
    displayName: 'OCM CLI',
    category: PrereqCategory.Core,
    description: 'Open Cluster Management CLI (required version between 0.7 and 0.11)',
    minVersion: '0.7.0',
    maxVersion: '0.11.0',
    installCommand: 'bash <(curl -L https://raw.githubusercontent.com/open-cluster-management-io/clusteradm/main/install.sh) 0.10.1',
    installUrl: 'https://open-cluster-management.io/getting-started/installation/start-the-control-plane/',
    versionCommand: 'clusteradm version',
    status: PrereqStatus.Checking,
    aliasNames: ['ocm cli', 'ocmcli']
  },
  {
    name: 'helm',
    displayName: 'Helm',
    category: PrereqCategory.Core,
    description: 'Kubernetes package manager (required version ≥ 3.0.0)',
    minVersion: '3.0.0',
    installCommand: 'curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash',
    installUrl: 'https://helm.sh/docs/intro/install/',
    versionCommand: 'helm version',
    status: PrereqStatus.Checking
  },
  {
    name: 'kubectl',
    displayName: 'kubectl',
    category: PrereqCategory.Core,
    description: 'Kubernetes command-line tool (required version ≥ 1.27.0)',
    minVersion: '1.27.0',
    installCommand: 'curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && chmod +x kubectl && sudo mv kubectl /usr/local/bin/',
    installUrl: 'https://kubernetes.io/docs/tasks/tools/install-kubectl/',
    versionCommand: 'kubectl version --client',
    status: PrereqStatus.Checking
  },
  {
    name: 'kind',
    displayName: 'kind',
    category: PrereqCategory.Setup,
    description: 'Tool for running local Kubernetes clusters (required version ≥ 0.20.0)',
    minVersion: '0.20.0',
    installCommand: 'curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64 && chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind',
    installUrl: 'https://kind.sigs.k8s.io/docs/user/quick-start/#installation',
    versionCommand: 'kind version',
    status: PrereqStatus.Checking
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
    status: PrereqStatus.Checking
  }
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
  className = ""
}: { 
  children: React.ReactNode; 
  delay?: number;
  className?: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-800/80 shadow-xl overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  );
};

// Section header component
const SectionHeader = ({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) => {
  return (
    <div className="mb-6">
      <div className="flex items-center mb-2">
        <div className="mr-3 text-blue-400">
          {icon}
        </div>
        <h2 className="text-xl font-semibold text-white">
          {title}
        </h2>
      </div>
      <p className="text-slate-400 ml-9">
        {description}
      </p>
    </div>
  );
};

// Code block component with copy button
const CodeBlock = ({ 
  code, 
  language = "bash" 
}: { 
  code: string; 
  language?: string;
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
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
    <div className="relative rounded-md overflow-hidden mb-4">
      <div className="flex items-center justify-between bg-slate-950/80 px-4 py-2 border-b border-slate-800">
        <span className="text-xs text-slate-400 font-mono">{language}</span>
        <button
          onClick={copyToClipboard}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded"
          aria-label="Copy code"
        >
          {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <div className="bg-slate-950/60 p-4 overflow-x-auto">
        <pre className="text-blue-100 font-mono text-sm whitespace-pre-wrap break-all">
          {code}
        </pre>
      </div>
    </div>
  );
};

// Status badge component
const StatusBadge = ({ status }: { status: PrereqStatus }) => {
  const getStatusStyles = () => {
    switch (status) {
      case PrereqStatus.Success:
        return "bg-emerald-950/30 text-emerald-400 border-emerald-500/30";
      case PrereqStatus.Warning:
        return "bg-amber-950/30 text-amber-400 border-amber-500/30";
      case PrereqStatus.Error:
        return "bg-rose-950/30 text-rose-400 border-rose-500/30";
      case PrereqStatus.Checking:
        return "bg-blue-950/30 text-blue-400 border-blue-500/30";
      default:
        return "bg-slate-950/30 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case PrereqStatus.Success:
        return <CheckCircle2 size={14} />;
      case PrereqStatus.Warning:
        return <AlertTriangle size={14} />;
      case PrereqStatus.Error:
        return <XCircle size={14} />;
      case PrereqStatus.Checking:
        return <RefreshCw size={14} className="animate-spin" />;
      default:
        return <HelpCircle size={14} />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case PrereqStatus.Success:
        return "Installed";
      case PrereqStatus.Warning:
        return "Version mismatch";
      case PrereqStatus.Error:
        return "Missing";
      case PrereqStatus.Checking:
        return "Checking";
      default:
        return "Unknown";
    }
  };

  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles()}`}>
      <span className="mr-1">{getStatusIcon()}</span>
      {getStatusText()}
    </div>
  );
};

// Prerequisite card component
const PrerequisiteCard = ({ 
  prerequisite,
  onToggleExpand,
  isExpanded
}: { 
  prerequisite: Prerequisite;
  onToggleExpand: (name: string) => void;
  isExpanded: boolean;
}) => {
  return (
    <div className={`mb-3 border border-slate-800/60 rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'bg-slate-900/60' : 'bg-slate-900/30 hover:bg-slate-900/50'}`}>
      <div 
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => onToggleExpand(prerequisite.name)}
      >
        <div className="flex items-center">
          <div className="mr-3">
            {isExpanded ? 
              <ChevronDown size={18} className="text-slate-400" /> : 
              <ChevronRight size={18} className="text-slate-400" />
            }
          </div>
          <div>
            <div className="flex items-center">
              <h3 className="text-white font-medium mr-2">
                {prerequisite.displayName}
              </h3>
              <StatusBadge status={prerequisite.status} />
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              {prerequisite.description}
            </p>
          </div>
        </div>
        <div className="text-xs font-mono text-slate-300">
          {prerequisite.version || '—'}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-slate-800/60">
              {prerequisite.status === PrereqStatus.Error && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-white mb-2">
                    Installation Instructions
                  </h4>
                  {prerequisite.installCommand && (
                    <CodeBlock code={prerequisite.installCommand} />
                  )}
                  {prerequisite.installUrl && (
                    <a 
                      href={prerequisite.installUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-400 hover:text-blue-300 text-sm"
                    >
                      View installation guide
                      <ExternalLink size={14} className="ml-1" />
                    </a>
                  )}
                </div>
              )}

              {prerequisite.status === PrereqStatus.Warning && (
                <div className="mb-4">
                  <div className="flex items-start bg-amber-950/20 border border-amber-800/30 rounded-md p-3 mb-3">
                    <AlertTriangle size={18} className="text-amber-400 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-sm text-amber-200">
                      {prerequisite.details || `The installed version doesn't meet the requirements. Expected: ${prerequisite.minVersion}${prerequisite.maxVersion ? ` to ${prerequisite.maxVersion}` : ' or higher'}.`}
                    </p>
                  </div>
                  <h4 className="text-sm font-medium text-white mb-2">
                    Update Instructions
                  </h4>
                  {prerequisite.installCommand && (
                    <CodeBlock code={prerequisite.installCommand} />
                  )}
                </div>
              )}

              {prerequisite.status === PrereqStatus.Success && (
                <div className="flex items-start bg-emerald-950/20 border border-emerald-800/30 rounded-md p-3">
                  <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-sm text-emerald-200">
                    {prerequisite.displayName} is correctly installed and meets the version requirements.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Tab component for installation steps
const TabButton = ({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
}) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md text-sm transition-colors ${
        active 
          ? 'bg-blue-600 text-white font-medium' 
          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
};

// Script installation section
const InstallationScript = ({ platform }: { platform: Platform }) => {
  const scriptCommand = `bash <(curl -s https://raw.githubusercontent.com/kubestellar/kubestellar/refs/tags/v0.27.2/scripts/create-kubestellar-demo-env.sh) --platform ${platform}`;

  return (
    <div>
      <p className="text-slate-300 mb-4">
        Run this command in your terminal to install KubeStellar with {platform}:
      </p>
      
      <CodeBlock code={scriptCommand} />
      
      <div className="mt-6 space-y-4">
        <div className="bg-gradient-to-r from-blue-950/20 to-indigo-950/20 border border-blue-800/30 rounded-md p-4">
          <div className="flex items-start">
            <Info size={18} className="text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-300 mb-2">Installation Process:</h4>
              <ul className="text-sm text-blue-200 space-y-2 list-disc pl-4">
                <li>Creates and configures local {platform} clusters</li>
                <li>Installs KubeStellar components and dependencies</li>
                <li>Sets up proper networking and permissions</li>
                <li>Configures a demo environment</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="bg-amber-950/20 border border-amber-800/30 rounded-md p-4">
          <div className="flex items-start">
            <AlertTriangle size={18} className="text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-amber-300 mb-2">Important Notes:</h4>
              <ul className="text-sm text-amber-200 space-y-2 list-disc pl-4">
                <li>Installation may take several minutes to complete</li>
                <li>Ensure you have sufficient system resources available</li>
                <li>Keep the terminal window open until installation finishes</li>
                <li>Check the terminal output for any error messages</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-md p-4">
          <div className="flex items-start">
            <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-emerald-300 mb-2">After Installation:</h4>
              <ul className="text-sm text-emerald-200 space-y-2 list-disc pl-4">
                <li>Verify the installation by checking cluster status</li>
                <li>Review the getting started documentation</li>
                <li>Begin managing your KubeStellar environment</li>
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
  // State for platform selection
  const [platform, setPlatform] = useState<Platform>('kind');
  
  // State for loading and error handling
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [checkError, setCheckError] = useState(false);
  const [activeTab, setActiveTab] = useState<'prerequisites' | 'install'>('prerequisites');
  
  // Check if we should skip prerequisites check (e.g., in Docker environments)
  const skipPrerequisitesCheck = import.meta.env.VITE_SKIP_PREREQUISITES_CHECK === 'true';
  
  // State for prerequisites
  const [prerequisites, setPrerequisites] = useState<Prerequisite[]>(
    // Set all prerequisites to success if skipping check
    skipPrerequisitesCheck 
      ? initialPrerequisites.map(p => ({ ...p, status: PrereqStatus.Success }))
      : initialPrerequisites
  );
  const [expandedPrereqs, setExpandedPrereqs] = useState<string[]>([]);
  
  // State for installation step tracking
  const [currentStep, setCurrentStep] = useState<InstallStepType>(
    skipPrerequisitesCheck ? 'install' : 'prerequisites'
  );
  
  const navigate = useNavigate();
  
  // Toggle expanded state for prerequisites
  const togglePrereqExpanded = (name: string) => {
    if (expandedPrereqs.includes(name)) {
      setExpandedPrereqs(expandedPrereqs.filter(item => item !== name));
    } else {
      setExpandedPrereqs([...expandedPrereqs, name]);
    }
  };

  // Initial status check
  useEffect(() => {
    const checkStatus = async () => {
      setIsChecking(true);
      try {
        const { data } = await api.get('/api/kubestellar/status');
        if (data.allReady) {
          // For testing, don't automatically redirect
          // navigate('/login');
          console.log('KubeStellar is installed but not redirecting (testing mode)');
          toast.success('KubeStellar is installed! Testing mode: not redirecting');
        }
      } catch (error) {
        console.error('Error checking initial KubeStellar status:', error);
        setCheckError(true);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkStatus();
  }, [navigate]);

  // Check prerequisites
  useEffect(() => {
    if (isChecking || checkError || skipPrerequisitesCheck) return;

    const checkPrerequisites = async () => {
      try {
        const { data } = await api.get('/api/prerequisites');
        
        // Update prerequisites with real data
        const updatedPrereqs = prerequisites.map(prereq => {
          // Try to find the tool by name or alias
          let tool = data.prerequisites?.find((t: PrereqToolData) => 
            t.name.toLowerCase() === prereq.name.toLowerCase()
          );
          
          // If not found and aliases exist, try to find by alias
          if (!tool && prereq.aliasNames) {
            for (const alias of prereq.aliasNames) {
              tool = data.prerequisites?.find((t: PrereqToolData) => 
                t.name.toLowerCase() === alias.toLowerCase()
              );
              if (tool) break;
            }
          }
          
          // Special case for OCM CLI (clusteradm)
          if (prereq.name === 'clusteradm' && !tool) {
            // Try alternative name formats
            tool = data.prerequisites?.find((t: PrereqToolData) => 
              t.name.toLowerCase().includes('ocm') || 
              t.name.toLowerCase().includes('cluster') ||
              t.name.toLowerCase() === 'open cluster management'
            );
          }
          
          if (!tool) {
            return {
              ...prereq,
              status: PrereqStatus.Error,
              details: 'Tool not found'
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
              details: 'Not installed'
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
                details: `Version too old. Required: ${prereq.minVersion} or higher.`
              };
            } else if (!maxVersionMet) {
              return {
                ...prereq,
                status: PrereqStatus.Warning,
                details: `Version too new. Required: up to ${prereq.maxVersion}.`
              };
            } else {
              return {
                ...prereq,
                status: PrereqStatus.Success
              };
            }
          } else {
            return {
              ...prereq,
              status: PrereqStatus.Success
            };
          }
        });
        
        setPrerequisites(updatedPrereqs);
        
        // Expand first error or warning automatically
        const firstProblem = updatedPrereqs.find(p => 
          p.status === PrereqStatus.Error || p.status === PrereqStatus.Warning
        );
        
        if (firstProblem) {
          setExpandedPrereqs([firstProblem.name]);
        }
      } catch (error) {
        console.error('Error checking prerequisites:', error);
        
        // Set all prerequisites to unknown
        setPrerequisites(prerequisites.map(prereq => ({
          ...prereq,
          status: PrereqStatus.Unknown,
          details: 'Failed to check'
        })));
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
          toast.success('KubeStellar installation detected!');
          // Update the installation step to StartUsing
          setCurrentStep('using');
          // Optionally auto-redirect to login
          // navigate('/login');
        }
      } catch (error) {
        console.error('Error checking KubeStellar status:', error);
        // Don't set error state for periodic checks
      }
    };

    // Only start the interval if we're not already checking
    if (!isChecking && !checkError) {
      intervalId = window.setInterval(checkStatus, 30000); // Check every 30 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [navigate, isChecking, checkError]);

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
      toast.error('Failed to check KubeStellar status');
    } finally {
      setIsChecking(false);
    }
  };

  // Handler for starting automatic installation
  const handleInstall = async () => {
    setIsLoading(true);
    const loadingToast = toast.loading('Preparing installation instructions...');

    try {
      // Simply move to the next step and show CLI instructions
      toast.dismiss(loadingToast);
      toast.success('Please follow the CLI installation instructions below');
      setCurrentStep('install');
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to load installation instructions');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for going to dashboard
  const goToDashboard = () => {
    navigate('/login');
  };

  // Get counts for prerequisites by status
  const getPrereqStatusCounts = () => {
    const counts = {
      success: prerequisites.filter(p => p.status === PrereqStatus.Success).length,
      warning: prerequisites.filter(p => p.status === PrereqStatus.Warning).length,
      error: prerequisites.filter(p => p.status === PrereqStatus.Error).length,
      checking: prerequisites.filter(p => p.status === PrereqStatus.Checking).length,
      total: prerequisites.length
    };
    
    return counts;
  };
  
  // Determine if installation can proceed
  const canProceed = () => {
    // Always allow proceeding if prerequisites check is skipped
    if (skipPrerequisitesCheck) return true;
    
    return prerequisites.filter(p => 
      p.category === PrereqCategory.Core && 
      p.status === PrereqStatus.Error
    ).length === 0;
  };
  
  // Get prerequisites for a specific category
  const getPrereqsByCategory = (category: PrereqCategory) => {
    return prerequisites.filter(p => p.category === category);
  };

  // Loading state while checking initial status
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950/30 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative w-60 h-60 flex items-center justify-center">
            <img 
              src="/KubeStellar.png" 
              alt="KubeStellar Logo" 
              className="object-contain max-w-full max-h-full animate-pulse"
            />
          </div>
          <div className="w-10 h-10 border-4 border-t-blue-500 border-blue-200/30 rounded-full animate-spin"></div>
          <p className="text-white text-lg">Checking KubeStellar status...</p>
        </div>
      </div>
    );
  }

  // Error state for status check
  if (checkError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950/30 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/70 backdrop-blur-md p-6 rounded-xl shadow-xl border border-slate-800/50 text-center">
          <div className="relative w-48 h-48 mx-auto mb-4">
            <img 
              src="/KubeStellar.png" 
              alt="KubeStellar Logo" 
              className="object-contain max-w-full max-h-full"
            />
          </div>
          <AlertTriangle size={40} className="text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">Status Check Failed</h2>
          <p className="text-slate-300 mb-6">
            Unable to check if KubeStellar is installed. This could be due to a connection issue or the server may be unavailable.
          </p>
          <button
            onClick={retryStatusCheck}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center mx-auto"
          >
            <RefreshCw size={16} className="mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950/30">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800/50 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center hover:opacity-90 transition-opacity">
                <img 
                  src="/KubeStellar.png" 
                  alt="KubeStellar Logo" 
                  className="h-9 w-auto"
                />
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <a
                href="https://github.com/kubestellar/kubestellar"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-300 hover:text-white flex items-center text-sm font-medium transition-colors group"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 mr-1.5 group-hover:scale-110 transition-transform" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
              <a
                href="https://docs.kubestellar.io/release-0.27.2/direct/get-started/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-300 hover:text-white flex items-center text-sm font-medium transition-colors group"
              >
                <Book size={18} className="mr-1.5 group-hover:scale-110 transition-transform" />
                Documentation
              </a>
              <a
                href="https://kubestellar.io"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all transform hover:scale-105 shadow-lg hover:shadow-indigo-500/25 flex items-center"
              >
                <Globe size={16} className="mr-1.5" />
                Learn More
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-24 px-4 pb-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 via-indigo-400 to-teal-400 bg-clip-text text-transparent">
              Welcome to KubeStellar
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Get started with KubeStellar by setting up your development environment. Follow our guided installation process to deploy your demo system.
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12"
          >
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 flex items-center">
              <div className="bg-blue-500/10 rounded-lg p-3 mr-4">
                <Server size={24} className="text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-slate-400">Prerequisites</div>
                <div className="text-2xl font-semibold text-white">
                  {getPrereqStatusCounts().success} / {getPrereqStatusCounts().total}
                </div>
              </div>
            </div>
            
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 flex items-center">
              <div className="bg-emerald-500/10 rounded-lg p-3 mr-4">
                <CheckCircle2 size={24} className="text-emerald-400" />
              </div>
              <div>
                <div className="text-sm text-slate-400">Platform</div>
                <div className="text-2xl font-semibold text-white capitalize">
                  {platform}
                </div>
              </div>
            </div>
            
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 flex items-center">
              <div className="bg-indigo-500/10 rounded-lg p-3 mr-4">
                <Zap size={24} className="text-indigo-400" />
              </div>
              <div>
                <div className="text-sm text-slate-400">Status</div>
                <div className="text-2xl font-semibold text-white">
                  {currentStep === 'prerequisites' ? 'Checking' : (currentStep === 'install' ? 'Ready' : 'Complete')}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left sidebar - make it sticky */}
            <div className="lg:sticky lg:top-24">
              <AnimatedCard delay={0.1} className="p-6">
                <SectionHeader 
                  icon={<List size={22} />} 
                  title="Installation Steps" 
                  description="Follow these steps to set up KubeStellar"
                />
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 ${currentStep === 'prerequisites' ? 'bg-blue-600' : (currentStep === 'install' || currentStep === 'using' ? 'bg-emerald-600' : 'bg-slate-700')} rounded-full h-6 w-6 flex items-center justify-center mt-0.5 mr-3`}>
                      <span className="text-white text-xs font-bold">
                        {currentStep === 'install' || currentStep === 'using' ? <CheckCircle2 size={12} /> : '1'}
                      </span>
                    </div>
                    <div>
                      <h3 className={`font-medium ${currentStep === 'prerequisites' ? 'text-white' : (currentStep === 'install' || currentStep === 'using' ? 'text-emerald-400' : 'text-slate-300')}`}>Check Prerequisites</h3>
                      <p className="text-slate-400 text-sm mt-1">
                        Ensure you have all the required tools installed
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 ${currentStep === 'install' ? 'bg-blue-600' : (currentStep === 'using' ? 'bg-emerald-600' : 'bg-slate-700')} rounded-full h-6 w-6 flex items-center justify-center mt-0.5 mr-3`}>
                      <span className="text-white text-xs font-bold">
                        {currentStep === 'using' ? <CheckCircle2 size={12} /> : '2'}
                      </span>
                    </div>
                    <div>
                      <h3 className={`font-medium ${currentStep === 'install' ? 'text-white' : (currentStep === 'using' ? 'text-emerald-400' : 'text-slate-300')}`}>Install KubeStellar</h3>
                      <p className="text-slate-400 text-sm mt-1">
                        Deploy KubeStellar using the CLI commands
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 ${currentStep === 'using' ? 'bg-blue-600' : 'bg-slate-700'} rounded-full h-6 w-6 flex items-center justify-center mt-0.5 mr-3`}>
                      <span className="text-white text-xs font-bold">3</span>
                    </div>
                    <div>
                      <h3 className={`font-medium ${currentStep === 'using' ? 'text-white' : 'text-slate-300'}`}>Start Using KubeStellar</h3>
                      <p className="text-slate-400 text-sm mt-1">
                        Log in and begin managing your clusters
                      </p>
                      {currentStep === 'using' && (
                        <button 
                          onClick={goToDashboard}
                          className="mt-2 text-xs flex items-center bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors"
                        >
                          <ArrowRight size={14} className="mr-1" />
                          Go to login page
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-800">
                  <a
                    href="https://docs.kubestellar.io/release-0.27.2/direct/pre-reqs/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-400 hover:text-blue-300 transition-colors group"
                  >
                    <ExternalLink size={16} className="mr-2 group-hover:scale-110 transition-transform" />
                    View full installation guide
                  </a>
                </div>
              </AnimatedCard>
            </div>
            
            {/* Main content area */}
            <AnimatedCard delay={0.2} className="lg:col-span-2">
              {/* Tabs */}
              <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-4">
                <div className="flex gap-3">
                  <TabButton 
                    active={activeTab === 'prerequisites'} 
                    onClick={() => {
                      setActiveTab('prerequisites');
                      setCurrentStep('prerequisites');
                    }}
                  >
                    Prerequisites
                  </TabButton>
                  <TabButton 
                    active={activeTab === 'install'} 
                    onClick={() => {
                      setActiveTab('install');
                      setCurrentStep('install');
                    }}
                  >
                    Installation
                  </TabButton>
                </div>
              </div>
              
              {/* Tab content */}
              <div className="p-6">
                {activeTab === 'prerequisites' && (
                  <div>
                    <SectionHeader 
                      icon={<Server size={22} />} 
                      title="System Prerequisites" 
                      description="Ensure these tools are installed before proceeding"
                    />
                    
                    {/* Status summary */}
                    <div className="flex flex-wrap gap-4 mb-6">
                      <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg px-4 py-3">
                        <div className="text-xs text-slate-400 mb-1">Success</div>
                        <div className="text-2xl font-semibold text-emerald-400">
                          {getPrereqStatusCounts().success} / {getPrereqStatusCounts().total}
                        </div>
                      </div>
                      
                      <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg px-4 py-3">
                        <div className="text-xs text-slate-400 mb-1">Warnings</div>
                        <div className="text-2xl font-semibold text-amber-400">
                          {getPrereqStatusCounts().warning}
                        </div>
                      </div>
                      
                      <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg px-4 py-3">
                        <div className="text-xs text-slate-400 mb-1">Missing</div>
                        <div className="text-2xl font-semibold text-rose-400">
                          {getPrereqStatusCounts().error}
                        </div>
                      </div>
                      
                      {getPrereqStatusCounts().checking > 0 && (
                        <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg px-4 py-3">
                          <div className="text-xs text-slate-400 mb-1">Checking</div>
                          <div className="text-2xl font-semibold text-blue-400">
                            {getPrereqStatusCounts().checking}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Core prerequisites */}
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-white mb-3">
                        Core Requirements
                      </h3>
                      
                      {getPrereqsByCategory(PrereqCategory.Core).map((prereq) => (
                        <PrerequisiteCard
                          key={prereq.name}
                          prerequisite={prereq}
                          onToggleExpand={togglePrereqExpanded}
                          isExpanded={expandedPrereqs.includes(prereq.name)}
                        />
                      ))}
                    </div>
                    
                    {/* Setup prerequisites */}
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-white mb-3">
                        Demo Environment Requirements
                      </h3>
                      
                      {getPrereqsByCategory(PrereqCategory.Setup).map((prereq) => (
                        <PrerequisiteCard
                          key={prereq.name}
                          prerequisite={prereq}
                          onToggleExpand={togglePrereqExpanded}
                          isExpanded={expandedPrereqs.includes(prereq.name)}
                        />
                      ))}
                    </div>
                    
                    {/* Navigation buttons */}
                    <div className="flex justify-between mt-8">
                      <button
                        onClick={() => window.location.reload()}
                        className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                      >
                        <RefreshCw size={16} className="mr-2" />
                        Refresh
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('install')}
                        disabled={!canProceed() || getPrereqStatusCounts().checking > 0}
                        className={`flex items-center px-5 py-2 rounded-lg text-white transition-colors ${
                          canProceed() && getPrereqStatusCounts().checking === 0
                            ? 'bg-blue-600 hover:bg-blue-500'
                            : 'bg-slate-700 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        Next: Installation
                        <ArrowRight size={16} className="ml-2" />
                      </button>
                    </div>
                  </div>
                )}
                
                {activeTab === 'install' && (
                  <div>
                    <SectionHeader 
                      icon={<Terminal size={22} />} 
                      title="Install KubeStellar" 
                      description="Choose your platform and run the installation script"
                    />
                    
                    {/* Platform selection */}
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-white mb-3">
                        Platform
                      </h3>
                      
                      <div className="flex flex-wrap gap-3 mb-4">
                        <button
                          onClick={() => setPlatform('kind')}
                          className={`px-4 py-2 rounded-md text-sm flex items-center ${
                            platform === 'kind' 
                              ? 'bg-blue-600 text-white font-medium' 
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          } transition-colors`}
                        >
                          <Server size={16} className="mr-2" />
                          kind
                        </button>
                        <button
                          onClick={() => setPlatform('k3d')}
                          className={`px-4 py-2 rounded-md text-sm flex items-center ${
                            platform === 'k3d' 
                              ? 'bg-blue-600 text-white font-medium' 
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          } transition-colors`}
                        >
                          <Server size={16} className="mr-2" />
                          k3d
                        </button>
                      </div>
                    </div>
                    
                    {/* Installation instructions */}
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-white mb-3">
                        Installation Script
                      </h3>
                      
                      <InstallationScript platform={platform} />
                    </div>
                    
                    {/* Navigation buttons */}
                    <div className="flex justify-between mt-8">
                      <button
                        onClick={() => setActiveTab('prerequisites')}
                        className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                      >
                        <ArrowRight size={16} className="mr-2 rotate-180" />
                        Back: Prerequisites
                      </button>
                      
                      <button
                        onClick={handleInstall}
                        disabled={isLoading}
                        className={`px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center`}
                      >
                        {isLoading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                            Installing...
                          </>
                        ) : (
                          <>
                            <Zap size={18} className="mr-2" />
                            Start Installation
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
          className="text-center mt-16 text-sm text-slate-500"
        >
          <div className="max-w-5xl mx-auto border-t border-slate-800/50 pt-8">
            <p className="mb-4">
              KubeStellar {new Date().getFullYear()} &bull; <a 
                href="https://docs.kubestellar.io" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >Documentation</a> &bull; <a 
                href="https://github.com/kubestellar/kubestellar" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >GitHub</a>
            </p>
            <p className="text-xs text-slate-600">
              KubeStellar is an open-source project. For support, feature requests, or bug reports, please visit our GitHub repository.
            </p>
          </div>
        </motion.div>

        {/* Add a notice when prerequisites check is skipped */}
        {skipPrerequisitesCheck && activeTab === 'prerequisites' && (
          <div className="max-w-5xl mx-auto mb-6">
            <div className="bg-blue-950/30 border border-blue-800/50 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Info size={20} className="text-blue-400 mr-2" />
                <h3 className="text-lg font-medium text-white">Prerequisites Check Skipped</h3>
              </div>
              <p className="text-slate-300">
                Prerequisites check has been disabled in this environment. You can proceed directly to installation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallationPage; 