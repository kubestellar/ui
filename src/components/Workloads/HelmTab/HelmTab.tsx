import { Box, Button, FormControlLabel, Radio, RadioGroup } from '@mui/material';
import { StyledContainer } from '../../StyledComponents';
import useTheme from '../../../stores/themeStore';
import { useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import { toast } from 'react-hot-toast';
import { PopularHelmChartsForm } from './PopularHelmChartsForm';
import { UserCreatedChartsForm } from './UserCreatedChartsForm';
import { CreateOwnHelmForm } from './CreateOwnHelmForm';
import { api } from '../../../lib/api';
import WorkloadLabelInput from '../WorkloadLabelInput';

export interface HelmFormData {
  repoName: string;
  repoUrl: string;
  chartName: string;
  releaseName: string;
  version: string;
  namespace: string;
  workload_label: string;
}

interface Props {
  formData: HelmFormData;
  setFormData: (data: HelmFormData) => void;
  error: string;
  loading: boolean;
  hasChanges: boolean;
  validateForm: () => boolean;
  handleDeploy: () => void;
  handleCancelClick: () => void;
}

export interface Deployment {
  id: string;
  timestamp: string;
  repoName: string;
  repoURL: string;
  chartName: string;
  releaseName: string;
  namespace: string;
  version: string;
  releaseInfo: string;
  chartVersion: string;
  values: Record<string, unknown>;
}

export const HelmTab = ({
  formData,
  setFormData,
  error,
  loading,
  hasChanges,
  validateForm,
  handleDeploy,
  handleCancelClick,
}: Props) => {
  const theme = useTheme(state => state.theme);
  const [selectedOption, setSelectedOption] = useState('createOwn');
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [popularLoading, setPopularLoading] = useState(false);
  const [userCharts, setUserCharts] = useState<Deployment[]>([]);
  const [userLoading, setUserLoading] = useState(false);

  // Fetch user-created charts
  useEffect(() => {
    const fetchUserCharts = async () => {
      setUserLoading(true);
      try {
        const response = await api.get('/api/deployments/helm/list');
        if (response.status === 200) {
          const deployments = response.data.deployments;
          setUserCharts(deployments);
        } else {
          throw new Error('Failed to fetch user-created charts');
        }
      } catch (error: unknown) {
        const err = error as AxiosError;
        console.error('User Charts Fetch error:', err);
        toast.error('Failed to load user-created charts!');
      } finally {
        setUserLoading(false);
      }
    };

    if (selectedOption === 'userCharts') {
      fetchUserCharts();
    }
  }, [selectedOption]);

  const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(event.target.value);
    setSelectedChart(null);
  };

  const handleChartSelection = (chartValue: string | null) => {
    // For userCharts, use id to find chartName; for popularCharts, use the chart name directly
    const chart =
      selectedOption === 'userCharts'
        ? userCharts.find(c => c.id === chartValue)?.chartName || null
        : chartValue;
    setSelectedChart(chart === selectedChart ? null : chart);
  };

  const handlePopularHelmDeploy = async () => {
    if (!selectedChart) {
      toast.error('Please select a Helm chart to deploy.');
      return;
    }

    setPopularLoading(true);

    try {
      const requestBody = {
        repoName: 'bitnami',
        repoURL: 'https://charts.bitnami.com/bitnami',
        chartName: selectedChart,
        releaseName: selectedChart,
        namespace: selectedChart,
        workloadLabel: formData.workload_label,
      };

      const response = await api.post('/deploy/helm?store=true', requestBody);

      if (response.status === 200 || response.status === 201) {
        toast.success(`Selected ${selectedChart} Helm chart deployed successfully!`);
        setSelectedChart(null);
        setTimeout(() => window.location.reload(), 4000);
      } else {
        throw new Error('Unexpected response status: ' + response.status);
      }
    } catch (error: unknown) {
      const err = error as AxiosError;
      console.error('Popular Helm Deploy error:', err);

      if (err.response) {
        if (err.response.status === 500) {
          toast.error(
            'Deployment failed: failed to install chart: cannot re-use a name that is still in use!'
          );
        } else if (err.response.status === 400) {
          toast.error('Failed to deploy popular Helm chart!');
        }
      }
    } finally {
      setPopularLoading(false);
    }
  };

  return (
    <StyledContainer>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        <WorkloadLabelInput
          value={formData.workload_label || ''}
          handleChange={e => setFormData({ ...formData, workload_label: e.target.value })}
          isError={false}
          theme={theme}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1, mt: 2 }}>
          <RadioGroup row value={selectedOption} onChange={handleOptionChange} sx={{ gap: 4 }}>
            <FormControlLabel
              value="createOwn"
              control={<Radio />}
              label="Create your own Helm chart"
              sx={{
                '& .MuiTypography-root': {
                  color: theme === 'dark' ? '#d4d4d4' : '#333',
                  fontSize: '0.875rem',
                },
              }}
            />
            <FormControlLabel
              value="popularCharts"
              control={<Radio />}
              label="Deploy from popular Helm charts"
              sx={{
                '& .MuiTypography-root': {
                  color: theme === 'dark' ? '#d4d4d4' : '#333',
                  fontSize: '0.875rem',
                },
              }}
            />
            <FormControlLabel
              value="userCharts"
              control={<Radio />}
              label="List of user created Charts"
              sx={{
                '& .MuiTypography-root': {
                  color: theme === 'dark' ? '#d4d4d4' : '#333',
                  fontSize: '0.875rem',
                },
              }}
            />
          </RadioGroup>
        </Box>

        <Box sx={{ height: '55vh', overflow: 'hidden' }}>
          {selectedOption === 'createOwn' ? (
            <CreateOwnHelmForm
              formData={formData}
              setFormData={setFormData}
              error={error}
              theme={theme}
            />
          ) : selectedOption === 'popularCharts' ? (
            <PopularHelmChartsForm
              handleChartSelection={handleChartSelection}
              theme={theme}
              selectedChart={selectedChart}
            />
          ) : (
            <UserCreatedChartsForm
              handleChartSelection={handleChartSelection}
              setUserCharts={setUserCharts}
              theme={theme}
              selectedChart={selectedChart}
              userCharts={userCharts}
              userLoading={userLoading}
            />
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
            mt: 2,
            position: 'relative',
            width: '100%',
            height: 'auto',
            minHeight: '40px',
            padding: '8px 0',
            zIndex: 1,
          }}
        >
          <Button
            onClick={handleCancelClick}
            disabled={loading || popularLoading || userLoading}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              color: theme === 'dark' ? '#d4d4d4' : '#666',
              padding: '8px 16px',
              '&:hover': {
                backgroundColor: theme === 'dark' ? '#333' : '#f5f5f5',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedOption === 'createOwn') {
                if (validateForm()) handleDeploy();
              } else {
                handlePopularHelmDeploy();
              }
            }}
            disabled={
              (selectedOption === 'createOwn' && (!hasChanges || loading)) ||
              (selectedOption === 'popularCharts' && (!selectedChart || popularLoading)) ||
              (selectedOption === 'userCharts' && (!selectedChart || userLoading))
            }
            sx={{
              textTransform: 'none',
              fontWeight: '600',
              backgroundColor: '#1976d2',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '8px',
              '&:hover': {
                backgroundColor: '#1565c0',
              },
              '&:disabled': {
                backgroundColor: '#b0bec5',
                color: '#fff',
              },
            }}
          >
            {(selectedOption === 'createOwn' && loading) ||
            (selectedOption === 'popularCharts' && popularLoading) ||
            (selectedOption === 'userCharts' && userLoading)
              ? 'Deploying...'
              : 'Apply'}
          </Button>
        </Box>
      </Box>
    </StyledContainer>
  );
};
