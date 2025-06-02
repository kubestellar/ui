import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Star,
  Calendar,
  Search,
  Filter,
  ExternalLink,
  AlertCircle,
  Github,
  Upload,
  FileText,
} from 'lucide-react';
import { useAvailablePlugins, useLoadPlugin, useValidatePlugin } from '../../hooks/usePlugins';
import { PluginService } from '../../services/pluginService';
import LoadingFallback from '../LoadingFallback';
import type { AvailablePlugin } from '../../types/plugin';
import { toast } from 'react-hot-toast';

// Add the PluginCard component
interface PluginCardProps {
  plugin: AvailablePlugin;
  onInstall: () => void;
  isInstalling: boolean;
  delay: number;
}

const PluginCard: React.FC<PluginCardProps> = ({ plugin, onInstall, isInstalling, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -2 }}
      className="card border border-base-300 bg-base-100 shadow-lg transition-all duration-200 hover:shadow-xl"
    >
      <div className="card-body p-6">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              {plugin.icon && <span className="text-lg">{plugin.icon}</span>}
              <h3 className="card-title text-lg font-semibold text-base-content">{plugin.name}</h3>
              {plugin.official && <span className="badge badge-primary badge-sm">Official</span>}
              {plugin.verified && <span className="badge badge-success badge-sm">Verified</span>}
            </div>
            <p className="text-sm text-base-content/70">by {plugin.author}</p>
          </div>
          <div className="flex items-center gap-1 text-warning">
            <Star className="h-4 w-4 fill-current" />
            <span className="text-sm font-medium">{plugin.stars}</span>
          </div>
        </div>

        {/* Description */}
        <p className="mb-4 line-clamp-3 text-sm text-base-content/80">{plugin.description}</p>

        {/* Tags */}
        {plugin.tags && plugin.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1">
            {plugin.tags.slice(0, 3).map(tag => (
              <span key={tag} className="badge badge-outline badge-xs">
                {tag}
              </span>
            ))}
            {plugin.tags.length > 3 && (
              <span className="badge badge-outline badge-xs">+{plugin.tags.length - 3} more</span>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-base-content/60">
            <Calendar className="h-3 w-3" />
            <span>Updated {new Date(plugin.last_updated).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-base-content/60">
            <span className="badge badge-outline badge-xs">v{plugin.latest_version}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="card-actions items-center justify-between">
          <a
            href={plugin.repository}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
          >
            <ExternalLink className="h-3 w-3" />
            View Source
          </a>

          <button className="btn btn-primary btn-sm" onClick={onInstall} disabled={isInstalling}>
            {isInstalling ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>
                <Download className="h-3 w-3" />
                Install
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const PluginStore: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stars' | 'updated'>('stars');
  const [customSource, setCustomSource] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const { data: availablePlugins, isLoading, error } = useAvailablePlugins();
  const loadPlugin = useLoadPlugin();
  const validatePlugin = useValidatePlugin();

  const filteredPlugins =
    availablePlugins
      ?.filter(
        plugin =>
          plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          plugin.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          plugin.author.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'stars':
            return b.stars - a.stars;
          case 'updated':
            return new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime();
          default:
            return 0;
        }
      }) || [];

  const handleInstallPlugin = async (plugin: AvailablePlugin) => {
    try {
      await loadPlugin.mutateAsync({
        source: plugin.repository,
        version: plugin.latest_version,
      });
    } catch (error) {
      console.error('Failed to install plugin:', error);
    }
  };

  const handleInstallFromGitHub = async () => {
    if (!customSource.trim()) return;

    try {
      await loadPlugin.mutateAsync({
        source: customSource.trim(),
      });
      setCustomSource('');
      setShowCustomForm(false);
      toast.success('Plugin installed successfully from GitHub!');
    } catch (error) {
      console.error('Failed to install custom plugin:', error);
      toast.error('Failed to install plugin from GitHub');
    }
  };

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.zip')) {
        setSelectedFiles(files);
        toast.success(`Selected ZIP file: ${file.name}`);
      } else {
        toast.error('Please select a ZIP file containing the plugin folder');
      }
    }
  };

  const handleInstallFromFile = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error('Please select a ZIP file to upload');
      return;
    }

    try {
      const file = selectedFiles[0];

      if (!file.name.endsWith('.zip')) {
        toast.error('Please select a ZIP file containing the plugin folder');
        return;
      }

      const uploadResult = await PluginService.uploadPluginZip(file);

      if (uploadResult.validation?.valid) {
        await PluginService.installUploadedPlugin(uploadResult.upload_id);
        toast.success('Plugin installed successfully from ZIP!');
      } else {
        toast.error(`Upload validation failed: ${uploadResult.validation?.errors?.join(', ')}`);
      }

      setSelectedFiles(null);
      setShowFileUpload(false);
      setShowCustomForm(false);
    } catch (error) {
      console.error('Failed to install plugin from ZIP:', error);
      toast.error('Failed to install plugin from ZIP');
    }
  };

  const handleValidateCustom = async () => {
    if (!customSource.trim()) return;

    try {
      await validatePlugin.mutateAsync(customSource.trim());
    } catch (error) {
      console.error('Failed to validate plugin:', error);
    }
  };

  if (isLoading) {
    return <LoadingFallback message="Loading plugin store..." size="medium" />;
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <AlertCircle className="h-6 w-6" />
        <span>Failed to load plugin store: {error.message}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col justify-between gap-4 sm:flex-row"
      >
        <div className="flex flex-1 flex-col gap-4 sm:flex-row">
          {/* Search */}
          <div className="form-control flex-1">
            <div className="input-group">
              <span className="bg-base-200">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search plugins..."
                className="input input-bordered flex-1"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Sort */}
          <div className="form-control">
            <div className="input-group">
              <span className="bg-base-200">
                <Filter className="h-4 w-4" />
              </span>
              <select
                className="select select-bordered"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'stars' | 'updated' | 'name')}
              >
                <option value="stars">Most Popular</option>
                <option value="updated">Recently Updated</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* Installation Buttons */}
        <div className="flex gap-2">
          <button
            className="btn btn-outline"
            onClick={() => {
              setShowFileUpload(!showFileUpload);
              setShowCustomForm(false);
            }}
          >
            <Upload className="h-4 w-4" />
            Install from ZIP File
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowCustomForm(!showCustomForm);
              setShowFileUpload(false);
            }}
          >
            <Github className="h-4 w-4" />
            Install from GitHub
          </button>
        </div>
      </motion.div>

      {/* Custom Installation Form */}
      {showCustomForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="card border border-base-300 bg-base-100 shadow-lg"
        >
          <div className="card-body">
            <>
              <h3 className="card-title flex items-center gap-2">
                <Github className="h-5 w-5" />
                Install Plugin from GitHub
              </h3>
              <p className="mb-4 text-sm text-base-content/70">
                Install a plugin directly from a GitHub repository. The system will automatically
                clone, build, and load the plugin.
              </p>

              {/* How it works info */}
              <div className="mb-4 rounded-lg bg-success/10 p-3">
                <h4 className="mb-2 font-medium text-success">How it works:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• 📥 Clone the repository</li>
                  <li>
                    • 🔨 Build the plugin using <code>go build -buildmode=plugin</code>
                  </li>
                  <li>• 🚀 Load and register the plugin automatically</li>
                </ul>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">GitHub Repository URL</span>
                </label>
                <input
                  type="text"
                  placeholder="https://github.com/your-username/kubestellar-cluster-plugin"
                  className="input input-bordered"
                  value={customSource}
                  onChange={e => setCustomSource(e.target.value)}
                />
                <div className="label">
                  <span className="label-text-alt">
                    Try: https://github.com/your-username/kubestellar-cluster-plugin
                  </span>
                </div>
              </div>

              <div className="card-actions mt-4 justify-end">
                <button className="btn btn-ghost" onClick={() => setShowCustomForm(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-outline"
                  onClick={handleValidateCustom}
                  disabled={!customSource.trim() || validatePlugin.isPending}
                >
                  {validatePlugin.isPending ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    'Validate'
                  )}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleInstallFromGitHub}
                  disabled={!customSource.trim() || loadPlugin.isPending}
                >
                  {loadPlugin.isPending ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    'Install'
                  )}
                </button>
              </div>
            </>
          </div>
        </motion.div>
      )}

      {/* File Upload Form */}
      {showFileUpload && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="card border border-base-300 bg-base-100 shadow-lg"
        >
          <div className="card-body">
            <>
              <h3 className="card-title flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Install Plugin from ZIP Folder
              </h3>
              <p className="mb-4 text-sm text-base-content/70">
                Upload a ZIP file containing your complete plugin folder (like cluster-ops.zip).
              </p>

              {/* How it works info */}
              <div className="mb-4 rounded-lg bg-info/10 p-3">
                <h4 className="mb-2 font-medium text-info">How to prepare your plugin:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• 📁 Create a folder with your plugin (e.g., cluster-ops/)</li>
                  <li>
                    • 📄 Include <code>main.go</code> and <code>plugin.yaml</code>
                  </li>
                  <li>• 🗜️ Compress the folder into a ZIP file</li>
                  <li>• 📤 Upload the ZIP file here</li>
                </ul>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Plugin ZIP File</span>
                </label>
                <input
                  type="file"
                  accept=".zip"
                  className="file-input file-input-bordered w-full"
                  onChange={handleFolderUpload}
                />
                <div className="label">
                  <span className="label-text-alt">
                    Select a ZIP file containing your plugin folder
                  </span>
                </div>
              </div>

              {/* Selected File Info */}
              {selectedFiles && selectedFiles.length > 0 && (
                <div className="mt-4">
                  <div className="rounded bg-success/10 p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium text-success">
                        {selectedFiles[0].name}
                      </span>
                      <span className="text-xs text-success/70">
                        ({(selectedFiles[0].size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="card-actions mt-4 justify-end">
                <button className="btn btn-ghost" onClick={() => setShowFileUpload(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleInstallFromFile}
                  disabled={!selectedFiles || selectedFiles.length === 0 || loadPlugin.isPending}
                >
                  {loadPlugin.isPending ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Installing...
                    </>
                  ) : (
                    'Install from ZIP'
                  )}
                </button>
              </div>
            </>
          </div>
        </motion.div>
      )}

      {/* Plugin Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {filteredPlugins.map((plugin, index) => (
          <PluginCard
            key={plugin.id}
            plugin={plugin}
            onInstall={() => handleInstallPlugin(plugin)}
            isInstalling={loadPlugin.isPending}
            delay={index * 0.1}
          />
        ))}
      </motion.div>

      {filteredPlugins.length === 0 && (
        <div className="py-12 text-center">
          <div className="mb-4 text-6xl">🔍</div>
          <h3 className="mb-2 text-lg font-medium text-base-content">No plugins found</h3>
          <p className="text-base-content/70">
            Try adjusting your search or browse all available plugins.
          </p>
        </div>
      )}
    </div>
  );
};

export default PluginStore;
