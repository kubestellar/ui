import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiXMark,
  HiShieldCheck,
  HiExclamationTriangle,
  HiInformationCircle,
  HiClock,
} from 'react-icons/hi2';
import { PluginAPI } from '../../plugins/PluginAPI';
import SecurityBadge from './SecurityBadge';

interface SecurityScanModalProps {
  pluginId: string;
  pluginName: string;
  isOpen: boolean;
  onClose: () => void;
  themeStyles: {
    effects: { glassMorphism: { background: string } };
    card: { borderColor: string };
    colors: {
      bg: { secondary: string };
      brand: { primary: string };
      text: { primary: string; secondary: string };
    };
  };
}

interface SecurityScanResult {
  safe: boolean;
  score: number;
  issues: SecurityIssue[];
  warnings: SecurityWarning[];
  checksum: string;
  scanTime: string;
  scanDuration: string;
  fileAnalysis: Record<string, FileAnalysis>;
  overallRisk: string;
  recommendation: string;
  galaxySafe: boolean;
}

interface SecurityIssue {
  type: string;
  severity: string;
  description: string;
  file?: string;
  line?: number;
  code?: string;
}

interface SecurityWarning {
  type: string;
  description: string;
  file?: string;
  line?: number;
  code?: string;
}

interface FileAnalysis {
  fileType: string;
  size: number;
  checksum: string;
  issues: string[];
  warnings: string[];
  permissions?: string;
}

