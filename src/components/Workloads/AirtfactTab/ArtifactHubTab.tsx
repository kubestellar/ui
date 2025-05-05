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
import { CircularProgress } from "@mui/material";

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
    organization_name?: string;
    organization_display_name?: string;
    verified_publisher?: boolean;
    official?: boolean;
  };
  version: string;
  description: string;
  app_version?: string;
  logo_image_id?: string;
  logo_url?: string;
  stars?: number;
  created_at?: number;
  digest?: string;
  home_url?: string;
  content_url?: string;
}

export interface ArtifactHubFormData {
  workloadLabel: string;
  packageId: string;
  version?: string;
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
  const [searchLoading] = useState(false);
  
  // Create separate form data for search tab and direct deploy tab
  const [searchFormData, setSearchFormData] = useState<ArtifactHubFormData>({
    workloadLabel: "",
    packageId: "",
    version: "",
    releaseName: "",
    namespace: "default",
    values: {},
  });

  const [directDeployFormData, setDirectDeployFormData] = useState<ArtifactHubFormData>({
    workloadLabel: "",
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
  };

  const handlePackageSelection = (pkg: Package) => {
    // Check if this is a "clear selection" call (empty name)
    if (!pkg.name) {
      setSearchFormData({
        ...searchFormData,
        packageId: "",
        version: "",
        releaseName: "",
      });
      return;
    }
    
    // The packageId is exactly as it appears in the API search response
    const packageId = `helm/${pkg.repository.name}/${pkg.name}`;
    console.log("Selected package:", pkg);
    console.log("Constructed packageId:", packageId);
    
    setSearchFormData({
      ...searchFormData,
      packageId: packageId,
      version: pkg.version,
      releaseName: pkg.name,
      namespace: "default",
      values: {
        "service.port": "80",
        "service.type": "LoadBalancer"
      },
      workloadLabel: searchFormData.workloadLabel || ""
    });
  };

  const handleArtifactHubDeploy = async (deployData?: ArtifactHubFormData) => {
    // If this is from search tab, use search form data
    // If this is from direct deploy tab, use direct deploy form data
    // If data is explicitly passed, use that
    let dataToUse: ArtifactHubFormData;
    
    if (deployData) {
      dataToUse = deployData;
    } else if (selectedOption === "searchPackages") {
      dataToUse = searchFormData;
    } else {
      dataToUse = directDeployFormData;
    }

    // For "repositories", just close the dialog
    if (selectedOption === "repositories") {
      onCancel();
      return;
    }

    // For "searchPackages", proceed with deployment if a package is selected
    if (selectedOption === "searchPackages") {
      if (!searchFormData.packageId) {
        toast.error("Please select a package first");
        return;
      }
      
      if (!searchFormData.workloadLabel) {
        toast.error("Please enter a workload label");
        return;
      }
    }

    // For "directDeploy", validate and proceed with deployment
    if (selectedOption === "directDeploy") {
      if (!dataToUse.packageId) {
        toast.error("Please enter a package ID.");
        return;
      }
      if (!dataToUse.releaseName) {
        toast.error("Please enter a release name.");
        return;
      }
      if (!dataToUse.workloadLabel) {
        toast.error("Please enter a workload label");
        return;
      }
    }

    setDeployLoading(true);

    try {
      // Enhanced logging for debugging
      console.log("Sending deployment request with:", {
        packageId: dataToUse.packageId,
        namespace: dataToUse.namespace,
        releaseName: dataToUse.releaseName,
        values: dataToUse.values,
        workloadLabel: dataToUse.workloadLabel
      });
      
      // Call the onDeploy function with the data, but without version
      const apiPayload = {
        packageId: dataToUse.packageId,
        namespace: dataToUse.namespace,
        releaseName: dataToUse.releaseName,
        values: dataToUse.values,
        workloadLabel: dataToUse.workloadLabel
      };
      
      console.log("Final payload:", JSON.stringify(apiPayload));
      onDeploy(apiPayload);
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
    
    // For repositories tab, never disable button since it just closes
    if (selectedOption === "repositories") {
      return false;
    }
    
    // For search packages tab, disable if no package is selected or no workload label
    if (selectedOption === "searchPackages") {
      return !searchFormData.packageId || !searchFormData.workloadLabel;
    }
    
    // For direct deploy, disable if no required fields
    if (selectedOption === "directDeploy" && 
        (!directDeployFormData.packageId || 
         !directDeployFormData.releaseName || 
         !directDeployFormData.workloadLabel)) {
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
        </RadioGroup>
      </Box>

      {/* Wrapper Box to maintain consistent height */}
      <Box sx={{ height: "55vh", overflow: "hidden" }}>
        {selectedOption === "searchPackages" ? (
          <SearchPackagesForm
            theme={theme}
            handlePackageSelection={handlePackageSelection}
            formData={searchFormData}
            setFormData={setSearchFormData}
            onCancel={onCancel}
            onDeploy={handleArtifactHubDeploy}
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
              formData={directDeployFormData}
              setFormData={setDirectDeployFormData}
              error={error}
            />
        )}
      </Box>

      {/* Button section */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          mt: 2,
          gap: 2,
        }}
      >
        {selectedOption !== "repositories" && (
          <Button
            variant="outlined"
            onClick={onCancel}
            sx={{
              borderColor: theme === "dark" ? "#444" : "#e0e0e0",
              color: theme === "dark" ? "#d4d4d4" : "#333",
              "&:hover": {
                borderColor: theme === "dark" ? "#666" : "#bdbdbd",
                backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
              },
            }}
          >
            Cancel
          </Button>
        )}
        <Button
          variant="contained"
          onClick={() => handleArtifactHubDeploy()}
          disabled={isApplyDisabled()}
          sx={{
            backgroundColor: theme === "dark" ? "#1976d2" : "#1976d2",
            color: "#fff",
            "&:hover": {
              backgroundColor: theme === "dark" ? "#1565c0" : "#1565c0",
            },
          }}
        >
          {deployLoading ? (
            <CircularProgress size={24} sx={{ color: "#fff" }} />
          ) : (
            selectedOption === "repositories" ? "Close" : "Apply"
          )}
        </Button>
      </Box>
    </StyledContainer>
  );
}; 