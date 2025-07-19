import React from 'react';
import { Box, Table, TableBody, TableCell, TableRow, Chip } from '@mui/material';

interface ClusterInfo {
  context?: string;
  creationTime?: string;
  labels?: Record<string, string>;
}

interface ClusterDetails {
  clusterName: string;
  itsManagedClusters?: ClusterInfo[];
}

interface ResourceInfo {
  name: string;
  namespace: string;
  kind: string;
  createdAt: string;
  age: string;
  status: string;
  manifest: string;
  context?: string;
  labels?: Record<string, string>;
}

interface ResourceMetadata {
  name?: string;
  namespace?: string;
  creationTimestamp?: string;
  labels?: Record<string, string>;
}

interface ResourceData {
  metadata?: ResourceMetadata;
  status?: Record<string, unknown>;
}

interface SummaryTabProps {
  type: string;
  resource: ResourceInfo | null;
  clusterDetails: ClusterDetails | null;
  resourceData: ResourceData | null;
  theme: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  calculateAge: (creationTimestamp: string | undefined) => string;
}

const SummaryTab: React.FC<SummaryTabProps> = ({
  type,
  resource,
  clusterDetails,
  resourceData,
  theme,
  t,
  calculateAge,
}) => {
  // Handle cluster type with cluster details
  if (type.toLowerCase() === 'cluster' && clusterDetails) {
    const clusterInfo =
      clusterDetails.itsManagedClusters && clusterDetails.itsManagedClusters.length > 0
        ? clusterDetails.itsManagedClusters[0]
        : null;
    return (
      <Box>
        <Table sx={{ borderRadius: 1, mb: 2 }}>
          <TableBody>
            {[
              { label: t('wecsDetailsPanel.table.kind'), value: 'Cluster' },
              { label: t('wecsDetailsPanel.table.name'), value: clusterDetails.clusterName },
              {
                label: t('wecsDetailsPanel.table.context'),
                value: clusterInfo?.context || t('wecsDetailsPanel.common.unknown'),
              },
              {
                label: t('wecsDetailsPanel.table.createdAt'),
                value: clusterInfo
                  ? `${new Date(clusterInfo.creationTime || '').toLocaleString()} (${calculateAge(clusterInfo.creationTime)})`
                  : t('wecsDetailsPanel.common.unknown'),
              },
            ].map((row, index) => (
              <TableRow key={index}>
                <TableCell
                  sx={{
                    borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                    color: theme === 'dark' ? '#D4D4D4' : '#333333',
                    fontSize: '14px',
                    fontWeight: 500,
                    width: '150px',
                    padding: '10px 16px',
                  }}
                >
                  {row.label}
                </TableCell>
                <TableCell
                  sx={{
                    borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                    color: theme === 'dark' ? '#D4D4D4' : '#333333',
                    fontSize: '14px',
                    padding: '10px 16px',
                  }}
                >
                  {row.value}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {clusterInfo && clusterInfo.labels && Object.keys(clusterInfo.labels).length > 0 && (
          <Table sx={{ borderRadius: 1 }}>
            <TableBody>
              <TableRow>
                <TableCell
                  sx={{
                    borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                    color: theme === 'dark' ? '#D4D4D4' : '#333333',
                    fontSize: { xs: '12px', sm: '14px' },
                    fontWeight: 500,
                    width: { xs: '30%', sm: '150px' },
                    minWidth: { xs: '80px', sm: '120px' },
                    padding: { xs: '8px 12px', sm: '10px 16px' },
                    verticalAlign: 'top',
                  }}
                >
                  {t('wecsDetailsPanel.table.labels')}
                </TableCell>
                <TableCell
                  sx={{
                    borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                    color: theme === 'dark' ? '#D4D4D4' : '#333333',
                    fontSize: { xs: '12px', sm: '14px' },
                    padding: { xs: '8px 12px', sm: '10px 16px' },
                    width: { xs: '70%', sm: 'auto' },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: { xs: 0.5, sm: 0.5 },
                      alignItems: 'flex-start',
                    }}
                  >
                    {clusterInfo.labels &&
                      (Object.entries(clusterInfo.labels).map(([key, value], index) => (
                        <Chip
                          key={index}
                          label={`${key}: ${value}`}
                          size="small"
                          sx={{
                            mr: { xs: 0.5, sm: 1 },
                            mb: { xs: 0.5, sm: 1 },
                            backgroundColor: theme === 'dark' ? '#334155' : undefined,
                            color: theme === 'dark' ? '#fff' : undefined,
                            fontSize: { xs: '10px', sm: '12px' },
                            height: { xs: '24px', sm: '28px' },
                            maxWidth: { xs: '100%', sm: 'none' },
                            '& .MuiChip-label': {
                              fontSize: { xs: '10px', sm: '12px' },
                              padding: { xs: '0 6px', sm: '0 8px' },
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: { xs: '140px', sm: '180px', md: 'none' },
                            },
                            flexShrink: 0,
                            minWidth: 0,
                          }}
                        />
                      )) as React.ReactNode[])}
                  </Box>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </Box>
    );
  }

  // Handle case where resource is null but resourceData is available
  if (!resource && resourceData) {
    const metadata = resourceData.metadata;
    
    return (
      <Box>
        <Table sx={{ borderRadius: 1, mb: 2 }}>
          <TableBody>
            {[
              { label: t('wecsDetailsPanel.table.kind'), value: type },
              { label: t('wecsDetailsPanel.table.name'), value: metadata?.name || t('wecsDetailsPanel.common.unknown') },
              { label: t('wecsDetailsPanel.table.namespace'), value: metadata?.namespace || t('wecsDetailsPanel.common.unknown') },
              {
                label: t('wecsDetailsPanel.table.createdAt'),
                value: metadata?.creationTimestamp
                  ? `${new Date(metadata.creationTimestamp).toLocaleString()} (${calculateAge(metadata.creationTimestamp)})`
                  : t('wecsDetailsPanel.common.unknown'),
              },
            ].map((row, index) => (
              <TableRow key={index}>
                <TableCell
                  sx={{
                    borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                    color: theme === 'dark' ? '#D4D4D4' : '#333333',
                    fontSize: '14px',
                    fontWeight: 500,
                    width: '150px',
                    padding: '10px 16px',
                  }}
                >
                  {row.label}
                </TableCell>
                <TableCell
                  sx={{
                    borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                    color: theme === 'dark' ? '#D4D4D4' : '#333333',
                    fontSize: '14px',
                    padding: '10px 16px',
                  }}
                >
                  {row.value}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {metadata?.labels && Object.keys(metadata.labels).length > 0 && (
          <Table sx={{ borderRadius: 1 }}>
            <TableBody>
              <TableRow>
                <TableCell
                  sx={{
                    borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                    color: theme === 'dark' ? '#D4D4D4' : '#333333',
                    fontSize: '14px',
                    fontWeight: 500,
                    width: '150px',
                    padding: '10px 16px',
                    verticalAlign: 'top',
                  }}
                >
                  {t('wecsDetailsPanel.table.labels')}
                </TableCell>
                <TableCell
                  sx={{
                    borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                    color: theme === 'dark' ? '#D4D4D4' : '#333333',
                    fontSize: '14px',
                    padding: '10px 16px',
                  }}
                >
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {Object.entries(metadata.labels).map(([key, value], index) => (
                      <Chip
                        key={index}
                        label={`${key}: ${value}`}
                        size="small"
                        sx={{
                          mr: 1,
                          mb: 1,
                          backgroundColor: theme === 'dark' ? '#334155' : undefined,
                          color: theme === 'dark' ? '#fff' : undefined,
                        }}
                      />
                    ))}
                  </Box>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </Box>
    );
  }

  // Handle case where resource is available
  if (!resource) return null;
  
  const summaryTable = (
    <Table sx={{ borderRadius: 1 }}>
      <TableBody>
        {[
          { label: t('wecsDetailsPanel.table.kind'), value: resource.kind },
          { label: t('wecsDetailsPanel.table.name'), value: resource.name },
          { label: t('wecsDetailsPanel.table.namespace'), value: resource.namespace },
          {
            label: t('wecsDetailsPanel.table.createdAt'),
            value: `${resource.createdAt} (${resource.age})`,
          },
        ].map((row, index) => (
          <TableRow key={index}>
            <TableCell
              sx={{
                borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                color: theme === 'dark' ? '#D4D4D4' : '#333333',
                fontSize: '14px',
                fontWeight: 500,
                width: '150px',
                padding: '10px 16px',
              }}
            >
              {row.label}
            </TableCell>
            <TableCell
              sx={{
                borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                color: theme === 'dark' ? '#D4D4D4' : '#333333',
                fontSize: '14px',
                padding: '10px 16px',
              }}
            >
              {row.value}
            </TableCell>
          </TableRow>
        ))}
        {resourceData?.metadata?.labels && Object.keys(resourceData.metadata.labels).length > 0 && (
          <TableRow>
            <TableCell
              sx={{
                borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                color: theme === 'dark' ? '#D4D4D4' : '#333333',
                fontSize: '14px',
                fontWeight: 500,
                width: '150px',
                padding: '10px 16px',
                verticalAlign: 'top',
              }}
            >
              {t('wecsDetailsPanel.table.labels')}
            </TableCell>
            <TableCell
              sx={{
                borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                color: theme === 'dark' ? '#D4D4D4' : '#333333',
                fontSize: '14px',
                padding: '10px 16px',
              }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {resourceData.metadata.labels &&
                  (Object.entries(resourceData.metadata.labels).map(([key, value], index) => (
                    <Chip
                      key={index}
                      label={`${key}: ${value}`}
                      size="small"
                      sx={{
                        mr: 1,
                        mb: 1,
                        backgroundColor: theme === 'dark' ? '#334155' : undefined,
                        color: theme === 'dark' ? '#fff' : undefined,
                      }}
                    />
                  )) as React.ReactNode[])}
              </Box>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
  return summaryTable;
};

export default SummaryTab;