export const SecurityScanModal: React.FC<SecurityScanModalProps> = ({
  pluginId,
  pluginName,
  isOpen,
  onClose,
  themeStyles,
}) => {
  const [scanResult, setScanResult] = useState<SecurityScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pluginAPI] = useState(() => new PluginAPI());

  useEffect(() => {
    if (isOpen && pluginId) {
      performSecurityScan();
    }
  }, [isOpen, pluginId]);

  const performSecurityScan = async () => {
    setLoading(true);
    setError(null);
    setScanResult(null);

    try {
      const response = await pluginAPI.scanPluginSecurity(pluginId);
      setScanResult(response.scanResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform security scan');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl"
          style={{
            background: themeStyles.effects.glassMorphism.background,
            border: `1px solid ${themeStyles.card.borderColor}`,
          }}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b p-6"
            style={{ borderColor: themeStyles.card.borderColor }}
          >
            <div className="flex items-center gap-3">
              <div
                className="rounded-lg p-2"
                style={{ background: themeStyles.colors.bg.secondary }}
              >
                <HiShieldCheck
                  className="h-6 w-6"
                  style={{ color: themeStyles.colors.brand.primary }}
                />
              </div>
              <div>
                <h2
                  className="text-xl font-semibold"
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  Security Scan Results
                </h2>
                <p style={{ color: themeStyles.colors.text.secondary }}>{pluginName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 transition-colors hover:bg-opacity-10"
              style={{ color: themeStyles.colors.text.secondary }}
            >
              <HiXMark className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                  <HiClock className="h-6 w-6 animate-spin" />
                  <span style={{ color: themeStyles.colors.text.primary }}>
                    Performing security scan...
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-100 p-4">
                <HiExclamationTriangle className="h-5 w-5 text-red-600" />
                <span className="text-red-800">{error}</span>
              </div>
            )}

            {scanResult && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div
                    className="rounded-lg border p-4"
                    style={{ borderColor: themeStyles.card.borderColor }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <HiShieldCheck className="h-5 w-5 text-green-600" />
                      <span
                        className="font-medium"
                        style={{ color: themeStyles.colors.text.primary }}
                      >
                        Security Score
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">{scanResult.score}/100</div>
                  </div>

                  <div
                    className="rounded-lg border p-4"
                    style={{ borderColor: themeStyles.card.borderColor }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <HiExclamationTriangle className="h-5 w-5 text-orange-600" />
                      <span
                        className="font-medium"
                        style={{ color: themeStyles.colors.text.primary }}
                      >
                        Issues Found
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      {scanResult.issues.length}
                    </div>
                  </div>

                  <div
                    className="rounded-lg border p-4"
                    style={{ borderColor: themeStyles.card.borderColor }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <HiInformationCircle className="h-5 w-5 text-blue-600" />
                      <span
                        className="font-medium"
                        style={{ color: themeStyles.colors.text.primary }}
                      >
                        Warnings
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {scanResult.warnings.length}
                    </div>
                  </div>
                </div>

                {/* Security Badge */}
                <div className="flex items-center gap-3">
                  <span className="font-medium" style={{ color: themeStyles.colors.text.primary }}>
                    Status:
                  </span>
                  <SecurityBadge
                    galaxySafe={scanResult.galaxySafe}
                    securityScore={scanResult.score}
                    riskLevel={scanResult.overallRisk}
                    securityStatus={scanResult.safe ? 'safe' : 'unsafe'}
                  />
                </div>

                {/* Recommendation */}
                <div
                  className="rounded-lg border p-4"
                  style={{ borderColor: themeStyles.card.borderColor }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <HiInformationCircle className="h-5 w-5 text-blue-600" />
                    <span
                      className="font-medium"
                      style={{ color: themeStyles.colors.text.primary }}
                    >
                      Recommendation
                    </span>
                  </div>
                  <p style={{ color: themeStyles.colors.text.secondary }}>
                    {scanResult.recommendation}
                  </p>
                </div>

                {/* Issues */}
                {scanResult.issues.length > 0 && (
                  <div>
                    <h3
                      className="mb-3 text-lg font-semibold"
                      style={{ color: themeStyles.colors.text.primary }}
                    >
                      Security Issues
                    </h3>
                    <div className="space-y-3">
                      {scanResult.issues.map((issue, index) => (
                        <div
                          key={index}
                          className={`rounded-lg border p-3 ${getSeverityColor(issue.severity)}`}
                        >
                          <div className="flex items-start gap-2">
                            <HiExclamationTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <span className="font-medium">{issue.type}</span>
                                <span className="rounded-full bg-white bg-opacity-50 px-2 py-1 text-xs">
                                  {issue.severity}
                                </span>
                              </div>
                              <p className="text-sm">{issue.description}</p>
                              {issue.file && (
                                <p className="mt-1 text-xs opacity-75">
                                  File: {issue.file}
                                  {issue.line && ` (line ${issue.line})`}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {scanResult.warnings.length > 0 && (
                  <div>
                    <h3
                      className="mb-3 text-lg font-semibold"
                      style={{ color: themeStyles.colors.text.primary }}
                    >
                      Warnings
                    </h3>
                    <div className="space-y-3">
                      {scanResult.warnings.map((warning, index) => (
                        <div
                          key={index}
                          className="rounded-lg border border-yellow-200 bg-yellow-50 p-3"
                        >
                          <div className="flex items-start gap-2">
                            <HiInformationCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
                            <div className="flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <span className="font-medium text-yellow-800">{warning.type}</span>
                              </div>
                              <p className="text-sm text-yellow-800">{warning.description}</p>
                              {warning.file && (
                                <p className="mt-1 text-xs text-yellow-700 opacity-75">
                                  File: {warning.file}
                                  {warning.line && ` (line ${warning.line})`}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* File Analysis */}
                {Object.keys(scanResult.fileAnalysis).length > 0 && (
                  <div>
                    <h3
                      className="mb-3 text-lg font-semibold"
                      style={{ color: themeStyles.colors.text.primary }}
                    >
                      File Analysis
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(scanResult.fileAnalysis).map(([file, analysis]) => (
                        <div
                          key={file}
                          className="rounded-lg border p-3"
                          style={{ borderColor: themeStyles.card.borderColor }}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span
                              className="font-medium"
                              style={{ color: themeStyles.colors.text.primary }}
                            >
                              {file}
                            </span>
                            <div className="flex items-center gap-2 text-sm">
                              <span style={{ color: themeStyles.colors.text.secondary }}>
                                {analysis.fileType}
                              </span>
                              <span style={{ color: themeStyles.colors.text.secondary }}>
                                {formatFileSize(analysis.size)}
                              </span>
                            </div>
                          </div>
                          {(analysis.issues.length > 0 || analysis.warnings.length > 0) && (
                            <div className="space-y-1">
                              {analysis.issues.map((issue, index) => (
                                <div key={index} className="text-sm text-red-600">
                                  • {issue}
                                </div>
                              ))}
                              {analysis.warnings.map((warning, index) => (
                                <div key={index} className="text-sm text-yellow-600">
                                  • {warning}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scan Details */}
                <div
                  className="rounded-lg border p-4 text-sm"
                  style={{ borderColor: themeStyles.card.borderColor }}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span style={{ color: themeStyles.colors.text.secondary }}>Scan Time:</span>
                      <span className="ml-2" style={{ color: themeStyles.colors.text.primary }}>
                        {new Date(scanResult.scanTime).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: themeStyles.colors.text.secondary }}>Duration:</span>
                      <span className="ml-2" style={{ color: themeStyles.colors.text.primary }}>
                        {scanResult.scanDuration}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: themeStyles.colors.text.secondary }}>Checksum:</span>
                      <span
                        className="ml-2 font-mono text-xs"
                        style={{ color: themeStyles.colors.text.primary }}
                      >
                        {scanResult.checksum.substring(0, 16)}...
                      </span>
                    </div>
                    <div>
                      <span style={{ color: themeStyles.colors.text.secondary }}>Risk Level:</span>
                      <span
                        className="ml-2 capitalize"
                        style={{ color: themeStyles.colors.text.primary }}
                      >
                        {scanResult.overallRisk}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-3 border-t p-6"
            style={{ borderColor: themeStyles.card.borderColor }}
          >
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 transition-colors"
              style={{
                background: themeStyles.colors.bg.secondary,
                color: themeStyles.colors.text.primary,
              }}
            >
              Close
            </button>
            {scanResult && (
              <button
                onClick={performSecurityScan}
                className="flex items-center gap-2 rounded-lg px-4 py-2 transition-colors"
                style={{
                  background: themeStyles.colors.brand.primary,
                  color: 'white',
                }}
              >
                <HiClock className="h-4 w-4" />
                Rescan
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SecurityScanModal;
