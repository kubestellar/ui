import { Box, Typography, Autocomplete, TextField } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface Props {
    handleChartSelection: (chart: string|null) => void;
    theme: string;
    selectedChart: string | null;
}

export const PopularHelmChartsForm = ({ handleChartSelection, theme, selectedChart }:Props) => {
  // const color=theme === "dark" ? "#d4d4d4" : "#333"

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
                          mb: 3, 
                          '& .MuiInputLabel-root': {
                            color: theme === "dark" ? "#90caf9" : "#1976d2",
                            fontSize: "0.875rem",
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: theme === "dark" ? "#90caf9" : "#1976d2",
                          },
                          '& .MuiOutlinedInput-root': {
                            color: theme === "dark" ? "#d4d4d4" : "#333",
                            backgroundColor: theme === "dark" ? "#00000033" : "#fff",
                            '& fieldset': {
                              borderColor: theme === "dark" ? "#444" : "#e0e0e0",
                              borderWidth: "1px",
                            },
                            '&:hover fieldset': {
                              borderColor: theme === "dark" ? "#90caf9" : "#1976d2",
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: theme === "dark" ? "#90caf9" : "#1976d2",
                              borderWidth: "1px",
                            },
                            '& .MuiAutocomplete-endAdornment': {
                              color: theme === "dark" ? "#d4d4d4" : "#666",
                            },
                            '& input': {
                              color: theme === "dark" ? "#d4d4d4" : "#333",
                            },
                          },
                        }}
                      />
                    )}
                    sx={{
                        width: "100%",
                        mb: 2,
                    }}
                    slotProps={{
                      popupIndicator: {
                        sx: {
                          color: theme === "dark" ? "#d4d4d4" : "#666",
                        },
                      },
                      clearIndicator: {
                        sx: {
                          color: theme === "dark" ? "#d4d4d4" : "#666",
                        },
                      },
                      paper: {
                        sx: {
                          backgroundColor: theme === "dark" ? "#00000033" : "#fff",
                          color: theme === "dark" ? "#d4d4d4" : "#333",
                          '& .MuiAutocomplete-option': {
                            '&:hover': {
                              backgroundColor: theme === "dark" ? "#333" : "rgba(25, 118, 210, 0.08)",
                            },
                            '&.Mui-focused': {
                              backgroundColor: theme === "dark" ? "#333" : "rgba(25, 118, 210, 0.08)",
                            },
                          },
                        },
                      },
                      listbox: {
                        sx: {
                          '&::-webkit-scrollbar': {
                            width: '8px',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            backgroundColor: theme === "dark" ? "#555" : "#bdbdbd",
                            borderRadius: '4px',
                          },
                          '&::-webkit-scrollbar-track': {
                            backgroundColor: theme === "dark" ? "#2a2a2a" : "#f5f5f5",
                          },
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
                          backgroundColor: theme === "dark" ? "#1e1e1e" : "#f8f8f8",
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
