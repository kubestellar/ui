import { Box, Typography, Autocomplete, TextField } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface Props {
    handleChartSelection: (chart: string|null) => void;
    theme: string;
    selectedChart: string | null;
}

export const PopularHelmChartsForm = ({ handleChartSelection, theme, selectedChart }:Props) => {
  const color=theme === "dark" ? "#d4d4d4" : "#333"

    const popularHelmCharts = [
        "airflow", "apache", "apisix", "appsmith", "argo-cd", "argo-workflows", "aspnet-core", "cassandra",
        "cert-manager", "chainloop", "cilium", "clickhouse", "common", "concourse", "consul", "contour",
        "deepspeed", "discourse", "dremio", "drupal", "ejbca", "fluent-bit", "postgresql-ha", "postgresql",
        "prometheus", "pytorch", "rabbitmq-cluster-operator", "rabbitmq", "redis-cluster", "redis", "redmine",
        "schema-registry", "scylladb", "sealed-secrets", "seaweedfs", "solr", "sonarqube", "spark",
        "spring-cloud-dataflow", "superset", "tensorflow-resnet", "thanos", "tomcat", "valkey-cluster",
        "valkey", "vault", "victoriametrics", "whereabouts", "wildfly", "wordpress", "zipkin"
    ];
  return (
    <Box>
      <Box
          sx={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              overflow: "hidden",
          }}
      >
          {/* Sticky Header */}
          <Box
              sx={{
                  position: "sticky",
                  marginTop: "20px",
                  top: 0,
                  zIndex: 1,
                  height: "55vh",
              }}
          >
              <Box>
                <Autocomplete
                    disablePortal
                    options={popularHelmCharts}
                    onChange={(_, newValue) => handleChartSelection(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Search Helm Chart"
                        variant="outlined"
                        sx={{
                          mb: 3, '& .MuiInputLabel-root': {
                            color,
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color, 
                          },
                          '& .MuiOutlinedInput-root': {
                            color, 
                            '& fieldset': {
                              borderColor:color, 
                            },
                            '&:hover fieldset': {
                              borderColor:color, 
                            },
                            '&.Mui-focused fieldset': {
                              borderColor:color, 
                            },
                            '& .MuiAutocomplete-endAdornment': {
                              color 
                            },
                          }, }}
                      />
                    )}
                    sx={{
                        width: "100%",
                        mb: 2,
                    }}
                    slotProps={{
                      popupIndicator: {
                        sx: {
                          color, 
                        },
                      },
                      clearIndicator: {
                        sx: {
                          color , 
                        },
                      },
                    }}
                />
              </Box>

              {selectedChart && (
                  <Box
                      sx={{
                          width: "100%",
                          margin: "0 auto 25px auto",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          p: 1.6,
                          borderRadius: "4px",
                          border: "1px solid",
                          borderColor: theme === "dark" ? "#444" : "#e0e0e0",
                      }}
                  >
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                          <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                          <Typography variant="body1" sx={{ color: theme === "dark" ? "#fff" : "#333" }}>
                              <strong>{selectedChart}</strong>
                          </Typography>
                      </Box>
                  </Box>
              )}
          </Box>
      </Box>
      </Box>
  )
}