import { Box, Button, FormControlLabel, Radio, RadioGroup } from "@mui/material";
import { StyledContainer } from "../../StyledComponents";
import useTheme from "../../../stores/themeStore";
import { useState, useEffect } from "react";
import { AxiosError } from "axios";
import { toast } from "react-hot-toast";
import { SearchPackagesForm } from "./SearchPackagesForm";
import { RepositoriesListForm } from "./RepositoriesListForm";
import { DirectDeployForm } from "./DirectDeployForm";
import { api } from "../../../lib/api";

export interface Repository {
  name: string;
  display_name?: string;
  url: string;
  kind: number;
  disabled?: boolean;
  official?: boolean;
  verified_publisher?: boolean;
  organization_name?: string;
  organization_display_name?: string;
  user_alias?: string;
  last_tracking_errors?: string;
}

export interface Package {
  name: string;
  repository: {
    url: string;
    name: string;
    display_name?: string;
    kind?: number;
  };
  version: string;
  description: string;
  app_version?: string;
}

export interface ArtifactHubFormData {
  workload_label: string;
  packageId: string;
  version: string;
  releaseName: string;
  namespace: string;
  values: Record<string, string>;
}

interface Props {
  onCancel: () => void;
  onDeploy: (data: ArtifactHubFormData) => void;
  loading: boolean;
  error: string;
}

