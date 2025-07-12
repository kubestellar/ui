// src/components/BindingPolicy/BPTableSkeleton.tsx
import React from 'react';
import Skeleton from './Skeleton';
import {
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Checkbox,
  Box,
} from '@mui/material';
import useTheme from '../../stores/themeStore';

interface BPTableSkeletonProps {
  rows?: number;
}

const BPTableSkeleton: React.FC<BPTableSkeletonProps> = ({ rows = 5 }) => {
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';

  return (
    <>
      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: isDark ? '#1e293b' : '#f8fafc',
          borderRadius: '0.5rem',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          marginBottom: 2,
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox disabled />
              </TableCell>
              <TableCell>
                <Skeleton width={60} height={20} />
              </TableCell>
              <TableCell>
                <Skeleton width={60} height={20} />
              </TableCell>
              <TableCell align="center">
                <Skeleton width={70} height={20} />
              </TableCell>
              <TableCell>
                <Skeleton width={80} height={20} />
              </TableCell>
              <TableCell>
                <Skeleton width={100} height={20} />
              </TableCell>
              <TableCell align="right">
                <Skeleton width={60} height={20} />
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array(rows)
              .fill(0)
              .map((_, index) => (
                <TableRow key={index}>
                  <TableCell padding="checkbox">
                    <Checkbox disabled />
                  </TableCell>
                  <TableCell>
                    <Skeleton width={120} height={20} />
                  </TableCell>
                  <TableCell>
                    <Skeleton width={80} height={24} className="rounded-full" />
                  </TableCell>
                  <TableCell align="center">
                    <Skeleton width={30} height={20} />
                  </TableCell>
                  <TableCell>
                    <Skeleton width={100} height={20} />
                  </TableCell>
                  <TableCell>
                    <Skeleton width={140} height={20} />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-center' }}>
                      <Skeleton width={32} height={32} className="rounded-full" />
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination skeleton */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          mt: 2,
        }}
      >
        <Skeleton width={180} height={20} />
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Skeleton width={32} height={32} className="rounded" />
          {[1, 2, 3, 4, 5].map(page => (
            <Skeleton key={page} width={32} height={32} className="rounded" />
          ))}
          <Skeleton width={32} height={32} className="rounded" />
        </Box>
      </Box>
    </>
  );
};

export default BPTableSkeleton;
