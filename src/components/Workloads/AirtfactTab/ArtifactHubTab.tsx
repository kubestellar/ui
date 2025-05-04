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
  const [searchLoading] = useState(false);
  const [formData, setFormData] = useState<ArtifactHubFormData>({
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

  // This function is kept for future implementation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handlePackageSelection = (pkg: Package) => {
    // Check if this is a "clear selection" call (empty name)
    if (!pkg.name) {
      setFormData({
        ...formData,
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
    
    setFormData({
      ...formData,
      packageId: packageId,
      version: pkg.version,
      releaseName: pkg.name,
      namespace: "default",
      values: {},
      workloadLabel: formData.workloadLabel || ""
    });
  };

  const handleArtifactHubDeploy = async () => {
    // If on repositories or searchPackages tab, just close the dialog
    if (selectedOption === "repositories" || selectedOption === "searchPackages") {
      onCancel();
      return;
    }

    // For "searchPackages", we also just close
    if (selectedOption === "searchPackages") {
      onCancel();
      return;
    }

    // For "directDeploy", validate and proceed with deployment
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
      // Enhanced logging for debugging
      console.log("Sending deployment request with:", {
        packageId: formData.packageId,
        version: formData.version,
        namespace: formData.namespace,
        releaseName: formData.releaseName,
        values: formData.values,
        workloadLabel: formData.workloadLabel
      });

      // Create a request object that matches the backend expected format
      const deployRequest = {
        ...formData,
        // Make sure workloadLabel is properly set
        workloadLabel: formData.workloadLabel
      };
      
      console.log("Final deploy request payload:", JSON.stringify(deployRequest));
      
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
    
    // Never disable the button for repositories or searchPackages tabs
    if (selectedOption === "repositories" || selectedOption === "searchPackages") {
      return false;
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

      {/* Button section */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          mt: 2,
          gap: 2,
        }}
      >
        {selectedOption !== "repositories" && selectedOption !== "searchPackages" && (
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
          onClick={handleArtifactHubDeploy}
          disabled={isApplyDisabled()}
          sx={{
            backgroundColor: theme === "dark" ? "#1976d2" : "#1976d2",
            color: "#fff",
            "&:hover": {
              backgroundColor: theme === "dark" ? "#1565c0" : "#1565c0",
            },
          }}
        >
          {selectedOption === "repositories" || selectedOption === "searchPackages" ? "Close" : "Apply"}
        </Button>
      </Box>
    </StyledContainer>
  );
}; 