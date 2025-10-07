const React = window.React;

function App({ pluginId, theme }) {
  // these props are passed by the pluginloader from host
  const [clusters, setClusters] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const [currentTheme, setCurrentTheme] = React.useState(theme);

  React.useEffect(() => {
    const onThemeChange = (e) => {
      const newTheme = e.detail?.theme;
      console.log("newTheme: ", newTheme);
      if (newTheme) {
        setCurrentTheme(newTheme);
      }
    };

    window.addEventListener("theme-toggle", onThemeChange);
    return () => window.removeEventListener("theme-toggle", onThemeChange);
  }, []);

  console.log("Plugin ID from host pluginloader: ", pluginId);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://localhost:4000/api/clusters", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("jwtToken"),
          },
        });

        if (!response.ok) throw new Error("Network response was not ok");

        const clusterData = await response.json();
        setIsLoading(false);
        setClusters(clusterData);
      } catch (error) {
        console.error("Fetch error:", error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1
        style={{
          color: currentTheme === "dark" ? "white" : "black",
          marginBottom: "1rem",
        }}
      >
        Cluster Monitor Plugin
      </h1>

      {clusters && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "1rem",
            }}
          >
            <div
              style={{
                width: "100%",
                borderRadius: "12px",
                padding: "1.2rem",
                color: "#fff",
                background: "blue",
              }}
            >
              <div
                style={{
                  fontSize: "0.9rem",
                  marginBottom: "0.5rem",
                }}
              >
                Total Clusters
              </div>
              <div
                style={{
                  fontSize: "1.8rem",
                  fontWeight: "bold",
                }}
              >
                {clusters.itsData?.length || 0}
              </div>
            </div>

            <div
              style={{
                width: "100%",
                borderRadius: "12px",
                padding: "1.2rem",
                color: "white",
                background: "green",
              }}
            >
              <div
                style={{
                  fontSize: "0.9rem",
                  marginBottom: "0.5rem",
                }}
              >
                Active Clusters
              </div>
              <div
                style={{
                  fontSize: "1.8rem",
                  fontWeight: "bold",
                }}
              >
                {clusters.itsData?.length || 0}
              </div>
            </div>

            <div
              style={{
                width: "100%",
                borderRadius: "12px",
                padding: "1.2rem",
                color: "white",
                background: "orange",
              }}
            >
              <div
                style={{
                  fontSize: "0.9rem",
                  marginBottom: "0.5rem",
                }}
              >
                Current Context
              </div>
              <div
                style={{
                  fontSize: "1.8rem",
                  fontWeight: "bold",
                }}
              >
                {clusters.currentContext}
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: currentTheme === "dark" ? "#10172a" : "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1.5rem",
                borderBottom: `1px solid ${
                  currentTheme === "dark" ? "#374151" : "#e5e7eb"
                }`,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  color: currentTheme === "dark" ? "white" : "black",
                }}
              >
                Cluster Details
              </h2>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor:
                        currentTheme === "dark" ? "#3086ff" : "#f9fafb",
                    }}
                  >
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        fontWeight: "600",
                        color: currentTheme === "dark" ? "white" : "#374151",
                        borderBottom: `1px solid ${
                          currentTheme === "dark" ? "#4b5563" : "#e5e7eb"
                        }`,
                      }}
                    >
                      Name
                    </th>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        fontWeight: "600",
                        color: currentTheme === "dark" ? "white" : "#374151",
                        borderBottom: `1px solid ${
                          currentTheme === "dark" ? "#4b5563" : "#e5e7eb"
                        }`,
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        fontWeight: "600",
                        color: currentTheme === "dark" ? "white" : "#374151",
                        borderBottom: `1px solid ${
                          currentTheme === "dark" ? "#4b5563" : "#e5e7eb"
                        }`,
                      }}
                    >
                      Location
                    </th>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        fontWeight: "600",
                        color: currentTheme === "dark" ? "white" : "#374151",
                        borderBottom: `1px solid ${
                          currentTheme === "dark" ? "#4b5563" : "#e5e7eb"
                        }`,
                      }}
                    >
                      Created
                    </th>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        fontWeight: "600",
                        color: currentTheme === "dark" ? "white" : "#374151",
                        borderBottom: `1px solid ${
                          currentTheme === "dark" ? "#4b5563" : "#e5e7eb"
                        }`,
                      }}
                    >
                      Context
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clusters.itsData?.map((cluster, index) => (
                    <tr
                      key={index}
                      style={{
                        borderBottom: `1px solid ${
                          currentTheme === "dark" ? "#374151" : "#e5e7eb"
                        }`,
                      }}
                    >
                      <td
                        style={{
                          padding: "1rem",
                          color: currentTheme === "dark" ? "white" : "#111827",
                          fontWeight: "500",
                        }}
                      >
                        {cluster.name}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span
                          style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "9999px",
                            fontSize: "0.875rem",
                            fontWeight: "500",
                            backgroundColor:
                              cluster.labels?.[
                                "feature.open-cluster-management.io/addon-addon-status"
                              ] === "available"
                                ? "#d1fae5"
                                : "#fef3c7",
                            color:
                              cluster.labels?.[
                                "feature.open-cluster-management.io/addon-addon-status"
                              ] === "available"
                                ? "#065f46"
                                : "#92400e",
                          }}
                        >
                          {cluster.labels?.[
                            "feature.open-cluster-management.io/addon-addon-status"
                          ] || "unknown"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "1rem",
                          color:
                            currentTheme === "dark" ? "#d1d5db" : "#6b7280",
                        }}
                      >
                        {cluster.labels?.["location-group"] || "N/A"}
                      </td>
                      <td
                        style={{
                          padding: "1rem",
                          color:
                            currentTheme === "dark" ? "#d1d5db" : "#6b7280",
                        }}
                      >
                        {formatDate(cluster.creationTime)}
                      </td>
                      <td
                        style={{
                          padding: "1rem",
                          color:
                            currentTheme === "dark" ? "#d1d5db" : "#6b7280",
                        }}
                      >
                        {cluster.context}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
