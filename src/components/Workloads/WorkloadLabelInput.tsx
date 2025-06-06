import { InputAdornment, TextField } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  value: string;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isError?: boolean;
  theme: string;
}

const WorkloadLabelInput = ({ value, handleChange, isError, theme }: Props) => {
  const { t } = useTranslation();
  const prefix = t('workloads.label.prefix', { defaultValue: 'kubestellar.io/workload:' });

  return (
    <TextField
      fullWidth
      label={t('workloads.label.title')}
      value={value}
      onChange={handleChange}
      sx={{
        width: '100%',
        margin: '0 auto 10px auto',
        input: { color: theme === 'dark' ? '#d4d4d4' : '#333' },
        label: { color: theme === 'dark' ? '#858585' : '#666' },
        '& .MuiOutlinedInput-root': {
          '& fieldset': {
            borderColor: theme === 'dark' ? '#444' : '#e0e0e0',
          },
          '&:hover fieldset': {
            borderColor: '#1976d2',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#1976d2',
          },
          '&.Mui-error fieldset': {
            borderColor: '#d32f2f',
          },
        },
        '& .MuiInputLabel-root.Mui-focused': {
          color: '#1976d2',
        },
        '& .MuiInputLabel-root.Mui-error': {
          color: '#d32f2f',
        },
        '& .MuiFormHelperText-root': {
          color: theme === 'dark' ? '#858585' : '#666',
        },
      }}
      helperText={isError ? t('workloads.label.helpTextError') : t('workloads.label.helpText')}
      error={isError}
      slotProps={{
        input: {
          startAdornment: !isError && (
            <InputAdornment position="start">
              <span style={{ color: theme === 'dark' ? 'white' : 'black' }}>{prefix}</span>
            </InputAdornment>
          ),
        },
      }}
    />
  );
};

export default WorkloadLabelInput;
