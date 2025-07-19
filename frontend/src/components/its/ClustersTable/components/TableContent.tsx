import {
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  Paper,
  Fade,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ColorTheme, ManagedClusterInfo } from '../types';
import StatusBadge from './StatusBadge';
import LabelChip from './LabelChip';
import { ActionButton } from './ActionMenu';
import EmptyState from './EmptyState';

interface TableContentProps {
  clusters: ManagedClusterInfo[];
  selectedClusters: string[];
  selectAll: boolean;
  onSelectAll: () => void;
  onCheckboxChange: (clusterName: string) => void;
  onActionsClick: (event: React.MouseEvent<HTMLButtonElement>, clusterName: string) => void;
  onFilterByLabel: (key: string, value: string) => void;
  filterByLabel: Array<{ key: string; value: string }>;
  query: string;
  filter: string;
  onClearQuery: () => void;
  onClearFilter: () => void;
  onShowCreateOptions: () => void;
  isDark: boolean;
  colors: ColorTheme;
}

const TableContent: React.FC<TableContentProps> = ({
  clusters,
  selectedClusters,
  selectAll,
  onSelectAll,
  onCheckboxChange,
  onActionsClick,
  onFilterByLabel,
  filterByLabel,
  query,
  filter,
  onClearQuery,
  onClearFilter,
  onShowCreateOptions,
  isDark,
  colors,
}) => {
  const { t } = useTranslation();

  if (clusters.length === 0) {
    return (
      <EmptyState
        query={query}
        filter={filter}
        onClearQuery={onClearQuery}
        onClearFilter={onClearFilter}
        onShowCreateOptions={onShowCreateOptions}
        isDark={isDark}
        colors={colors}
      />
    );
  }

  return (
    <TableContainer
      component={Paper}
      className="overflow-auto"
      sx={{
        backgroundColor: colors.paper,
        boxShadow: isDark
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
      }}
    >
      <Table>
        <TableHead>
          <TableRow
            sx={{
              background: colors.primary,
              '& .MuiTableCell-head': {
                color: colors.white,
                fontWeight: 600,
                padding: '16px',
                fontSize: '0.95rem',
              },
            }}
          >
            <TableCell>
              <Checkbox
                checked={selectAll}
                onChange={onSelectAll}
                sx={{
                  color: colors.white,
                  '&.Mui-checked': { color: colors.white },
                }}
              />
            </TableCell>
            <TableCell>{t('clusters.table.name')}</TableCell>
            <TableCell>{t('clusters.table.labels')}</TableCell>
            <TableCell>{t('clusters.table.creationTime')}</TableCell>
            <TableCell>{t('clusters.table.context')}</TableCell>
            <TableCell>{t('clusters.table.status')}</TableCell>
            <TableCell>{t('clusters.table.actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {clusters.map((cluster, index) => (
            <Fade in={true} timeout={100 + index * 50} key={cluster.name}>
              <TableRow
                sx={{
                  backgroundColor: colors.paper,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: isDark
                      ? 'rgba(47, 134, 255, 0.08)'
                      : 'rgba(47, 134, 255, 0.04)',
                    transform: 'translateY(-2px)',
                    boxShadow: isDark
                      ? '0 4px 8px -2px rgba(0, 0, 0, 0.2)'
                      : '0 4px 8px -2px rgba(0, 0, 0, 0.1)',
                  },
                  '& .MuiTableCell-body': {
                    color: colors.text,
                    borderColor: colors.border,
                    padding: '16px',
                    fontSize: '0.95rem',
                  },
                  position: 'relative',
                  '&::after': selectedClusters.includes(cluster.name)
                    ? {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: '3px',
                        backgroundColor: colors.primary,
                        borderTopLeftRadius: '4px',
                        borderBottomLeftRadius: '4px',
                      }
                    : {},
                }}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedClusters.includes(cluster.name)}
                    onChange={() => onCheckboxChange(cluster.name)}
                    sx={{
                      color: colors.textSecondary,
                      '&.Mui-checked': {
                        color: colors.primary,
                        '& + .MuiSvgIcon-root': {
                          animation: 'pulse 0.3s ease-in-out',
                        },
                      },
                      '@keyframes pulse': {
                        '0%': { transform: 'scale(0.8)' },
                        '50%': { transform: 'scale(1.2)' },
                        '100%': { transform: 'scale(1)' },
                      },
                    }}
                  />
                </TableCell>
                <TableCell>
                  <div className="text-base font-medium">{cluster.name}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {cluster.labels && Object.keys(cluster.labels).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(cluster.labels).map(([key, value]) => (
                            <LabelChip
                              key={`${key}-${value}`}
                              labelKey={key}
                              value={value}
                              isDark={isDark}
                              colors={colors}
                              filterByLabel={filterByLabel}
                              onFilterClick={onFilterByLabel}
                            />
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: colors.textSecondary, fontStyle: 'italic' }}>
                          {t('clusters.labels.noLabels')}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {cluster.creationTime || cluster.creationTimestamp
                    ? new Date(
                        cluster.creationTime || cluster.creationTimestamp || ''
                      ).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'N/A'}
                </TableCell>
                <TableCell>
                  <span
                    style={{
                      backgroundColor: isDark
                        ? 'rgba(103, 192, 115, 0.2)'
                        : 'rgba(103, 192, 115, 0.1)',
                      color: isDark ? 'rgb(154, 214, 249)' : 'rgb(47, 134, 255)',
                      border: `1px solid ${isDark ? 'rgba(103, 192, 115, 0.4)' : 'rgba(103, 192, 115, 0.3)'}`,
                      display: 'inline-block',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      verticalAlign: 'middle',
                    }}
                    className="rounded-lg px-2 py-1 text-xs font-medium"
                    title={cluster.name}
                  >
                    {cluster.name}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={cluster.status}
                    available={cluster.available}
                    isDark={isDark}
                    colors={colors}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <ActionButton
                      onClick={(event) => onActionsClick(event, cluster.name)}
                      colors={colors}
                      isDark={isDark}
                    />
                  </div>
                </TableCell>
              </TableRow>
            </Fade>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TableContent; 