export const ArtifactHubTab = ({ onCancel, onDeploy, loading, error }: Props) => {
  const { theme } = useTheme();
  const [selectedOption, setSelectedOption] = useState("searchPackages");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [deployLoading, setDeployLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [searchLoading] = useState(false);
  const [formData, setFormData] = useState<ArtifactHubFormData>({
    workload_label: "",
    packageId: "",
    version: "",
    releaseName: "",
    namespace: "default",
    values: {},
  });

  // Fetch repositories
  useEffect(() => {
    const fetchRepositories = async () => {
      setReposLoading(true);
      try {
        const response = await api.get("/api/v1/artifact-hub/repositories/list");
        if (response.status === 200) {
          setRepositories(response.data.repositories);
        } else {
          throw new Error("Failed to fetch repositories");
        }
      } catch (error: unknown) {
        const err = error as AxiosError;
        console.error("Repositories Fetch error:", err);
        toast.error("Failed to load repositories!");
      } finally {
        setReposLoading(false);
      }
    };

    if (selectedOption === "repositories") {
      fetchRepositories();
    }
  }, [selectedOption]);

  const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(event.target.value);
    setSelectedPackage(null);
  };

  const handlePackageSelection = (pkg: Package) => {
    // Check if this is a "clear selection" call (empty name)
    if (!pkg.name) {
      setSelectedPackage(null);
      setFormData({
        ...formData,
        packageId: "",
        version: "",
        releaseName: "",
      });
      return;
    }
    
    setSelectedPackage(pkg);
    
    // The packageId is exactly as it appears in the API search response
    const packageId = `helm/${pkg.repository.name}/${pkg.name}`;
    console.log("Selected package:", pkg);
    console.log("Constructed packageId:", packageId);
    
    setFormData({
      ...formData,
      packageId: packageId,
      version: pkg.version,
      releaseName: pkg.name,
      namespace: "default",
      values: {},
      workload_label: formData.workload_label || ""
    });
  };

  const handleArtifactHubDeploy = async () => {
    if (!selectedPackage && selectedOption === "searchPackages") {
      toast.error("Please select a package to deploy.");
      return;
    }

    if (selectedOption === "directDeploy") {
      if (!formData.packageId) {
        toast.error("Please enter a package ID.");
        return;
      }
      if (!formData.releaseName) {
        toast.error("Please enter a release name.");
        return;
      }
    }

    setDeployLoading(true);

    try {
      // Log the request for debugging purposes
      console.log("Sending deployment request with:", {
        packageId: formData.packageId,
        version: formData.version,
        namespace: formData.namespace,
        releaseName: formData.releaseName,
        values: formData.values,
        workload_label: formData.workload_label
      });

      onDeploy(formData);
    } catch (error: unknown) {
      const err = error as AxiosError;
      console.error("Artifact Hub Deploy error:", err);
      toast.error("Failed to deploy Artifact Hub package!");
    } finally {
      setDeployLoading(false);
    }
  };

  // Determine if Apply button should be disabled
  const isApplyDisabled = () => {
    if (loading || searchLoading || reposLoading || deployLoading) {
      return true;
    }
    
    if (selectedOption === "searchPackages" && !selectedPackage) {
      return true;
    }
    
    if (selectedOption === "directDeploy" && (!formData.packageId || !formData.releaseName)) {
      return true;
    }
    
    return false;
  };

  return (
    <StyledContainer>
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
        <RadioGroup
          row
          value={selectedOption}
          onChange={handleOptionChange}
          sx={{ gap: 4 }}
        >
          <FormControlLabel
            value="searchPackages"
            control={<Radio />}
            label="Search Packages"
            sx={{
              "& .MuiTypography-root": {
                color: theme === "dark" ? "#d4d4d4" : "#333",
                fontSize: "0.875rem",
              },
            }}
          />
          <FormControlLabel
            value="repositories"
            control={<Radio />}
            label="List Repositories"
            sx={{
              "& .MuiTypography-root": {
                color: theme === "dark" ? "#d4d4d4" : "#333",
                fontSize: "0.875rem",
              },
            }}
          />
          <FormControlLabel
            value="directDeploy"
            control={<Radio />}
            label="Deploy Helm Chart from Artifact Hub"
            sx={{
              "& .MuiTypography-root": {
                color: theme === "dark" ? "#d4d4d4" : "#333",
                fontSize: "0.875rem",
              },
            }}
          />
        </RadioGroup>
      </Box>

      {/* Wrapper Box to maintain consistent height */}
      <Box sx={{ height: "55vh", overflow: "hidden" }}>
        {selectedOption === "searchPackages" ? (
          <SearchPackagesForm
            handlePackageSelection={handlePackageSelection}
            theme={theme}
            selectedPackage={selectedPackage}
          />
        ) : selectedOption === "repositories" ? (
            <RepositoriesListForm 
              repositories={repositories}
              loading={reposLoading}
              theme={theme}
            />
        ) : (
            <DirectDeployForm 
              theme={theme}
              formData={formData}
              setFormData={setFormData}
              error={error}
            />
        )}
      </Box>

      {/* Only show buttons for Search Packages and Direct Deploy, not for List Repositories */}
      {selectedOption !== "repositories" && (
        <Box sx={{ 
          display: "flex", 
          justifyContent: "flex-end", 
          gap: 1, 
          mt: 2,
          position: "relative",
          width: "100%",
          height: "auto",
          minHeight: "40px",
          padding: "8px 0",
          zIndex: 1
        }}>
          <Button
            onClick={onCancel}
            disabled={loading || searchLoading || reposLoading || deployLoading}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: theme === "dark" ? "#d4d4d4" : "#666",
              padding: "8px 16px",
              "&:hover": {
                backgroundColor: theme === "dark" ? "#333" : "#f5f5f5",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleArtifactHubDeploy}
            disabled={isApplyDisabled()}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              backgroundColor: theme === "dark" ? "#1976d2" : "#1976d2",
              color: "#fff",
              padding: "8px 16px",
              "&:hover": {
                backgroundColor: theme === "dark" ? "#1565c0" : "#1565c0",
              },
              "&.Mui-disabled": {
                backgroundColor: theme === "dark" ? "rgba(25, 118, 210, 0.3)" : "rgba(25, 118, 210, 0.3)",
                color: "rgba(255, 255, 255, 0.6)",
              },
            }}
          >
            Apply
          </Button>
        </Box>
      )}
    </StyledContainer>
  );
}; 