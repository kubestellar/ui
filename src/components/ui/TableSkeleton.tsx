// src/components/ui/TableSkeleton.tsx
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
} from "@mui/material";
import useTheme from '../../stores/themeStore';

interface TableSkeletonProps {
  rows?: number;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5 }) => {
  const theme = useTheme((state) => state.theme);
  const isDark = theme === 'dark';
  
  // Use the same colors and styling as your existing table
  return (
    <TableContainer 
      component={Paper}
      sx={{ 
        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
        borderRadius: '12px',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        boxShadow: isDark
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      }}
    >
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#2f86ff' }}>
            <TableCell>
              <Checkbox disabled />
            </TableCell>
            <TableCell>
              <Skeleton width={80} height={24} />
            </TableCell>
            <TableCell>
              <Skeleton width={100} height={24} />
            </TableCell>
            <TableCell>
              <Skeleton width={120} height={24} />
            </TableCell>
            <TableCell>
              <Skeleton width={90} height={24} />
            </TableCell>
            <TableCell>
              <Skeleton width={80} height={24} />
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array(rows).fill(0).map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Checkbox disabled />
              </TableCell>
              <TableCell>
                <Skeleton width="80%" height={20} />
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Skeleton width={60} height={24} />
                  <Skeleton width={70} height={24} />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton width="90%" height={20} />
              </TableCell>
              <TableCell>
                <Skeleton width={80} height={24} />
              </TableCell>
              <TableCell>
                <Skeleton width={60} height={24} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TableSkeleton;