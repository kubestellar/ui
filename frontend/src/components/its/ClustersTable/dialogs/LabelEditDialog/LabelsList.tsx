import React from 'react';
import { Typography, TextField, IconButton, Tooltip, Zoom } from '@mui/material';
import { Tag } from 'lucide-react';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import { ColorTheme } from '../../types';
import { LabelItem } from './types';

interface LabelsListProps {
  labels: LabelItem[];
  selectedLabelIndex: number | null;
  editingIndex: number | null;
  editingKey: string;
  editingValue: string;
  isDark: boolean;
  colors: ColorTheme;
  isLabelProtected: (key: string) => boolean;
  onLabelClick: (index: number) => void;
  onStartEdit: (index: number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onRemoveLabel: (index: number) => void;
  onEditKeyChange: (value: string) => void;
  onEditValueChange: (value: string) => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
  editKeyInputRef: React.RefObject<HTMLInputElement>;
  editValueInputRef: React.RefObject<HTMLInputElement>;
  t: (key: string, options?: Record<string, string | number>) => string;
}

export const LabelsList: React.FC<LabelsListProps> = ({
  labels,
  selectedLabelIndex,
  editingIndex,
  editingKey,
  editingValue,
  isDark,
  colors,
  isLabelProtected,
  onLabelClick,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onRemoveLabel,
  onEditKeyChange,
  onEditValueChange,
  onEditKeyDown,
  editKeyInputRef,
  editValueInputRef,
  t,
}) => {
  if (labels.length === 0) {
    return (
      <div className="mt-2 flex flex-col items-center justify-center p-6 text-center">
        <Tag size={28} style={{ color: colors.textSecondary, marginBottom: '12px' }} />
        <Typography
          variant="body2"
          style={{ color: colors.text, fontWeight: 500, marginBottom: '4px' }}
        >
          {t('clusters.labels.noLabels')}
        </Typography>
        <Typography
          variant="caption"
          style={{ color: colors.textSecondary, maxWidth: '300px', margin: '0 auto' }}
        >
          {t('clusters.labels.addYourFirst')}
        </Typography>
      </div>
    );
  }

  return (
    <div className="max-h-60 overflow-y-auto pr-1">
      <div className="space-y-2">
        {labels.map((label, index) => {
          const isProtected = isLabelProtected(label.key);
          const isEditing = editingIndex === index;

          return (
            <Zoom
              in={true}
              style={{ transitionDelay: `${index * 25}ms` }}
              key={`${label.key}-${index}`}
            >
              <div
                className={`flex items-center justify-between gap-2 rounded p-2 transition-all duration-200 ${
                  selectedLabelIndex === index ? 'ring-1' : ''
                }`}
                style={{
                  backgroundColor:
                    selectedLabelIndex === index
                      ? isDark
                        ? 'rgba(47, 134, 255, 0.2)'
                        : 'rgba(47, 134, 255, 0.1)'
                      : isEditing
                        ? isDark
                          ? 'rgba(103, 192, 115, 0.15)'
                          : 'rgba(103, 192, 115, 0.1)'
                        : isDark
                          ? 'rgba(47, 134, 255, 0.1)'
                          : 'rgba(47, 134, 255, 0.05)',
                  border: `1px solid ${
                    selectedLabelIndex === index
                      ? colors.primary
                      : isEditing
                        ? colors.success
                        : colors.border
                  }`,
                  boxShadow:
                    selectedLabelIndex === index
                      ? isDark
                        ? '0 0 0 1px rgba(47, 134, 255, 0.4)'
                        : '0 0 0 1px rgba(47, 134, 255, 0.2)'
                      : isEditing
                        ? '0 0 0 1px rgba(103, 192, 115, 0.3)'
                        : 'none',
                  cursor: isProtected ? 'default' : 'pointer',
                }}
                onClick={() => {
                  if (!isProtected && !isEditing) {
                    onLabelClick(index);
                  }
                }}
                onDoubleClick={() => {
                  if (!isProtected && !isEditing) {
                    onStartEdit(index);
                  }
                }}
              >
                <div className="flex flex-1 items-center gap-2">
                  {isProtected ? (
                    <Tooltip
                      title={
                        label.key.startsWith('cluster.open-cluster-management.io/') ||
                        label.key.startsWith('feature.open-cluster-management.io/') ||
                        label.key.startsWith('kubernetes.io/') ||
                        label.key.startsWith('k8s.io/') ||
                        label.key === 'name'
                          ? t('clusters.labels.defaultProtected')
                          : t('clusters.labels.bindingProtected')
                      }
                      placement="top"
                    >
                      <LockIcon
                        fontSize="small"
                        style={{
                          color: colors.warning,
                          fontSize: '16px',
                        }}
                      />
                    </Tooltip>
                  ) : (
                    <Tag size={16} style={{ color: colors.primary }} />
                  )}

                  {isEditing ? (
                    <div className="flex flex-1 items-center gap-2">
                      <TextField
                        value={editingKey}
                        onChange={e => onEditKeyChange(e.target.value)}
                        onKeyDown={onEditKeyDown}
                        inputRef={editKeyInputRef}
                        size="small"
                        variant="outlined"
                        placeholder={t('clusters.labels.key')}
                        style={{ minWidth: '120px' }}
                        InputProps={{
                          style: {
                            color: colors.text,
                            fontSize: '0.875rem',
                          },
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: colors.success },
                            '&:hover fieldset': { borderColor: colors.success },
                            '&.Mui-focused fieldset': { borderColor: colors.success },
                          },
                        }}
                      />
                      <span style={{ color: colors.textSecondary }}>=</span>
                      <TextField
                        value={editingValue}
                        onChange={e => onEditValueChange(e.target.value)}
                        onKeyDown={onEditKeyDown}
                        inputRef={editValueInputRef}
                        size="small"
                        variant="outlined"
                        placeholder={t('clusters.labels.value')}
                        style={{ minWidth: '120px' }}
                        InputProps={{
                          style: {
                            color: colors.text,
                            fontSize: '0.875rem',
                          },
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: colors.success },
                            '&:hover fieldset': { borderColor: colors.success },
                            '&.Mui-focused fieldset': { borderColor: colors.success },
                          },
                        }}
                      />
                    </div>
                  ) : (
                    <span style={{ color: colors.text }}>
                      <span style={{ fontWeight: 500 }}>{label.key}</span>
                      <span style={{ color: colors.textSecondary }}> = </span>
                      <span>{label.value}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <Tooltip title={t('common.save')}>
                        <IconButton
                          size="small"
                          onClick={e => {
                            e.stopPropagation();
                            onSaveEdit();
                          }}
                          style={{ color: colors.success }}
                        >
                          <SaveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('clusters.labels.cancelEdit')}>
                        <IconButton
                          size="small"
                          onClick={e => {
                            e.stopPropagation();
                            onCancelEdit();
                          }}
                          style={{ color: colors.textSecondary }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      {!isProtected && (
                        <Tooltip title={t('clusters.labels.editValue')}>
                          <IconButton
                            size="small"
                            onClick={e => {
                              e.stopPropagation();
                              onStartEdit(index);
                            }}
                            style={{
                              color: colors.textSecondary,
                              opacity: 0.7,
                              transition: 'all 0.2s ease',
                            }}
                            className="opacity-0 group-hover:opacity-100"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </IconButton>
                        </Tooltip>
                      )}
                      {!isProtected && (
                        <Tooltip title={t('clusters.labels.removeLabel')}>
                          <IconButton
                            size="small"
                            onClick={e => {
                              e.stopPropagation();
                              onRemoveLabel(index);
                            }}
                            style={{
                              color: colors.error,
                              opacity: 0.7,
                              transition: 'all 0.2s ease',
                            }}
                            className="opacity-0 group-hover:opacity-100"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Zoom>
          );
        })}
      </div>
    </div>
  );
};
