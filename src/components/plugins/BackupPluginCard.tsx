import { useState, useEffect } from 'react';
import {
  Archive,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  ChevronRight,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { PluginStatusBadge } from './PluginStatusBadge.tsx';
import { Dialog } from '../ui/dialog';
import { Switch } from '@mui/material';

// Define API error interface
interface ApiError {
  response?: {
    status: number;
    data?: unknown;
  };
  message?: string;
}

interface Plugin {
  name: string;
  version: string;
  type: 'static' | 'dynamic';
  status: 'active' | 'failed' | 'error' | 'idle';
  lastUpdated?: string;
  enabled: number;
}

interface BackupDetails {
  lastRun: string;
  nextScheduled: string;
  backupCount: number;
  status: 'success' | 'failed' | 'idle' | 'active' | 'running';
  jobStatus: 'running' | 'completed' | 'failed' | 'idle';
  lastError: string;
  errorCount: number;
  successCount: number;
  locations: string[];
}

interface PluginDetailedStatus {
  status: string;
  lastError: string;
  lastRun: string;
  jobStatus: string;
  errorCount: number;
  successCount: number;
}

interface BackupPluginCardProps {
  plugin: Plugin;
}

export default function BackupPluginCard({ plugin }: BackupPluginCardProps) {
  const [backupDetails, setBackupDetails] = useState<BackupDetails | null>(null);
  const [pluginStatus, setPluginStatus] = useState<PluginDetailedStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<boolean>(false);
  const [isEnabled, setIsEnabled] = useState<boolean>(true); // Always start enabled
  const [isTogglingEnabled, setIsTogglingEnabled] = useState<boolean>(false);

  // Update this useEffect to enable the plugin on component mount
  useEffect(() => {
    fetchBackupDetails();
    fetchPluginStatus();
    
    // Enable the plugin if it's not already enabled
    const enablePluginOnMount = async () => {
      if (plugin.enabled !== 1) {
        try {
          setIsTogglingEnabled(true);
          await api.post(`/api/plugins/backup/enable`, {
            enabled: 1
          });
          // No need to setIsEnabled(true) here as it's already true by default
          toast.success("Backup service enabled automatically");
        } catch (error) {
          console.error('Failed to auto-enable backup service:', error);
          // Only update state if the automatic enabling fails
          setIsEnabled(false);
        } finally {
          setIsTogglingEnabled(false);
        }
      }
    };
    
    enablePluginOnMount();
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      if (!isLoading && !retrying) {
        fetchBackupDetails();
        fetchPluginStatus();
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Add this new useEffect to sync the enabled state when backupDetails changes
  useEffect(() => {
    // Update the isEnabled state based on the status from the API
    if (backupDetails) {
      setIsEnabled(backupDetails.status === 'active');
    }
  }, [backupDetails]);

  const fetchPluginStatus = async () => {
    try {
      // Use the correct plugin name from the plugin prop
      const response = await api.get(`/api/plugins/${plugin.name}/status`);
      setPluginStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch plugin status:', error);
      // Set default status if API fails
      setPluginStatus({
        status: 'idle',
        lastError: '',
        lastRun: new Date().toISOString(),
        jobStatus: 'idle',
        errorCount: 0,
        successCount: 0,
      });
    }
  };

  const fetchBackupDetails = async () => {
    setIsLoading(true);
    setApiError(null);

    try {
      // Directly make the API call without checking availability first
      const response = await api.get(`/api/plugins/backup/status`);
      setBackupDetails(response.data);
    } catch (error: unknown) {
      console.error('Failed to fetch backup details:', error);
      let errorMessage = 'Failed to fetch backup details';

      const apiError = error as ApiError;
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        apiError.response &&
        typeof apiError.response === 'object' &&
        'status' in apiError.response &&
        apiError.response.status === 404
      ) {
        errorMessage = 'API endpoint not found. The backup service may not be configured properly.';
      }

      setApiError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setRetrying(false);
    }
  };

  const triggerBackup = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      await api.post(`/api/plugins/backup/trigger`);
      toast.success('Backup triggered successfully');
      fetchBackupDetails();
    } catch (error: unknown) {
      console.error('Failed to trigger backup:', error);
      let errorMessage = 'Failed to trigger backup';

      const apiError = error as ApiError;
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        apiError.response &&
        typeof apiError.response === 'object' &&
        'status' in apiError.response &&
        apiError.response.status === 404
      ) {
        errorMessage =
          'Backup trigger endpoint not found. The backup service may not be configured properly.';
      }

      setApiError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhance the handleToggleEnabled function with better feedback
  const handleToggleEnabled = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newEnabledState = event.target.checked;
    setIsTogglingEnabled(true);

    try {
      // Show loading toast for better UX
      const toastId = toast.loading(`${newEnabledState ? 'Enabling' : 'Disabling'} backup service...`);
      
      await api.post(`/api/plugins/backup/enable`, {
        enabled: newEnabledState ? 1 : 0,
      });

      setIsEnabled(newEnabledState);
      
      // Update toast to success
      toast.success(`Backup ${newEnabledState ? 'enabled' : 'disabled'} successfully`, {
        id: toastId
      });
      
      // Refresh data to get updated status
      fetchBackupDetails();
    } catch (error) {
      console.error('Failed to update backup enabled state:', error);
      toast.error(`Failed to ${newEnabledState ? 'enable' : 'disable'} backup service`);

      // Revert UI state on error
      setIsEnabled(!newEnabledState);
    } finally {
      setIsTogglingEnabled(false);
    }
  };

  const getStatusDisplay = () => {
    if (isLoading) return { text: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    
    // Use plugin status if backup details are not available
    const statusSource = backupDetails || pluginStatus;
    
    if (statusSource?.lastError) {
      return { 
        text: 'Failed', 
        color: 'text-red-600', 
        bgColor: 'bg-red-100',
        details: statusSource.lastError 
      };
    }
    
    const status = backupDetails?.status || pluginStatus?.status;
    switch (status) {
      case 'running':
        return { text: 'Running', color: 'text-blue-600', bgColor: 'bg-blue-100' };
      case 'success':
      case 'active':
        return { text: 'Successful', color: 'text-green-600', bgColor: 'bg-green-100' };
      case 'failed':
        return { text: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100' };
      default:
        return { text: 'Idle', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  const statusDisplay = getStatusDisplay();
  
  // Combine data from both sources for display
  const displayData = {
    lastRun: backupDetails?.lastRun || pluginStatus?.lastRun,
    lastError: backupDetails?.lastError || pluginStatus?.lastError,
    errorCount: backupDetails?.errorCount || pluginStatus?.errorCount || 0,
    successCount: backupDetails?.successCount || pluginStatus?.successCount || 0,
    jobStatus: backupDetails?.jobStatus || pluginStatus?.jobStatus,
    status: backupDetails?.status || pluginStatus?.status,
  };

  return (
    <div className="group relative space-y-4 overflow-hidden p-4 transition-all duration-300 hover:shadow-xl">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      {/* Header Section with enhanced styling */}
      <div className="relative flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/80 p-2.5 shadow-sm transition-all duration-300 group-hover:shadow-md dark:from-blue-900/20 dark:to-blue-800/20">
            <Archive
              className="transform text-blue-600 transition-transform duration-300 group-hover:scale-110 dark:text-blue-400"
              size={24}
            />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-900 transition-colors duration-300 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
              {plugin.name}
            </h3>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-gradient-to-r from-blue-50 to-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:from-blue-900/20 dark:to-blue-800/20 dark:text-blue-300">
                v{plugin.version}
              </span>
              <PluginStatusBadge status={plugin.status} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100/50 p-3 dark:from-gray-800/50 dark:to-gray-900/50">
        {apiError && (
          <div className="col-span-2 rounded-md bg-red-50 p-2 dark:bg-red-900/20">
            <p className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle size={12} />
              {apiError}
              <button
                onClick={() => {
                  setRetrying(true);
                  fetchBackupDetails();
                }}
                className="ml-auto rounded-md bg-red-100 p-1 text-red-600 hover:bg-red-200 dark:bg-red-800/30 dark:text-red-300"
                disabled={retrying}
              >
                <RefreshCw size={12} className={retrying ? 'animate-spin' : ''} />
              </button>
            </p>
          </div>
        )}

        {/* Enhanced error display */}
        {displayData.lastError && (
          <div className="col-span-2 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-red-600 dark:text-red-400">Last Error:</p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">{displayData.lastError}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-red-600 dark:text-red-400">
                  <span>Errors: {displayData.errorCount}</span>
                  <span>Success: {displayData.successCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">Last Backup</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {displayData.lastRun
              ? new Date(displayData.lastRun).toLocaleString()
              : 'No backups yet'}
          </p>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusDisplay.bgColor} ${statusDisplay.color}`}>
              {statusDisplay.text}
            </span>
            {displayData.jobStatus === 'running' && (
              <Loader2 size={12} className="animate-spin text-blue-500" />
            )}
          </div>
          {statusDisplay.details && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {statusDisplay.details}
            </p>
          )}
        </div>

        {/* Plugin Statistics */}
        {(displayData.errorCount > 0 || displayData.successCount > 0) && (
          <div className="col-span-2 grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-600">
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Success Rate</p>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                {displayData.successCount}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Failed Jobs</p>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {displayData.errorCount}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons with enhanced styling */}
      <div className="space-y-3">
        <button
          onClick={triggerBackup}
          disabled={isLoading}
          className={`relative flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 
            ${
              isLoading
                ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                : apiError
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-400 hover:to-orange-500'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600'
            } transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Backing up...
            </>
          ) : (
            <>
              <Archive size={16} />
              {apiError ? 'Retry Backup' : 'Start Backup'}
            </>
          )}
        </button>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex w-full items-center justify-between rounded-lg bg-gradient-to-r 
                   from-blue-100 to-blue-50 px-4 py-2.5 
                   text-blue-700 transition-all 
                   duration-300 hover:from-blue-200 hover:to-blue-100
                   hover:shadow-md
                   dark:from-blue-900/20 dark:to-blue-800/20 dark:text-blue-300"
        >
          <div className="flex items-center gap-2">
            <Settings size={16} />
            <span>Settings</span>
          </div>
          <ChevronRight
            size={16}
            className="transform transition-transform group-hover:translate-x-1"
          />
        </button>
      </div>

      {/* Enhanced Recent Activity Panel */}
      <div className="mt-4 space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
          Recent Activity
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            Live Status
          </span>
        </h4>
        <div className="space-y-2">
          {/* Real-time status based on actual data */}
          {displayData.jobStatus === 'running' && (
            <div className="flex items-start gap-3 rounded-lg bg-gradient-to-r from-blue-50 to-transparent p-3 transition-colors duration-300 hover:from-blue-100 dark:from-blue-800/50 dark:to-transparent dark:hover:from-blue-700/50">
              <Loader2 size={14} className="mt-0.5 text-blue-500 animate-spin" />
              <div className="flex-1">
                <p className="text-gray-700 dark:text-gray-300">Backup job currently running</p>
                <span className="text-xs text-gray-500 dark:text-gray-400">In progress...</span>
              </div>
            </div>
          )}
          
          {displayData.lastError && (
            <div className="flex items-start gap-3 rounded-lg bg-gradient-to-r from-red-50 to-transparent p-3 transition-colors duration-300 hover:from-red-100 dark:from-red-800/50 dark:to-transparent dark:hover:from-red-700/50">
              <AlertCircle size={14} className="mt-0.5 text-red-500" />
              <div className="flex-1">
                <p className="text-gray-700 dark:text-gray-300">Last backup failed</p>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {displayData.lastRun ? new Date(displayData.lastRun).toLocaleString() : 'Unknown'}
                </span>
              </div>
            </div>
          )}

          {displayData.status === 'success' && !displayData.lastError && (
            <div className="flex items-start gap-3 rounded-lg bg-gradient-to-r from-green-50 to-transparent p-3 transition-colors duration-300 hover:from-green-100 dark:from-green-800/50 dark:to-transparent dark:hover:from-green-700/50">
              <CheckCircle size={14} className="mt-0.5 text-green-500" />
              <div className="flex-1">
                <p className="text-gray-700 dark:text-gray-300">Backup completed successfully</p>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {displayData.lastRun ? new Date(displayData.lastRun).toLocaleString() : 'Recently'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Dialog - Fixed styling for better contrast in light mode */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {plugin.name} Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            </div>
            {/* Settings content can be added here */}
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Configure the backup settings for the {plugin.name} plugin.
              </p>
              <div className="flex items-center justify-between rounded-md bg-gray-50 p-3 dark:bg-gray-700">
                <span className="text-sm text-gray-700 dark:text-gray-300">Enable Backup</span>
                <div className="relative">
                  {isTogglingEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 size={16} className="animate-spin text-blue-500" />
                    </div>
                  )}
                  <Switch
                    checked={isEnabled}
                    onChange={handleToggleEnabled}
                    disabled={isTogglingEnabled}
                    className={`h-6 w-11 rounded-full ${
                      isTogglingEnabled ? 'opacity-50' : ''
                    } bg-gray-200 dark:bg-gray-600`}
                    inputProps={{ 'aria-label': 'Enable or disable backup' }}
                    color="primary"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Backup Locations
                </label>
                <input
                  type="text"
                  value={backupDetails?.locations.join(', ') || ''}
                  onChange={e =>
                    setBackupDetails({
                      ...backupDetails!,
                      locations: e.target.value.split(',').map(loc => loc.trim()),
                    })
                  }
                  className="block w-full rounded-md border border-gray-300 bg-gray-50 p-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter backup locations"
                />
              </div>
              <div className="flex items-center justify-between rounded-md bg-gray-50 p-3 dark:bg-gray-700">
                <span className="text-sm text-gray-700 dark:text-gray-300">Backup Status</span>
                <span className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${
                  backupDetails?.status === 'success' || backupDetails?.status === 'active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : backupDetails?.status === 'failed'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                }`}>
                  {backupDetails?.status === 'success' || backupDetails?.status === 'active'
                    ? 'Backup Successful'
                    : backupDetails?.status === 'failed'
                      ? 'Backup Failed'
                      : 'Idle'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
